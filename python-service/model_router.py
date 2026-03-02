#!/usr/bin/env python3
"""
模型路由模块
使用 LangChain 封装不同 AI 提供商的模型调用
"""
import logging
from typing import Any, Dict, Iterator, Optional, Union
from dataclasses import dataclass
from enum import Enum

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_core.callbacks import CallbackManagerForLLMRun

logger = logging.getLogger(__name__)


class ModelProvider(str, Enum):
    """模型提供商"""
    OPENAI = "openai"
    BAILIAN = "bailian"  # 百炼（阿里云）
    ZHIPU = "zhipu"  # 智谱
    OLLAMA = "ollama"
    CUSTOM = "custom"


@dataclass
class ModelConfig:
    """模型配置"""
    provider: ModelProvider
    model_id: str
    id: Optional[int] = None  # 模型配置 ID（用于查找）
    usage_type: str = "llm"  # 模型用途：llm 或 embedding
    api_key: Optional[str] = None
    api_base_url: Optional[str] = None
    host: Optional[str] = None  # Ollama 使用
    max_tokens: int = 4096
    temperature: float = 0.7
    extra_params: Optional[Dict[str, Any]] = None


# 默认 API URLs
DEFAULT_API_URLS = {
    ModelProvider.OPENAI: "https://api.openai.com/v1",
    ModelProvider.BAILIAN: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    ModelProvider.ZHIPU: "https://open.bigmodel.cn/api/paas/v4",
}


class ModelRouter:
    """模型路由器"""

    def __init__(self):
        self._models: Dict[int, BaseChatModel] = {}
        self._configs: Dict[int, ModelConfig] = {}
        self._embedding_configs: Dict[int, ModelConfig] = {}  # 嵌入模型配置

    def create_chat_model(self, config: ModelConfig) -> BaseChatModel:
        """创建聊天模型"""
        if config.provider == ModelProvider.OLLAMA:
            return self._create_ollama_model(config)
        else:
            return self._create_openai_compatible_model(config)

    def _create_openai_compatible_model(self, config: ModelConfig) -> BaseChatModel:
        """创建 OpenAI 兼容模型（OpenAI、百炼、智谱、自定义）"""
        from langchain_openai import ChatOpenAI

        base_url = config.api_base_url or DEFAULT_API_URLS.get(config.provider)

        return ChatOpenAI(
            model=config.model_id,
            api_key=config.api_key,
            base_url=base_url,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            **(config.extra_params or {})
        )

    def _create_ollama_model(self, config: ModelConfig) -> BaseChatModel:
        """创建 Ollama 模型"""
        from langchain_ollama import ChatOllama

        return ChatOllama(
            model=config.model_id,
            base_url=config.host or "http://127.0.0.1:11434",
            num_predict=config.max_tokens,
            temperature=config.temperature,
            **(config.extra_params or {})
        )

    def register_model(self, model_id: int, config: ModelConfig) -> None:
        """注册模型配置"""
        self._configs[model_id] = config

        # 根据用途类型分别存储
        if config.usage_type == "embedding":
            self._embedding_configs[model_id] = config
            logger.info(f"已注册嵌入模型: {config.provider} / {config.model_id}")
        else:
            # 预创建 LLM 模型实例
            try:
                self._models[model_id] = self.create_chat_model(config)
                logger.info(
                    f"已注册 LLM 模型: {config.provider} / {config.model_id}")
            except Exception as e:
                logger.error(f"创建模型失败: {e}")
                raise

    def unregister_model(self, model_id: int) -> None:
        """注销模型"""
        config = self._configs.pop(model_id, None)
        self._models.pop(model_id, None)
        self._embedding_configs.pop(model_id, None)

    def get_model(self, model_id: int) -> Optional[BaseChatModel]:
        """获取模型实例"""
        return self._models.get(model_id)

    def get_config(self, model_id: int) -> Optional[ModelConfig]:
        """获取模型配置"""
        return self._configs.get(model_id)

    def get_default_embedding_config(self) -> Optional[ModelConfig]:
        """
        获取默认嵌入模型配置

        Returns:
            默认嵌入模型配置，如果没有配置则返回 None
        """
        if not self._embedding_configs:
            return None
        # 返回第一个注册的嵌入模型配置
        return next(iter(self._embedding_configs.values()))

    def get_embedding_config(self, model_id: Optional[int] = None) -> Optional[ModelConfig]:
        """
        获取嵌入模型配置

        Args:
            model_id: 模型 ID，如果为 None 则返回默认配置

        Returns:
            嵌入模型配置
        """
        if model_id:
            return self._embedding_configs.get(model_id)
        return self.get_default_embedding_config()

    def chat(
        self,
        messages: list[Dict[str, str]],
        model_id: Optional[int] = None,
        stream: bool = False,
    ) -> Union[str, Iterator[str]]:
        """
        发送聊天请求

        Args:
            messages: 消息列表 [{"role": "user", "content": "..."}]
            model_id: 模型 ID（使用注册的模型）
            stream: 是否流式输出

        Returns:
            响应内容或流式迭代器
        """
        # 获取模型
        if model_id:
            model = self._models.get(model_id)
            if not model:
                raise ValueError(f"模型 {model_id} 未注册")
        else:
            # 使用默认模型（第一个注册的）
            if not self._models:
                raise ValueError("没有可用的模型")
            model = list(self._models.values())[0]

        # 转换消息格式
        lc_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))

        if stream:
            return self._chat_stream(model, lc_messages)
        else:
            return self._chat_sync(model, lc_messages)

    def _chat_sync(self, model: BaseChatModel, messages: list[BaseMessage]) -> str:
        """同步聊天"""
        response = model.invoke(messages)
        return response.content

    def _chat_stream(self, model: BaseChatModel, messages: list[BaseMessage]) -> Iterator[str]:
        """流式聊天"""
        for chunk in model.stream(messages):
            if chunk.content:
                yield chunk.content

    async def chat_async(
        self,
        messages: list[Dict[str, str]],
        model_id: Optional[int] = None,
        tools: Optional[list] = None,
    ) -> Union[str, Dict[str, Any]]:
        """
        异步聊天

        Args:
            messages: 消息列表
            model_id: 模型 ID
            tools: 工具列表（OpenAI 格式）

        Returns:
            响应内容或工具调用信息
        """
        # 获取模型
        if model_id:
            model = self._models.get(model_id)
            if not model:
                raise ValueError(f"模型 {model_id} 未注册")
        else:
            if not self._models:
                raise ValueError("没有可用的模型")
            model = list(self._models.values())[0]

        # 转换消息格式
        lc_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))

        # 如果有工具，绑定工具到模型
        if tools:
            try:
                model = model.bind_tools(tools)
            except Exception as e:
                logger.warning(f"模型不支持工具绑定: {e}")

        # 异步调用
        response = await model.ainvoke(lc_messages)

        # 检查是否有工具调用
        if hasattr(response, 'tool_calls') and response.tool_calls:
            return {
                "content": response.content or "",
                "tool_calls": response.tool_calls,
                "has_tool_calls": True
            }

        return response.content

    async def chat_with_tools(
        self,
        messages: list[Dict[str, str]],
        model_id: Optional[int] = None,
        tools: Optional[list] = None,
        tool_executor: Optional[callable] = None,
        max_iterations: int = 5,
    ) -> str:
        """
        支持工具调用的聊天

        自动处理工具调用循环，直到模型返回最终答案。

        Args:
            messages: 消息列表
            model_id: 模型 ID
            tools: 工具列表（OpenAI 格式）
            tool_executor: 工具执行函数 (tool_name, tool_args) -> result
            max_iterations: 最大迭代次数

        Returns:
            最终响应内容
        """
        if not tools:
            return await self.chat_async(messages, model_id)

        # 获取模型
        if model_id:
            model = self._models.get(model_id)
            if not model:
                raise ValueError(f"模型 {model_id} 未注册")
        else:
            if not self._models:
                raise ValueError("没有可用的模型")
            model = list(self._models.values())[0]

        # 转换消息格式
        lc_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))

        # 绑定工具
        try:
            model_with_tools = model.bind_tools(tools)
        except Exception as e:
            logger.warning(f"模型不支持工具绑定，使用普通聊天: {e}")
            response = await model.ainvoke(lc_messages)
            return response.content

        # 工具调用循环
        iteration = 0
        while iteration < max_iterations:
            iteration += 1
            logger.info(f"[FunctionCalling] 迭代 {iteration}/{max_iterations}")

            # 调用模型
            response = await model_with_tools.ainvoke(lc_messages)

            # 检查是否有工具调用
            if not (hasattr(response, 'tool_calls') and response.tool_calls):
                # 没有工具调用，返回最终答案
                return response.content

            # 处理工具调用
            tool_calls = response.tool_calls
            logger.info(f"[FunctionCalling] 收到 {len(tool_calls)} 个工具调用")

            # 添加助手消息（包含工具调用）
            lc_messages.append(response)

            # 执行每个工具调用
            for tool_call in tool_calls:
                tool_name = tool_call.get("name") if isinstance(
                    tool_call, dict) else tool_call.name
                tool_args = tool_call.get("args") if isinstance(
                    tool_call, dict) else tool_call.args
                tool_id = tool_call.get("id") if isinstance(
                    tool_call, dict) else tool_call.id

                logger.info(
                    f"[FunctionCalling] 执行工具: {tool_name}({tool_args})")

                # 执行工具
                if tool_executor:
                    tool_result = await tool_executor(tool_name, tool_args)
                else:
                    tool_result = f"错误：未提供工具执行器"

                # 添加工具结果消息
                from langchain_core.messages import ToolMessage
                lc_messages.append(ToolMessage(
                    content=str(tool_result),
                    tool_call_id=tool_id
                ))

        # 达到最大迭代次数，返回当前内容
        response = await model.ainvoke(lc_messages)
        return response.content

    async def chat_stream_async(
        self,
        messages: list[Dict[str, str]],
        model_id: Optional[int] = None,
    ):
        """异步流式聊天"""
        # 获取模型
        if model_id:
            model = self._models.get(model_id)
            if not model:
                raise ValueError(f"模型 {model_id} 未注册")
        else:
            if not self._models:
                raise ValueError("没有可用的模型")
            model = list(self._models.values())[0]

        # 转换消息格式
        lc_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))

        # 异步流式调用
        chunk_count = 0
        async for chunk in model.astream(lc_messages):
            if chunk.content:
                chunk_count += 1
                logger.debug(
                    f"[ModelRouter] 流式块 #{chunk_count}: {len(chunk.content)} 字符")
                yield chunk.content
        logger.info(f"[ModelRouter] 流式完成，共 {chunk_count} 个块")

    async def test_connection(self, model_id: int) -> Dict[str, Any]:
        """测试模型连接"""
        import time

        config = self._configs.get(model_id)
        if not config:
            return {"success": False, "error": "模型配置不存在"}

        model = self._models.get(model_id)
        if not model:
            return {"success": False, "error": "模型未初始化"}

        try:
            start_time = time.time()
            # 发送简单测试消息
            response = await model.ainvoke([HumanMessage(content="Hi")])
            latency = int((time.time() - start_time) * 1000)

            return {
                "success": True,
                "latency": latency,
                "model_info": {
                    "provider": config.provider.value,
                    "model_id": config.model_id,
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# 全局模型路由器实例
model_router = ModelRouter()
