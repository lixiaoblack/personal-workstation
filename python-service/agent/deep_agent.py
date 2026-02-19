"""
Deep Agent 封装模块

基于 LangChain Deep Agents SDK 实现的高级智能体。

Deep Agents 提供的核心能力：
1. Planning (任务规划) - 使用 write_todos 工具分解复杂任务
2. Context Management (上下文管理) - 文件系统工具管理大型上下文
3. Subagent Spawning (子智能体生成) - 隔离上下文执行子任务
4. Long-term Memory (长期记忆) - 跨对话持久化记忆

架构：
┌──────────────────────────────────────────────────────────────┐
│                    Deep Agent Wrapper                         │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Deep Agents SDK (create_deep_agent)        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Planning │ │ File Sys │ │Subagents │ │ Memory   │  │  │
│  │  │(todos)   │ │ (context)│ │(isolate) │ │(persist) │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Custom Tools Layer                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐   │  │
│  │  │  Skills  │ │Knowledge │ │   Memory Service     │   │  │
│  │  │ (自定义)  │ │  (RAG)   │ │   (摘要/记忆)        │   │  │
│  │  └──────────┘ └──────────┘ └──────────────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
"""

import logging
import asyncio
from typing import AsyncIterator, Dict, Any, List, Optional, Callable
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

from .tools import BaseTool, global_tool_registry
from .state import AgentStep, ToolCall

logger = logging.getLogger(__name__)


# ==================== Deep Agent 配置 ====================

DEEP_AGENT_SYSTEM_PROMPT = """你是一个智能助手，具有强大的任务规划和执行能力。

## 核心能力

### 1. 任务规划 (Planning)
- 使用 write_todos 工具将复杂任务分解为可管理的步骤
- 跟踪进度并动态调整计划

### 2. 上下文管理 (Context Management)
- 使用文件系统工具存储和检索大量信息
- 避免上下文窗口溢出

### 3. 子任务委派 (Subagent Spawning)
- 使用 task 工具创建专门的子智能体
- 保持主上下文清洁

## 工作原则

1. **先规划后执行**：收到复杂任务时，先用 write_todos 规划步骤
2. **分解复杂问题**：将大问题分解为小问题逐个解决
3. **利用工具**：善用各种工具提高效率
4. **保持清晰**：在需要时使用文件系统工具存储中间结果

## 注意事项

1. 每次只执行一个步骤
2. 仔细分析工具返回的结果
3. 如果工具调用失败，尝试其他方法
4. 给出最终答案时要完整、清晰
"""


# ==================== 消息发送器接口 ====================

class MessageSender:
    """
    消息发送器接口

    用于在 Agent 执行过程中发送步骤消息到前端。
    """

    def __init__(self, send_callback: Optional[Callable] = None):
        """
        初始化消息发送器

        Args:
            send_callback: 发送消息的回调函数
        """
        self.send_callback = send_callback

    async def send_step(
        self,
        conversation_id: str,
        step_type: str,
        content: str,
        tool_call: Optional[Dict] = None,
        iteration: int = 0
    ):
        """
        发送 Agent 步骤消息

        Args:
            conversation_id: 会话 ID
            step_type: 步骤类型 (thought/tool_call/tool_result/answer)
            content: 步骤内容
            tool_call: 工具调用信息（可选）
            iteration: 迭代次数
        """
        if self.send_callback:
            await self.send_callback({
                "type": "agent_step",
                "conversationId": conversation_id,
                "stepType": step_type,
                "content": content,
                "toolCall": tool_call,
                "iteration": iteration
            })


# ==================== Deep Agent Wrapper ====================

class DeepAgentWrapper:
    """
    Deep Agent 封装类

    封装 Deep Agents SDK，集成自定义工具和消息发送功能。

    使用示例：
        agent = DeepAgentWrapper(model_id=1)

        # 流式执行
        async for step in agent.astream("帮我分析这个问题", conversation_id="123"):
            print(step)
    """

    def __init__(
        self,
        model_id: Optional[int] = None,
        tools: Optional[List[BaseTool]] = None,
        system_prompt: Optional[str] = None,
        message_sender: Optional[MessageSender] = None
    ):
        """
        初始化 Deep Agent

        Args:
            model_id: 模型配置 ID
            tools: 自定义工具列表
            system_prompt: 系统提示词
            message_sender: 消息发送器
        """
        self.model_id = model_id
        self.custom_tools = tools or []
        self.system_prompt = system_prompt or DEEP_AGENT_SYSTEM_PROMPT
        self.message_sender = message_sender

        # 延迟初始化 agent（在第一次使用时创建）
        self._agent = None
        self._model_config = None

    def _get_model_config(self) -> Dict[str, Any]:
        """
        获取模型配置

        Returns:
            模型配置字典
        """
        from model_router import model_router

        if self._model_config is None:
            if self.model_id:
                self._model_config = model_router.get_config(self.model_id)
            else:
                # 获取默认模型（第一个已注册的模型）
                if model_router._models:
                    first_model_id = list(model_router._models.keys())[0]
                    self._model_config = model_router.get_config(first_model_id)

        return self._model_config or {}

    def _build_model_string(self) -> str:
        """
        构建 Deep Agents 模型字符串

        Deep Agents 使用 "provider:model" 格式指定模型。

        Returns:
            模型字符串，如 "openai:gpt-4" 或 "anthropic:claude-3-sonnet"
        """
        config = self._get_model_config()
        if not config:
            return "openai:gpt-4"  # 默认模型

        # ModelConfig 是对象，需要使用属性访问
        provider = ""
        model_id = ""

        if hasattr(config, 'provider'):
            provider = config.provider.value if hasattr(config.provider, 'value') else str(config.provider)
            model_id = config.model_id
        else:
            # 兼容字典格式
            provider = config.get("provider", "")
            model_id = config.get("model_id", "")

        provider = provider.lower() if provider else ""

        # 映射 provider 名称到 Deep Agents 格式
        provider_map = {
            "openai": "openai",
            "anthropic": "anthropic",
            "azure": "azure_openai",
            "google": "google_genai",
            "ollama": "ollama",  # 需要特殊处理
            "bailian": "openai",  # 百炼使用 OpenAI 兼容接口
            "zhipu": "openai",  # 智谱使用 OpenAI 兼容接口
        }

        mapped_provider = provider_map.get(provider, "openai")

        # 对于 Ollama 和其他本地模型，使用 OpenAI 兼容模式
        if provider in ["ollama", "bailian", "zhipu"]:
            # 这些使用 OpenAI 兼容接口，需要特殊处理
            return f"openai:{model_id}"

        return f"{mapped_provider}:{model_id}"

    def _create_agent(self):
        """
        创建 Deep Agent 实例

        使用 Deep Agents SDK 创建智能体。
        """
        try:
            from deepagents import create_deep_agent

            # 转换工具为可调用函数列表（Deep Agents 支持直接传递函数）
            # 根据文档，create_deep_agent 接受 tools 参数，可以是函数列表
            tool_functions = []
            for tool in self.custom_tools:
                # 将工具包装为函数，保留工具名称和描述
                def create_tool_wrapper(t):
                    def tool_wrapper(**kwargs):
                        return t.run(**kwargs)
                    # 设置函数属性，Deep Agents 会自动识别
                    tool_wrapper.__name__ = t.name
                    tool_wrapper.__doc__ = t.description
                    return tool_wrapper
                tool_functions.append(create_tool_wrapper(tool))

            # 获取模型配置
            model_str = self._build_model_string()

            logger.info(f"[DeepAgent] 创建 Agent，模型: {model_str}, 工具数量: {len(tool_functions)}")

            # 创建 Deep Agent
            agent = create_deep_agent(
                model=model_str,
                tools=tool_functions,
                system_prompt=self.system_prompt
            )

            return agent

        except ImportError as e:
            logger.warning(
                f"[DeepAgent] Deep Agents SDK 未安装，降级到 ReAct Agent: {e}")
            return None
        except Exception as e:
            logger.error(f"[DeepAgent] 创建 Agent 失败: {e}")
            return None

    def _ensure_agent(self):
        """确保 Agent 已创建"""
        if self._agent is None:
            self._agent = self._create_agent()

    def run(
        self,
        input_text: str,
        messages: Optional[List] = None,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        同步执行 Agent

        Args:
            input_text: 用户输入
            messages: 历史消息列表
            conversation_id: 会话 ID

        Returns:
            执行结果
        """
        self._ensure_agent()

        if self._agent is None:
            # 降级到普通聊天
            return self._fallback_chat(input_text, messages)

        # 构建消息
        if messages is None:
            messages = [HumanMessage(content=input_text)]

        # 转换消息格式
        formatted_messages = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                formatted_messages.append(
                    {"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                formatted_messages.append(
                    {"role": "assistant", "content": msg.content})
            else:
                formatted_messages.append(
                    {"role": "user", "content": str(msg.content)})

        try:
            # 执行 Agent
            result = self._agent.invoke({"messages": formatted_messages})

            # 提取最终响应
            final_message = result.get(
                "messages", [])[-1] if result.get("messages") else None

            return {
                "output": final_message.content if final_message else "",
                "steps": self._extract_steps(result),
                "raw_result": result
            }

        except Exception as e:
            logger.error(f"[DeepAgent] 执行失败: {e}")
            return {
                "output": f"执行出错: {str(e)}",
                "error": str(e)
            }

    async def astream(
        self,
        input_text: str,
        messages: Optional[List] = None,
        conversation_id: Optional[str] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        流式执行 Agent

        每执行一个步骤，返回状态更新。

        Args:
            input_text: 用户输入
            messages: 历史消息列表
            conversation_id: 会话 ID

        Yields:
            状态更新字典
        """
        self._ensure_agent()

        if self._agent is None:
            # 降级到普通流式聊天
            async for chunk in self._fallback_stream(input_text, messages):
                yield chunk
            return

        # 构建消息
        if messages is None:
            messages = [HumanMessage(content=input_text)]

        # 转换消息格式
        formatted_messages = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                formatted_messages.append(
                    {"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                formatted_messages.append(
                    {"role": "assistant", "content": msg.content})
            else:
                formatted_messages.append(
                    {"role": "user", "content": str(msg.content)})

        try:
            iteration = 0

            # 流式执行 Agent
            async for event in self._agent.astream({"messages": formatted_messages}):
                iteration += 1

                for node_name, state_update in event.items():
                    # 解析步骤类型
                    step_type = self._parse_step_type(node_name, state_update)
                    content = self._extract_content(state_update)

                    step_data = {
                        "node": node_name,
                        "step_type": step_type,
                        "content": content,
                        "iteration": iteration,
                        "update": state_update
                    }

                    # 发送步骤消息
                    if self.message_sender and conversation_id:
                        await self.message_sender.send_step(
                            conversation_id=conversation_id,
                            step_type=step_type,
                            content=content,
                            iteration=iteration
                        )

                    yield step_data

        except Exception as e:
            logger.error(f"[DeepAgent] 流式执行失败: {e}")
            yield {
                "error": str(e),
                "step_type": "error",
                "content": f"执行出错: {str(e)}"
            }

    def _fallback_chat(
        self,
        input_text: str,
        messages: Optional[List] = None
    ) -> Dict[str, Any]:
        """
        降级聊天方法

        当 Deep Agent 不可用时，使用普通聊天。

        Args:
            input_text: 用户输入
            messages: 历史消息

        Returns:
            聊天结果
        """
        from model_router import model_router

        # 构建消息
        formatted_messages = []
        if messages:
            for msg in messages:
                if isinstance(msg, HumanMessage):
                    formatted_messages.append(
                        {"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    formatted_messages.append(
                        {"role": "assistant", "content": msg.content})

        formatted_messages.append({"role": "user", "content": input_text})

        try:
            response = model_router.chat(
                messages=formatted_messages,
                model_id=self.model_id,
                stream=False
            )

            return {
                "output": response,
                "steps": [AgentStep(
                    type="answer",
                    content=response,
                    tool_call=None
                )]
            }

        except Exception as e:
            logger.error(f"[DeepAgent] 降级聊天失败: {e}")
            return {
                "output": f"聊天出错: {str(e)}",
                "error": str(e)
            }

    async def _fallback_stream(
        self,
        input_text: str,
        messages: Optional[List] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        降级流式聊天方法

        当 Deep Agent 不可用时，使用普通流式聊天。

        Args:
            input_text: 用户输入
            messages: 历史消息

        Yields:
            流式内容块
        """
        from model_router import model_router

        # 构建消息
        formatted_messages = []
        if messages:
            for msg in messages:
                if isinstance(msg, HumanMessage):
                    formatted_messages.append(
                        {"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    formatted_messages.append(
                        {"role": "assistant", "content": msg.content})

        formatted_messages.append({"role": "user", "content": input_text})

        try:
            full_content = ""

            async for chunk in model_router.chat_stream_async(
                messages=formatted_messages,
                model_id=self.model_id
            ):
                full_content += chunk

                yield {
                    "step_type": "stream_chunk",
                    "content": chunk,
                    "full_content": full_content
                }

            # 最终答案
            yield {
                "step_type": "answer",
                "content": full_content
            }

        except Exception as e:
            logger.error(f"[DeepAgent] 降级流式聊天失败: {e}")
            yield {
                "error": str(e),
                "step_type": "error",
                "content": f"聊天出错: {str(e)}"
            }

    def _parse_step_type(self, node_name: str, state_update: Dict) -> str:
        """
        解析步骤类型

        Args:
            node_name: 节点名称
            state_update: 状态更新

        Returns:
            步骤类型字符串
        """
        if "tool" in node_name.lower():
            return "tool_call"
        elif "agent" in node_name.lower():
            return "thought"
        elif "answer" in node_name.lower() or "final" in node_name.lower():
            return "answer"
        else:
            return "thought"

    def _extract_content(self, state_update: Dict) -> str:
        """
        提取内容

        Args:
            state_update: 状态更新

        Returns:
            内容字符串
        """
        messages = state_update.get("messages", [])
        if messages:
            last_msg = messages[-1]
            if hasattr(last_msg, "content"):
                return last_msg.content
            elif isinstance(last_msg, dict):
                return last_msg.get("content", "")

        return str(state_update)

    def _extract_steps(self, result: Dict) -> List[AgentStep]:
        """
        从执行结果中提取步骤列表

        Args:
            result: Agent 执行结果

        Returns:
            步骤列表
        """
        steps = []

        messages = result.get("messages", [])
        for msg in messages:
            content = msg.content if hasattr(msg, "content") else str(msg)
            msg_type = msg.type if hasattr(msg, "type") else "unknown"

            step_type = "thought"
            if msg_type == "ai":
                step_type = "answer"
            elif msg_type == "tool":
                step_type = "tool_result"

            steps.append(AgentStep(
                type=step_type,
                content=content,
                tool_call=None
            ))

        return steps


# ==================== 工厂函数 ====================

def create_deep_agent(
    model_id: Optional[int] = None,
    tools: Optional[List[BaseTool]] = None,
    system_prompt: Optional[str] = None,
    message_sender: Optional[MessageSender] = None
) -> DeepAgentWrapper:
    """
    创建 Deep Agent 实例

    Args:
        model_id: 模型配置 ID
        tools: 自定义工具列表
        system_prompt: 系统提示词
        message_sender: 消息发送器

    Returns:
        DeepAgentWrapper 实例
    """
    return DeepAgentWrapper(
        model_id=model_id,
        tools=tools,
        system_prompt=system_prompt,
        message_sender=message_sender
    )
