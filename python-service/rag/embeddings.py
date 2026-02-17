"""
嵌入模型模块

支持本地和在线双模式嵌入：
1. Ollama 本地模型（默认）：nomic-embed-text
2. OpenAI 在线 API：text-embedding-3-small

使用示例：
    service = EmbeddingService()
    
    # 自动选择嵌入模型
    embeddings = await service.get_embeddings(["文本1", "文本2"])
    
    # 指定使用 Ollama
    service = EmbeddingService(model_type=EmbeddingModelType.OLLAMA)
    
    # 指定使用 OpenAI
    service = EmbeddingService(
        model_type=EmbeddingModelType.OPENAI,
        api_key="sk-xxx",
        base_url="https://api.openai.com/v1"
    )
"""

import logging
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class EmbeddingModelType(str, Enum):
    """嵌入模型类型"""
    OLLAMA = "ollama"
    OPENAI = "openai"


class EmbeddingService:
    """
    嵌入服务

    支持自动选择嵌入模型：
    - 如果配置了 OpenAI API Key，使用 OpenAI Embedding
    - 否则使用 Ollama 本地模型

    默认模型：
    - Ollama: nomic-embed-text (维度: 768)
    - OpenAI: text-embedding-3-small (维度: 1536)
    """

    # 默认模型配置
    DEFAULT_MODELS = {
        EmbeddingModelType.OLLAMA: "nomic-embed-text",
        EmbeddingModelType.OPENAI: "text-embedding-3-small",
    }

    # 模型维度
    MODEL_DIMENSIONS = {
        "nomic-embed-text": 768,
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
        "text-embedding-ada-002": 1536,
    }

    def __init__(
        self,
        model_type: Optional[EmbeddingModelType] = None,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        ollama_host: str = "http://127.0.0.1:11434",
    ):
        """
        初始化嵌入服务

        Args:
            model_type: 模型类型，None 时自动选择
            model_name: 模型名称，None 时使用默认模型
            api_key: OpenAI API Key
            base_url: OpenAI API Base URL
            ollama_host: Ollama 服务地址
        """
        self._ollama_host = ollama_host
        self._api_key = api_key
        self._base_url = base_url

        # 确定模型类型
        if model_type:
            self._model_type = model_type
        else:
            # 自动选择：有 API Key 用 OpenAI，否则用 Ollama
            self._model_type = (
                EmbeddingModelType.OPENAI
                if api_key
                else EmbeddingModelType.OLLAMA
            )

        # 确定模型名称
        self._model_name = model_name or self.DEFAULT_MODELS[self._model_type]

        # 获取向量维度
        self._dimension = self.MODEL_DIMENSIONS.get(self._model_name, 768)

        # 延迟初始化嵌入模型
        self._embedding_model: Optional[Any] = None

        logger.info(
            f"嵌入服务初始化: type={self._model_type.value}, "
            f"model={self._model_name}, dimension={self._dimension}"
        )

    @property
    def model_type(self) -> EmbeddingModelType:
        """获取模型类型"""
        return self._model_type

    @property
    def model_name(self) -> str:
        """获取模型名称"""
        return self._model_name

    @property
    def dimension(self) -> int:
        """获取向量维度"""
        return self._dimension

    def _get_ollama_embeddings(self, texts: List[str]) -> List[List[float]]:
        """使用 Ollama 获取嵌入向量"""
        import httpx

        embeddings = []

        with httpx.Client(timeout=60.0) as client:
            for text in texts:
                try:
                    response = client.post(
                        f"{self._ollama_host}/api/embeddings",
                        json={
                            "model": self._model_name,
                            "prompt": text,
                        }
                    )
                    response.raise_for_status()
                    data = response.json()
                    embeddings.append(data.get("embedding", []))
                except Exception as e:
                    logger.error(f"Ollama 嵌入失败: {e}")
                    # 返回零向量作为降级
                    embeddings.append([0.0] * self._dimension)

        return embeddings

    def _get_openai_embeddings(self, texts: List[str]) -> List[List[float]]:
        """使用 OpenAI API 获取嵌入向量"""
        from langchain_openai import OpenAIEmbeddings

        if not self._embedding_model:
            self._embedding_model = OpenAIEmbeddings(
                model=self._model_name,
                openai_api_key=self._api_key,
                openai_api_base=self._base_url,
            )

        try:
            embeddings = self._embedding_model.embed_documents(texts)
            return embeddings
        except Exception as e:
            logger.error(f"OpenAI 嵌入失败: {e}")
            # 返回零向量作为降级
            return [[0.0] * self._dimension for _ in texts]

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        获取文本的嵌入向量（异步）

        Args:
            texts: 文本列表

        Returns:
            嵌入向量列表
        """
        if not texts:
            return []

        if self._model_type == EmbeddingModelType.OLLAMA:
            return self._get_ollama_embeddings(texts)
        else:
            return self._get_openai_embeddings(texts)

    async def get_embedding(self, text: str) -> List[float]:
        """
        获取单个文本的嵌入向量

        Args:
            text: 文本内容

        Returns:
            嵌入向量
        """
        embeddings = await self.get_embeddings([text])
        return embeddings[0] if embeddings else []

    def get_config(self) -> Dict[str, Any]:
        """
        获取嵌入服务配置

        Returns:
            配置字典
        """
        return {
            "model_type": self._model_type.value,
            "model_name": self._model_name,
            "dimension": self._dimension,
            "ollama_host": self._ollama_host,
        }

    @classmethod
    def from_config(cls, config: Dict[str, Any]) -> "EmbeddingService":
        """
        从配置创建嵌入服务

        Args:
            config: 配置字典

        Returns:
            嵌入服务实例
        """
        return cls(
            model_type=EmbeddingModelType(config.get("model_type", "ollama")),
            model_name=config.get("model_name"),
            api_key=config.get("api_key"),
            base_url=config.get("base_url"),
            ollama_host=config.get("ollama_host", "http://127.0.0.1:11434"),
        )


# 全局嵌入服务实例
_global_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service(
    model_type: Optional[EmbeddingModelType] = None,
    **kwargs
) -> EmbeddingService:
    """
    获取全局嵌入服务实例

    Args:
        model_type: 模型类型
        **kwargs: 其他参数

    Returns:
        嵌入服务实例
    """
    global _global_embedding_service

    if _global_embedding_service is None or model_type:
        _global_embedding_service = EmbeddingService(
            model_type=model_type, **kwargs)

    return _global_embedding_service


def init_embedding_service(
    model_type: EmbeddingModelType = EmbeddingModelType.OLLAMA,
    model_name: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> EmbeddingService:
    """
    初始化全局嵌入服务

    Args:
        model_type: 模型类型
        model_name: 模型名称
        api_key: API Key
        base_url: API Base URL

    Returns:
        嵌入服务实例
    """
    global _global_embedding_service

    _global_embedding_service = EmbeddingService(
        model_type=model_type,
        model_name=model_name,
        api_key=api_key,
        base_url=base_url,
    )

    return _global_embedding_service
