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

## ⚠️ 重要：工具调用判断原则

在决定是否调用工具之前，请先判断：

### 不需要调用工具的情况（直接回答）
1. **日常问候**：如"你好"、"早上好"、"谢谢"等
2. **常识问题**：如"1+1等于几"、"天空是什么颜色"
3. **创意写作**：如"写一首诗"、"帮我写个故事"
4. **翻译润色**：如"翻译这段话"、"帮我润色文章"
5. **代码解释**：如"解释这段代码的作用"
6. **简单计算**：如"计算100的平方根"
7. **聊天闲谈**：与用户进行的普通对话

### 需要调用工具的情况
1. **知识库查询**：涉及已上传的文档、项目资料、技术文档
2. **网络搜索**：需要获取最新信息、实时数据
3. **系统操作**：创建、删除、修改数据
4. **复杂分析**：需要多步骤推理或多数据源整合

**判断流程**：
1. 先分析用户问题属于哪种类型
2. 如果是"不需要工具"的类型，直接回答，不要调用任何工具
3. 如果是"需要工具"的类型，再选择合适的工具执行

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

1. **简单问题直接回答**：不需要工具的问题，直接给出清晰、友好的回答
2. **复杂问题先规划**：收到复杂任务时，先规划步骤再执行
3. **善用工具**：真正需要时才调用工具，避免过度使用
4. **保持清晰**：给出最终答案时要完整、清晰

## 注意事项

1. 不要对所有问题都调用工具，简单问题直接回答效率更高
2. 仔细分析工具返回的结果
3. 如果工具调用失败，尝试其他方法或直接回答
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
            import time
            # 过滤掉 None 或空内容，避免前端显示 "None"
            safe_content = content if content and content != "None" else ""
            await self.send_callback({
                "type": "agent_step",
                "id": f"agent_step_{int(time.time() * 1000)}_{iteration}",
                "conversationId": conversation_id,
                "stepType": step_type,
                "content": safe_content,
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
                    self._model_config = model_router.get_config(
                        first_model_id)

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
            provider = config.provider.value if hasattr(
                config.provider, 'value') else str(config.provider)
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

    def _create_chat_model(self):
        """
        创建 LangChain ChatModel 实例

        根据 Deep Agents SDK 文档，使用 init_chat_model 创建模型，
        支持自定义 API base URL 等配置。

        Returns:
            LangChain ChatModel 实例
        """
        from langchain.chat_models import init_chat_model

        config = self._get_model_config()
        if not config:
            # 默认使用 OpenAI
            return init_chat_model("gpt-4")

        # 提取配置
        if hasattr(config, 'provider'):
            provider = config.provider.value if hasattr(
                config.provider, 'value') else str(config.provider)
            model_id = config.model_id
            api_key = config.api_key
            api_base_url = config.api_base_url
            temperature = config.temperature
            max_tokens = config.max_tokens
        else:
            # 兼容字典格式
            provider = config.get("provider", "openai")
            model_id = config.get("model_id", "gpt-4")
            api_key = config.get("api_key")
            api_base_url = config.get("api_base_url")
            temperature = config.get("temperature", 0.7)
            max_tokens = config.get("max_tokens", 4096)

        provider = provider.lower() if provider else "openai"

        # 构建模型 kwargs
        model_kwargs = {"temperature": temperature}
        if max_tokens:
            model_kwargs["max_tokens"] = max_tokens

        # 对于 OpenAI 兼容接口（百炼、智谱、Ollama 等），使用 openai provider
        # 并传递自定义 base_url
        if provider in ["ollama", "bailian", "zhipu"]:
            # 这些使用 OpenAI 兼容接口
            if api_key:
                model_kwargs["api_key"] = api_key
            if api_base_url:
                model_kwargs["base_url"] = api_base_url

            logger.info(
                f"[DeepAgent] 创建 ChatModel, provider=openai (兼容), model={model_id}, base_url={api_base_url}")

            return init_chat_model(
                model_id,
                model_provider="openai",
                **model_kwargs
            )

        # 其他 provider
        if api_key:
            model_kwargs["api_key"] = api_key
        if api_base_url and provider == "openai":
            model_kwargs["base_url"] = api_base_url

        # 映射 provider 名称
        provider_map = {
            "openai": "openai",
            "anthropic": "anthropic",
            "azure": "azure_openai",
            "google": "google_genai",
        }
        mapped_provider = provider_map.get(provider, provider)

        logger.info(
            f"[DeepAgent] 创建 ChatModel, provider={mapped_provider}, model={model_id}")

        return init_chat_model(
            model_id,
            model_provider=mapped_provider,
            **model_kwargs
        )

    def _create_agent(self):
        """
        创建 Deep Agent 实例

        使用 Deep Agents SDK 创建智能体。
        """
        try:
            from deepagents import create_deep_agent
            from langchain_core.tools import StructuredTool

            # 转换工具为 LangChain StructuredTool 列表
            # 使用 StructuredTool 确保参数 schema 正确传递给 LLM
            langchain_tools = []
            for tool in self.custom_tools:
                # 将 BaseTool 转换为 LangChain StructuredTool
                lc_tool = self._convert_to_langchain_tool(tool)
                if lc_tool:
                    langchain_tools.append(lc_tool)

            # 创建 ChatModel 实例（而非字符串），支持自定义 API 配置
            chat_model = self._create_chat_model()

            logger.info(
                f"[DeepAgent] 创建 Agent，模型类型: {type(chat_model).__name__}, 工具数量: {len(langchain_tools)}")

            # 创建 Deep Agent
            agent = create_deep_agent(
                model=chat_model,  # 传递 ChatModel 实例而非字符串
                tools=langchain_tools,
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

    def _convert_to_langchain_tool(self, tool: "BaseTool"):
        """
        将 BaseTool 转换为 LangChain StructuredTool

        确保参数 schema 正确传递给 LLM，让 LLM 知道如何调用工具。
        """
        from langchain_core.tools import StructuredTool
        import asyncio

        tool_name = tool.name
        tool_description = tool.description
        args_schema = tool.args_schema

        # 创建异步包装函数
        async def async_tool_wrapper(**kwargs):
            logger.info(f"[DeepAgent] 异步调用工具: {tool_name}, 参数: {kwargs}")

            try:
                # 如果工具有异步执行方法，使用异步方法
                # FrontendBridgeTool 使用 _call_async
                if hasattr(tool, '_call_async'):
                    logger.info(f"[DeepAgent] 使用 _call_async: {tool_name}")
                    result = await tool._call_async(**kwargs)
                    logger.info(f"[DeepAgent] 工具完成: {tool_name}")
                    return result
                # KnowledgeListTool 使用 _list_via_bridge
                elif hasattr(tool, '_list_via_bridge'):
                    logger.info(
                        f"[DeepAgent] 使用 _list_via_bridge: {tool_name}")
                    result = await tool._list_via_bridge()
                    # 格式化结果
                    if not result:
                        return "当前没有可用的知识库。请先创建知识库并上传文档。"
                    lines = ["可用的知识库：\n"]
                    for kb in result:
                        name = kb.get('name', '未命名')
                        kb_id = kb.get('id', '未知')
                        doc_count = kb.get('documentCount', 0)
                        desc = kb.get('description', '')
                        lines.append(f"- {name} (ID: {kb_id})")
                        lines.append(f"  文档数: {doc_count}")
                        if desc:
                            lines.append(f"  描述: {desc}")
                    logger.info(f"[DeepAgent] 工具完成: {tool_name}")
                    return "\n".join(lines)
                # FrontendBridgeListTool 使用 _list_async
                elif hasattr(tool, '_list_async'):
                    logger.info(f"[DeepAgent] 使用 _list_async: {tool_name}")
                    result = await tool._list_async(kwargs.get('service'))
                    logger.info(f"[DeepAgent] 工具完成: {tool_name}")
                    return result
                # KnowledgeCreateTool 等使用 _create_via_bridge
                elif hasattr(tool, '_create_via_bridge'):
                    logger.info(
                        f"[DeepAgent] 使用 _create_via_bridge: {tool_name}")
                    result = await tool._create_via_bridge(**kwargs)
                    if result.get("success"):
                        kb = result.get("knowledge", {})
                        logger.info(f"[DeepAgent] 工具完成: {tool_name}")
                        return (
                            f"知识库创建成功！\n"
                            f"名称: {kb.get('name')}\n"
                            f"ID: {kb.get('id')}\n"
                            f"嵌入模型: {kb.get('embeddingModelName')}\n"
                            f"现在可以使用 web_crawl 工具添加内容。"
                        )
                    logger.info(f"[DeepAgent] 工具完成(失败): {tool_name}")
                    return f"创建失败: {result.get('error', '未知错误')}"
                else:
                    # 同步工具直接运行
                    logger.info(f"[DeepAgent] 使用同步 run: {tool_name}")
                    result = tool.run(**kwargs)
                    logger.info(f"[DeepAgent] 工具完成: {tool_name}")
                    return result

            except Exception as e:
                error_msg = f"工具 {tool_name} 执行失败: {str(e)}"
                logger.error(error_msg)
                return error_msg

        # 使用 StructuredTool.from_function 创建工具
        # 这确保参数 schema 正确传递给 LLM
        return StructuredTool.from_function(
            coroutine=async_tool_wrapper,  # 异步函数
            name=tool_name,
            description=tool_description,
            args_schema=args_schema,  # 传递参数 schema
        )

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

        Note:
            当 Deep Agents SDK 未安装时，不会自动降级到普通 LLM 聊天，
            而是抛出 ImportError，让调用者决定如何降级。
        """
        self._ensure_agent()

        if self._agent is None:
            # Deep Agent 不可用，抛出异常让调用者处理降级
            raise ImportError("Deep Agents SDK 未安装，请降级到 ReAct Agent")

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

        Note:
            当 Deep Agents SDK 未安装时，不会自动降级到普通 LLM 聊天，
            而是抛出 ImportError，让调用者决定如何降级。
        """
        self._ensure_agent()

        if self._agent is None:
            # Deep Agent 不可用，抛出异常让调用者处理降级
            raise ImportError("Deep Agents SDK 未安装，请降级到 ReAct Agent")

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

                # 处理不同类型的 event
                # LangGraph 可能返回 dict 或 Command 对象（如 Overwrite）
                if isinstance(event, dict):
                    items = event.items()
                elif hasattr(event, 'items'):
                    items = event.items()
                else:
                    # 单个 Command 对象，直接处理
                    logger.debug(
                        f"[DeepAgent] Event type: {type(event).__name__}")
                    step_data = {
                        "node": "agent",
                        "step_type": "thought",
                        "content": self._extract_content(event),
                        "iteration": iteration,
                        "update": event
                    }
                    yield step_data
                    continue

                for node_name, state_update in items:
                    # 调试日志：打印原始事件数据
                    logger.debug(
                        f"[DeepAgent] Event: node={node_name}, update_type={type(state_update).__name__}")

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
            import traceback
            logger.error(f"[DeepAgent] 流式执行失败: {e}")
            logger.error(f"[DeepAgent] Traceback:\n{traceback.format_exc()}")
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

    def _parse_step_type(self, node_name: str, state_update) -> str:
        """
        解析步骤类型

        Args:
            node_name: 节点名称
            state_update: 状态更新（可能是 dict 或 LangGraph 的 Command 对象）

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

    def _extract_content(self, state_update) -> str:
        """
        提取内容

        Args:
            state_update: 状态更新（可能是 dict、list 或 LangGraph 的 Command 对象）

        Returns:
            内容字符串（保证非 None）
        """
        content = None

        # 处理 LangGraph 的 Command 对象（如 Overwrite）
        if hasattr(state_update, '__class__') and state_update.__class__.__name__ in ['Overwrite', 'Command']:
            # Overwrite 对象有 value 属性
            try:
                if hasattr(state_update, 'value'):
                    value = state_update.value
                    if isinstance(value, list) and value:
                        last_item = value[-1]
                        if hasattr(last_item, 'content'):
                            content = last_item.content
                        elif isinstance(last_item, dict):
                            content = last_item.get("content")
                    elif hasattr(value, 'content'):
                        content = value.content
                if content:
                    return str(content) if content is not None else ""
                return f"[{state_update.__class__.__name__}]"
            except Exception as e:
                logger.debug(f"[DeepAgent] 处理 Overwrite 对象失败: {e}")
                return f"[Overwrite: {str(e)}]"

        # 处理字典类型
        if isinstance(state_update, dict):
            messages = state_update.get("messages", [])
            # messages 可能是 Overwrite 对象
            if messages and hasattr(messages, '__class__') and messages.__class__.__name__ == 'Overwrite':
                return self._extract_content(messages)  # 递归处理

            if messages:
                last_msg = messages[-1] if isinstance(
                    messages, list) else messages
                if hasattr(last_msg, "content"):
                    content = last_msg.content
                elif isinstance(last_msg, dict):
                    content = last_msg.get("content")

        # 处理列表类型
        if isinstance(state_update, list):
            if state_update:
                last_item = state_update[-1]
                if hasattr(last_item, "content"):
                    content = last_item.content
                elif isinstance(last_item, dict):
                    content = last_item.get("content")

        # 确保返回非 None 字符串
        if content is None:
            return ""
        return str(content) if content else ""

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
