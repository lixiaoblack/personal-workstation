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
        # 预创建模型实例（可选，也可以延迟创建）
        try:
            self._models[model_id] = self.create_chat_model(config)
            logger.info(f"已注册模型: {config.provider} / {config.model_id}")
        except Exception as e:
            logger.error(f"创建模型失败: {e}")
            raise

    def unregister_model(self, model_id: int) -> None:
        """注销模型"""
        self._configs.pop(model_id, None)
        self._models.pop(model_id, None)

    def get_model(self, model_id: int) -> Optional[BaseChatModel]:
        """获取模型实例"""
        return self._models.get(model_id)

    def get_config(self, model_id: int) -> Optional[ModelConfig]:
        """获取模型配置"""
        return self._configs.get(model_id)

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
    ) -> str:
        """异步聊天"""
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

        # 异步调用
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
        async for chunk in model.astream(lc_messages):
            if chunk.content:
                yield chunk.content

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
