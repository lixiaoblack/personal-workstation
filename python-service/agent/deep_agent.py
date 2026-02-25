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
import os
from typing import AsyncIterator, Dict, Any, List, Optional, Callable
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

from .tools import BaseTool, global_tool_registry
from .state import AgentStep, ToolCall

logger = logging.getLogger(__name__)


# ==================== Deep Agent 配置 ====================

DEEP_AGENT_SYSTEM_PROMPT = """你是一个智能助手，具有强大的任务规划和执行能力。

## ⚠️ 最高优先级：知识库检索结果使用规则

当用户消息中包含 `[知识库检索结果]` 块时，**必须**直接基于该内容回答问题：
1. **禁止**调用 web_search、knowledge_search 等工具
2. **禁止**说"让我搜索一下"或"我来查询一下"
3. 知识库检索结果已经在消息中，直接使用即可
4. 如果知识库内容不足以回答，可以用你的知识补充，并标注"（根据我的知识补充）"

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
8. **消息中已有知识库检索结果**：直接使用，不要再调用工具

### 🔴 必须调用工具的情况

**文件分析（使用 file_read）** - 最高优先级：
- 用户上传了文件并询问文件内容
- 用户问"这个文档讲了什么"、"文件内容是什么"
- 当用户消息中包含"[重要：用户上传了以下文件]"时
- **必须先调用 file_read 工具读取文件内容！**
- 调用格式：file_read(file_path="文件路径")

**知识库查询（使用 knowledge_search 或 knowledge_list）** - 仅当消息中没有知识库检索结果时：
- 用户询问账号、密码、配置、服务器信息等存储的资料
- 用户问"我的xxx是什么"、"xxx在哪里"
- 涉及用户上传的文档、项目资料、技术文档
- **注意**：如果消息中已有 `[知识库检索结果]`，不要再调用此工具

**其他工具调用**：
- 网络搜索：需要获取最新信息、实时数据（且消息中没有知识库检索结果）
- 系统操作：创建、删除、修改数据
- 复杂分析：需要多步骤推理或多数据源整合

**判断流程**：
1. 检查消息中是否已有 `[知识库检索结果]`，如果有则直接使用
2. 检查用户是否上传了文件（消息中包含文件路径）
3. 如果有文件，**必须先调用 file_read 读取文件内容**
4. 如果没有文件但涉及用户存储的信息，调用 knowledge_search 检索知识库
5. 如果是日常问候或常识问题，直接回答
6. 根据工具结果回答用户问题

## 🎯 输出格式要求（非常重要）

**最终回答必须满足**：
- 直接回答用户的问题，不要有任何前缀或说明
- 不要写"根据检索结果"、"根据知识库"等开场白
- 不要描述你查看了什么文档或调用了什么工具
- 不要包含技术细节（知识库ID、文件名、相关度分数等）
- 用自然、流畅的语言直接给出答案

**错误示例**：
根据检索结果，这个知识库主要包含以下内容：
1. Skills 是...

**正确示例**：
这个知识库介绍了 Claude 的 Skills 系统。Skills 是包含指令、脚本和资源的文件夹，Claude 可以动态加载来提升特定任务的表现。

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

1. **知识库检索结果优先**：消息中有知识库检索结果时，直接使用，不要再调用工具
2. **文件分析次优先**：用户上传文件时，必须先读取文件内容
3. **简单问题直接回答**：日常问候和常识问题，直接给出清晰、友好的回答
4. **复杂问题先规划**：收到复杂任务时，先规划步骤再执行
5. **善用工具**：真正需要时才调用工具，避免过度使用
6. **保持清晰**：给出最终答案时要完整、清晰

## 注意事项

1. 不要对所有问题都调用工具，简单问候直接回答
2. **消息中已有知识库检索结果时，禁止再调用 web_search 等工具**
3. **但用户上传文件时必须先调用 file_read 读取文件**
4. 仔细分析工具返回的结果
5. 如果工具调用失败，尝试其他方法或直接回答
6. 最终回答要简洁，不要输出工具调用的原始内容
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

    # 类级别的附件路径映射（用于修正 file_read 工具的路径）
    _attachment_paths: Dict[str, str] = {}

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

    @classmethod
    def set_attachment_paths(cls, paths: Dict[str, str]):
        """
        设置附件路径映射

        Args:
            paths: 文件名 -> 文件路径 的映射字典
        """
        cls._attachment_paths = paths
        logger.info(f"[DeepAgent] 设置附件路径映射: {paths}")

    @classmethod
    def get_correct_file_path(cls, provided_path: str) -> str:
        """
        获取正确的文件路径

        如果提供的路径不在附件映射中，尝试查找匹配的路径。
        如果完全找不到匹配，则使用第一个附件的路径（兜底策略）。

        Args:
            provided_path: LLM 提供的文件路径

        Returns:
            正确的文件路径
        """
        if not cls._attachment_paths:
            return provided_path

        # 如果路径直接匹配
        if provided_path in cls._attachment_paths.values():
            return provided_path

        # 如果路径在映射中（key 是文件名）
        if provided_path in cls._attachment_paths:
            return cls._attachment_paths[provided_path]

        # 尝试通过文件名匹配
        provided_name = os.path.basename(provided_path)
        for name, path in cls._attachment_paths.items():
            if name == provided_name or os.path.basename(path) == provided_name:
                logger.info(f"[DeepAgent] 路径修正: {provided_path} -> {path}")
                return path

        # 兜底策略：LLM 编造的路径完全不对时，使用第一个附件的路径
        first_path = list(cls._attachment_paths.values())[
            0] if cls._attachment_paths else provided_path
        if first_path != provided_path:
            logger.info(
                f"[DeepAgent] 路径兜底修正（LLM编造路径）: {provided_path} -> {first_path}")
            return first_path

        return provided_path

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
            # 如果是 file_read 工具，修正文件路径
            if tool_name == "file_read" and "file_path" in kwargs:
                original_path = kwargs["file_path"]
                corrected_path = DeepAgentWrapper.get_correct_file_path(
                    original_path)
                if corrected_path != original_path:
                    logger.info(
                        f"[DeepAgent] 文件路径修正: {original_path} -> {corrected_path}")
                    kwargs["file_path"] = corrected_path

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
            # 快速通道：跟踪是否检测到真正的工具调用
            has_real_tool_call = False

            # 追踪历史消息数量，用于区分新旧消息
            # formatted_messages 包含历史消息 + 新用户问题
            # 历史消息数量 = 总数 - 1（新用户问题）
            history_message_count = len(
                formatted_messages) - 1 if formatted_messages else 0
            # 追踪已处理的消息数量
            processed_message_count = history_message_count

            logger.info(
                f"[DeepAgent] 开始流式执行，history_message_count={history_message_count}, formatted_messages={len(formatted_messages)}")

            # 流式执行 Agent
            async for event in self._agent.astream({"messages": formatted_messages}):
                iteration += 1
                logger.info(
                    f"[DeepAgent] Event #{iteration}: type={type(event).__name__}")

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
                    content = self._extract_content_with_history(
                        event, processed_message_count)
                    # 快速通道：如果没有工具调用，直接输出内容
                    if not has_real_tool_call:
                        yield {
                            "node": "agent",
                            "step_type": "stream_chunk",
                            "content": content,
                            "iteration": iteration,
                            "update": event
                        }
                        continue
                    step_data = {
                        "node": "agent",
                        "step_type": "thought",
                        "content": content,
                        "iteration": iteration,
                        "update": event
                    }
                    yield step_data
                    continue

                for node_name, state_update in items:
                    # 调试日志：打印原始事件数据
                    logger.info(
                        f"[DeepAgent] Event: node={node_name}, update_type={type(state_update).__name__}")

                    # 检测是否有真正的工具调用
                    tool_call_info = self._extract_tool_call(state_update)
                    if tool_call_info:
                        has_real_tool_call = True
                        logger.info(f"[DeepAgent] 检测到工具调用: {tool_call_info}")

                    # 使用带历史追踪的内容提取
                    # 注意：初始用户消息已经包含在 formatted_messages 中
                    # 所以不需要再次跳过，使用原始的 history_message_count
                    content, new_msg_count = self._extract_content_with_history_count(
                        state_update, history_message_count)

                    logger.info(
                        f"[DeepAgent] 提取内容: content_len={len(content) if content else 0}, new_msg_count={new_msg_count}, history_message_count={history_message_count}")

                    # 不要更新 history_message_count，它应该保持不变

                    # 快速通道逻辑：
                    # - 如果没有真正的工具调用，不发送 thought/tool_call 步骤
                    # - 直接发送流式内容
                    if not has_real_tool_call:
                        # 没有工具调用，直接流式输出
                        if content:
                            yield {
                                "node": node_name,
                                "step_type": "stream_chunk",
                                "content": content,
                                "iteration": iteration,
                                "update": state_update
                            }
                        continue

                    # 有工具调用，发送详细的思考步骤
                    # 根据是否有工具调用信息决定 step_type
                    if tool_call_info:
                        step_type = "tool_call"
                    else:
                        # 检查是否是工具结果（ToolMessage）
                        logger.info(
                            f"[DeepAgent] node={node_name}, 尝试提取 tool_result")
                        tool_result = self._extract_tool_result(
                            state_update, history_message_count)
                        logger.info(f"[DeepAgent] tool_result={tool_result}")
                        if tool_result:
                            # 发送 tool_result 步骤
                            result_step = {
                                "node": node_name,
                                "step_type": "tool_result",
                                "content": tool_result.get("content", ""),
                                "iteration": iteration,
                                "update": state_update,
                                "tool_call": {
                                    "name": tool_result.get("name", "unknown"),
                                    "arguments": {},
                                    "result": tool_result.get("content", "")
                                }
                            }
                            if self.message_sender and conversation_id:
                                await self.message_sender.send_step(
                                    conversation_id=conversation_id,
                                    step_type="tool_result",
                                    content=tool_result.get("content", ""),
                                    tool_call=result_step["tool_call"],
                                    iteration=iteration
                                )
                            yield result_step
                            continue

                        # 已经有工具调用，但没有新的工具调用
                        # 说明是工具执行后的最终答案，作为流式内容发送
                        # 不在思考过程中显示，避免重复
                        if content:
                            yield {
                                "node": node_name,
                                "step_type": "stream_chunk",
                                "content": content,
                                "iteration": iteration,
                                "update": state_update
                            }
                        continue

                    step_data = {
                        "node": node_name,
                        "step_type": step_type,
                        "content": content,
                        "iteration": iteration,
                        "update": state_update,
                        "tool_call": tool_call_info  # 包含工具调用信息
                    }

                    # 发送步骤消息
                    if self.message_sender and conversation_id:
                        await self.message_sender.send_step(
                            conversation_id=conversation_id,
                            step_type=step_type,
                            content=content,
                            tool_call=tool_call_info,  # 传递工具调用信息
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
        提取内容（兼容旧接口）

        注意：推荐使用 _extract_content_with_history_count 方法，
        该方法可以正确区分历史消息和新消息。
        """
        return self._extract_content_with_history(state_update, 0)

    def _extract_content_with_history(self, state_update, history_count: int) -> str:
        """
        提取内容，考虑历史消息数量

        Args:
            state_update: 状态更新
            history_count: 历史消息数量（只提取此数量之后的消息）

        Returns:
            内容字符串
        """
        content, _ = self._extract_content_with_history_count(
            state_update, history_count)
        return content

    def _extract_content_with_history_count(self, state_update, history_count: int) -> tuple:
        """
        提取内容并返回消息数量，考虑历史消息数量

        注意：LangGraph 每个事件返回的消息列表是独立的，不是累积的。
        history_count 主要用于有历史对话的场景，跳过历史消息。

        Args:
            state_update: 状态更新（可能是 dict、list 或 LangGraph 的 Command 对象）
            history_count: 历史消息数量（只提取此数量之后的消息）

        Returns:
            (内容字符串, 当前消息数量) 元组
        """
        content = None
        current_count = history_count

        # 处理 LangGraph 的 Command 对象（如 Overwrite）
        if hasattr(state_update, '__class__') and state_update.__class__.__name__ in ['Overwrite', 'Command']:
            try:
                if hasattr(state_update, 'value'):
                    value = state_update.value
                    if isinstance(value, list) and value:
                        current_count = len(value)
                        # 如果消息数量大于 history_count，说明有新消息
                        if current_count > history_count:
                            content = self._find_new_ai_content(
                                value, history_count)
                    elif hasattr(value, 'content'):
                        if self._is_ai_message(value):
                            content = value.content
                            current_count = history_count + 1
                return (str(content) if content else "", current_count)
            except Exception as e:
                logger.debug(f"[DeepAgent] 处理 Overwrite 对象失败: {e}")
                return ("", current_count)

        # 处理字典类型
        if isinstance(state_update, dict):
            messages = state_update.get("messages", [])
            # messages 可能是 Overwrite 对象
            if messages and hasattr(messages, '__class__') and messages.__class__.__name__ == 'Overwrite':
                return self._extract_content_with_history_count(messages, history_count)

            if messages and isinstance(messages, list):
                current_count = len(messages)
                # 如果消息数量大于 history_count，说明有新消息
                if current_count > history_count:
                    content = self._find_new_ai_content(
                        messages, history_count)
                else:
                    # 消息数量没有增加，可能是新事件，直接找 AI 消息
                    content = self._find_ai_content_simple(messages)

        # 处理列表类型
        if isinstance(state_update, list):
            current_count = len(state_update)
            if current_count > history_count:
                content = self._find_new_ai_content(
                    state_update, history_count)
            else:
                content = self._find_ai_content_simple(state_update)

        return (str(content) if content else "", current_count)

    def _find_ai_content_simple(self, messages: list) -> Optional[str]:
        """
        简单地从消息列表中提取最后一个 AI 消息的内容

        用于处理消息数量没有增加的情况（新事件）。

        Args:
            messages: 消息列表

        Returns:
            内容字符串或 None
        """
        if not messages:
            return None

        # 从后往前找第一个 AI 消息
        for msg in reversed(messages):
            if self._is_ai_message(msg):
                msg_content = None
                if hasattr(msg, 'content'):
                    msg_content = msg.content
                elif isinstance(msg, dict):
                    msg_content = msg.get("content")

                if msg_content:
                    return str(msg_content)

        return None

    def _find_new_ai_content(self, messages: list, history_count: int) -> Optional[str]:
        """
        从新消息中提取 AI 消息内容

        只查找 history_count 之后的消息，避免返回历史消息内容。

        Args:
            messages: 消息列表
            history_count: 历史消息数量

        Returns:
            内容字符串或 None
        """
        if not messages:
            logger.info(f"[DeepAgent] _find_new_ai_content: messages 为空")
            return None

        # 只看新消息部分（从 history_count 开始）
        new_messages = messages[history_count:]

        logger.info(
            f"[DeepAgent] _find_new_ai_content: total_msgs={len(messages)}, history_count={history_count}, new_msgs={len(new_messages)}")

        if not new_messages:
            logger.info(f"[DeepAgent] _find_new_ai_content: new_messages 为空")
            return None

        # 从新消息中找最后一个 AI 消息
        for msg in reversed(new_messages):
            msg_type = getattr(msg, 'type', None) if hasattr(
                msg, 'type') else None
            msg_class = msg.__class__.__name__ if hasattr(
                msg, '__class__') else 'unknown'
            is_ai = self._is_ai_message(msg)
            logger.info(
                f"[DeepAgent] _find_new_ai_content: msg_type={msg_type}, class={msg_class}, is_ai={is_ai}")

            if is_ai:
                msg_content = None
                if hasattr(msg, 'content'):
                    msg_content = msg.content
                elif isinstance(msg, dict):
                    msg_content = msg.get("content")

                if msg_content:
                    # 如果有工具调用，返回这个内容（工具调用的思考）
                    # 如果没有工具调用，也返回内容（最终答案）
                    logger.info(
                        f"[DeepAgent] _find_new_ai_content: 找到 AI 消息，content_len={len(str(msg_content))}")
                    return str(msg_content)

        logger.info(f"[DeepAgent] _find_new_ai_content: 没有找到 AI 消息")
        return None

    def _has_tool_calls(self, message) -> bool:
        """
        检查消息是否有工具调用

        Args:
            message: LangChain 消息对象

        Returns:
            是否有工具调用
        """
        # 检查 tool_calls 属性
        if hasattr(message, 'tool_calls') and message.tool_calls:
            return True
        # 检查 additional_kwargs 中的 tool_calls
        if hasattr(message, 'additional_kwargs'):
            tool_calls = message.additional_kwargs.get('tool_calls', [])
            if tool_calls:
                return True
        return False

    def _is_ai_message(self, message) -> bool:
        """
        检查消息是否是 AI 消息（需要流式输出给用户的消息）

        注意：ToolMessage 是工具返回结果，不应该作为流式内容输出给用户。
        工具结果应该通过 tool_result 步骤发送到思考过程。

        Args:
            message: LangChain 消息对象

        Returns:
            是否是 AI 消息
        """
        # 检查消息类型
        if hasattr(message, 'type'):
            # type 为 'human' 表示用户消息，跳过
            if message.type == 'human':
                return False
            # type 为 'tool' 表示工具消息，不应该流式输出
            if message.type == 'tool':
                return False
            # type 为 'ai' 表示 AI 消息
            if message.type == 'ai':
                return True

        # 检查类名
        if hasattr(message, '__class__'):
            class_name = message.__class__.__name__
            # HumanMessage 是用户消息，跳过
            if class_name == 'HumanMessage':
                return False
            # ToolMessage 是工具返回结果，不应该流式输出给用户
            if class_name == 'ToolMessage':
                return False
            # AIMessage 是 AI 消息，需要流式输出
            if class_name == 'AIMessage':
                return True

        # 字典类型检查 role
        if isinstance(message, dict):
            role = message.get('role', '')
            if role == 'user':
                return False
            # tool 角色是工具消息，不应该流式输出
            if role == 'tool':
                return False
            if role in ['assistant', 'ai']:
                return True

        # 默认情况，无法判断，保守处理返回 False
        return False

    def _extract_tool_call(self, state_update) -> Optional[Dict]:
        """
        提取工具调用信息

        检测 LLM 是否真正调用了工具。

        Args:
            state_update: 状态更新（可能是 dict、list 或 LangGraph 的 Command 对象）

        Returns:
            工具调用信息字典，如果没有工具调用返回 None
            格式: {"name": "tool_name", "arguments": {...}}
        """
        # 处理 LangGraph 的 Command 对象（如 Overwrite）
        if hasattr(state_update, '__class__') and state_update.__class__.__name__ in ['Overwrite', 'Command']:
            try:
                if hasattr(state_update, 'value'):
                    value = state_update.value
                    if isinstance(value, list) and value:
                        last_item = value[-1]
                        return self._extract_tool_call_from_message(last_item)
                    elif hasattr(value, 'tool_calls'):
                        return self._extract_tool_call_from_message(value)
            except Exception as e:
                logger.debug(f"[DeepAgent] 处理 Overwrite 对象失败: {e}")
            return None

        # 处理字典类型
        if isinstance(state_update, dict):
            messages = state_update.get("messages", [])
            if messages and hasattr(messages, '__class__') and messages.__class__.__name__ == 'Overwrite':
                return self._extract_tool_call(messages)  # 递归处理

            if messages:
                last_msg = messages[-1] if isinstance(
                    messages, list) else messages
                return self._extract_tool_call_from_message(last_msg)

        # 处理列表类型
        if isinstance(state_update, list):
            if state_update:
                last_item = state_update[-1]
                return self._extract_tool_call_from_message(last_item)

        return None

    def _extract_tool_call_from_message(self, message) -> Optional[Dict]:
        """
        从消息对象中提取工具调用信息

        Args:
            message: LangChain 消息对象

        Returns:
            工具调用信息字典，如果没有工具调用返回 None
        """
        # 检查 AIMessage 的 tool_calls 属性
        if hasattr(message, 'tool_calls') and message.tool_calls:
            # tool_calls 是一个列表
            first_tool_call = message.tool_calls[0]
            if isinstance(first_tool_call, dict):
                tool_info = {
                    "name": first_tool_call.get("name", "unknown"),
                    "arguments": first_tool_call.get("args", {})
                }
            elif hasattr(first_tool_call, 'name'):
                tool_info = {
                    "name": first_tool_call.name,
                    "arguments": getattr(first_tool_call, 'args', {})
                }
            else:
                return None

            # 如果是 file_read 工具，修正文件路径
            if tool_info["name"] == "file_read" and "file_path" in tool_info["arguments"]:
                original_path = tool_info["arguments"]["file_path"]
                corrected_path = DeepAgentWrapper.get_correct_file_path(
                    original_path)
                if corrected_path != original_path:
                    logger.info(
                        f"[DeepAgent] 提取时路径修正: {original_path} -> {corrected_path}")
                    tool_info["arguments"]["file_path"] = corrected_path

            return tool_info

        # 检查 additional_kwargs 中的 tool_calls（OpenAI 格式）
        if hasattr(message, 'additional_kwargs'):
            tool_calls = message.additional_kwargs.get('tool_calls', [])
            if tool_calls:
                first_tool_call = tool_calls[0]
                if isinstance(first_tool_call, dict):
                    function = first_tool_call.get('function', {})
                    tool_info = {
                        "name": function.get('name', 'unknown'),
                        "arguments": function.get('arguments', {})
                    }

                    # 如果是 file_read 工具，修正文件路径
                    if tool_info["name"] == "file_read" and "file_path" in tool_info["arguments"]:
                        original_path = tool_info["arguments"]["file_path"]
                        corrected_path = DeepAgentWrapper.get_correct_file_path(
                            original_path)
                        if corrected_path != original_path:
                            logger.info(
                                f"[DeepAgent] 提取时路径修正: {original_path} -> {corrected_path}")
                            tool_info["arguments"]["file_path"] = corrected_path

                    return tool_info

        return None

    def _extract_tool_result(self, state_update, history_count: int = 0) -> Optional[Dict]:
        """
        提取工具结果信息（ToolMessage）

        检测是否有工具执行结果。

        Args:
            state_update: 状态更新
            history_count: 历史消息数量

        Returns:
            工具结果信息字典，包含 name 和 content；如果没有返回 None
        """
        logger.info(
            f"[DeepAgent] _extract_tool_result: state_update_type={type(state_update).__name__}")

        # 处理 LangGraph 的 Command 对象（如 Overwrite）
        if hasattr(state_update, '__class__') and state_update.__class__.__name__ in ['Overwrite', 'Command']:
            try:
                if hasattr(state_update, 'value'):
                    value = state_update.value
                    logger.debug(
                        f"[DeepAgent] _extract_tool_result: Overwrite value type={type(value).__name__}, len={len(value) if isinstance(value, list) else 'N/A'}")
                    if isinstance(value, list) and value:
                        # 查找 ToolMessage
                        for msg in reversed(value[history_count:] if history_count else value):
                            result = self._extract_tool_result_from_message(
                                msg)
                            if result:
                                return result
            except Exception as e:
                logger.debug(f"[DeepAgent] 处理 Overwrite 对象失败: {e}")
            return None

        # 处理字典类型
        if isinstance(state_update, dict):
            messages = state_update.get("messages", [])
            logger.info(
                f"[DeepAgent] _extract_tool_result: dict keys={list(state_update.keys())}, messages type={type(messages).__name__}, len={len(messages) if isinstance(messages, list) else 'N/A'}")
            if messages and hasattr(messages, '__class__') and messages.__class__.__name__ == 'Overwrite':
                return self._extract_tool_result(messages, history_count)

            if messages and isinstance(messages, list):
                # 查找新消息中的 ToolMessage
                for msg in reversed(messages[history_count:] if history_count else messages):
                    msg_type = getattr(msg, 'type', None) if hasattr(
                        msg, 'type') else None
                    msg_class = msg.__class__.__name__ if hasattr(
                        msg, '__class__') else 'unknown'
                    logger.info(
                        f"[DeepAgent] _extract_tool_result: 检查消息 type={msg_type}, class={msg_class}")
                    result = self._extract_tool_result_from_message(msg)
                    if result:
                        return result

        # 处理列表类型
        if isinstance(state_update, list):
            logger.debug(
                f"[DeepAgent] _extract_tool_result: list len={len(state_update)}")
            for msg in reversed(state_update[history_count:] if history_count else state_update):
                result = self._extract_tool_result_from_message(msg)
                if result:
                    return result

        return None

    def _extract_tool_result_from_message(self, message) -> Optional[Dict]:
        """
        从消息对象中提取工具结果信息

        Args:
            message: LangChain 消息对象

        Returns:
            工具结果信息字典，包含 name 和 content；如果不是 ToolMessage 返回 None
        """
        # 检查是否是 ToolMessage
        is_tool = False
        tool_name = None
        content = None

        # 通过 type 属性检查
        if hasattr(message, 'type'):
            if message.type == 'tool':
                is_tool = True
                # ToolMessage 有 name 属性表示工具名称
                if hasattr(message, 'name'):
                    tool_name = message.name
                logger.debug(f"[DeepAgent] 检测到 tool 类型消息: name={tool_name}")

        # 通过类名检查
        if hasattr(message, '__class__'):
            class_name = message.__class__.__name__
            if class_name == 'ToolMessage':
                is_tool = True
                # ToolMessage 有 name 属性表示工具名称
                if hasattr(message, 'name'):
                    tool_name = message.name
                logger.debug(
                    f"[DeepAgent] 检测到 ToolMessage 类: name={tool_name}")

        # 通过字典 role 检查
        if isinstance(message, dict):
            if message.get('role') == 'tool':
                is_tool = True
                tool_name = message.get('name')
                logger.debug(f"[DeepAgent] 检测到 tool role 字典: name={tool_name}")

        if not is_tool:
            return None

        # 提取内容
        if hasattr(message, 'content'):
            content = str(message.content)
        elif isinstance(message, dict):
            content = str(message.get('content', ''))

        if content is None:
            return None

        logger.info(
            f"[DeepAgent] 提取到工具结果: name={tool_name}, content_len={len(content)}")

        return {
            "name": tool_name or "unknown",
            "content": content
        }

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
