#!/usr/bin/env python3
"""
Ollama 客户端模块
提供 Ollama 服务状态检测、模型列表获取等功能
"""
import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# 默认 Ollama 服务地址
DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434"

# 请求超时时间（秒）
REQUEST_TIMEOUT = 10.0


@dataclass
class OllamaModel:
    """Ollama 模型信息"""
    name: str
    modified_at: str
    size: int  # 字节
    digest: str
    details: Optional[Dict[str, Any]] = None

    @property
    def size_gb(self) -> float:
        """模型大小（GB）"""
        return self.size / (1024 ** 3)

    @property
    def size_mb(self) -> float:
        """模型大小（MB）"""
        return self.size / (1024 ** 2)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "name": self.name,
            "modifiedAt": self.modified_at,
            "size": self.size,
            "sizeGB": round(self.size_gb, 2),
            "sizeMB": round(self.size_mb, 2),
            "digest": self.digest,
            "details": self.details,
        }


@dataclass
class OllamaStatus:
    """Ollama 服务状态"""
    running: bool
    host: str
    version: Optional[str] = None
    error: Optional[str] = None
    models: List[OllamaModel] = None

    def __post_init__(self):
        if self.models is None:
            self.models = []

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "running": self.running,
            "host": self.host,
            "version": self.version,
            "error": self.error,
            "models": [m.to_dict() for m in self.models] if self.models else [],
            "modelCount": len(self.models) if self.models else 0,
        }


class OllamaClient:
    """Ollama API 客户端"""

    def __init__(self, host: str = DEFAULT_OLLAMA_HOST):
        self.host = host.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """获取 HTTP 客户端"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)
        return self._client

    async def close(self):
        """关闭客户端"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def check_status(self) -> OllamaStatus:
        """
        检查 Ollama 服务状态

        Returns:
            OllamaStatus: 服务状态信息
        """
        client = await self._get_client()

        try:
            # 检查服务是否运行
            response = await client.get(f"{self.host}/api/tags")
            if response.status_code == 200:
                # 解析模型列表
                data = response.json()
                models = []
                for model_data in data.get("models", []):
                    models.append(OllamaModel(
                        name=model_data.get("name", ""),
                        modified_at=model_data.get("modified_at", ""),
                        size=model_data.get("size", 0),
                        digest=model_data.get("digest", ""),
                        details=model_data.get("details"),
                    ))

                # 获取版本信息
                version = await self._get_version(client)

                return OllamaStatus(
                    running=True,
                    host=self.host,
                    version=version,
                    models=models,
                )
            else:
                return OllamaStatus(
                    running=False,
                    host=self.host,
                    error=f"HTTP {response.status_code}",
                )
        except httpx.ConnectError:
            return OllamaStatus(
                running=False,
                host=self.host,
                error="无法连接到 Ollama 服务",
            )
        except httpx.TimeoutException:
            return OllamaStatus(
                running=False,
                host=self.host,
                error="连接超时",
            )
        except Exception as e:
            logger.error(f"检查 Ollama 状态失败: {e}")
            return OllamaStatus(
                running=False,
                host=self.host,
                error=str(e),
            )

    async def _get_version(self, client: httpx.AsyncClient) -> Optional[str]:
        """获取 Ollama 版本"""
        try:
            response = await client.get(f"{self.host}/api/version")
            if response.status_code == 200:
                data = response.json()
                return data.get("version")
        except Exception:
            pass
        return None

    async def list_models(self) -> List[OllamaModel]:
        """
        获取可用模型列表

        Returns:
            List[OllamaModel]: 模型列表
        """
        client = await self._get_client()

        try:
            response = await client.get(f"{self.host}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = []
                for model_data in data.get("models", []):
                    models.append(OllamaModel(
                        name=model_data.get("name", ""),
                        modified_at=model_data.get("modified_at", ""),
                        size=model_data.get("size", 0),
                        digest=model_data.get("digest", ""),
                        details=model_data.get("details"),
                    ))
                return models
            else:
                logger.error(f"获取模型列表失败: HTTP {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"获取模型列表失败: {e}")
            return []

    async def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        获取模型详细信息

        Args:
            model_name: 模型名称

        Returns:
            Dict: 模型详细信息
        """
        client = await self._get_client()

        try:
            response = await client.post(
                f"{self.host}/api/show",
                json={"name": model_name}
            )
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"获取模型信息失败: HTTP {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"获取模型信息失败: {e}")
            return None

    async def test_connection(self) -> Dict[str, Any]:
        """
        测试 Ollama 连接

        Returns:
            Dict: 测试结果
        """
        import time

        client = await self._get_client()

        try:
            start_time = time.time()
            response = await client.get(f"{self.host}/api/tags")
            latency = int((time.time() - start_time) * 1000)

            if response.status_code == 200:
                data = response.json()
                model_count = len(data.get("models", []))
                return {
                    "success": True,
                    "latency": latency,
                    "host": self.host,
                    "modelCount": model_count,
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "host": self.host,
                }
        except httpx.ConnectError:
            return {
                "success": False,
                "error": "无法连接到 Ollama 服务",
                "host": self.host,
            }
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "连接超时",
                "host": self.host,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "host": self.host,
            }

    async def pull_model(self, model_name: str, stream: bool = False) -> Dict[str, Any]:
        """
        拉取模型（下载模型）

        Args:
            model_name: 模型名称
            stream: 是否流式返回进度

        Returns:
            Dict: 拉取结果
        """
        client = await self._get_client()

        try:
            response = await client.post(
                f"{self.host}/api/pull",
                json={"name": model_name, "stream": stream},
                timeout=300.0  # 下载可能需要较长时间
            )
            if response.status_code == 200:
                return {"success": True, "model": model_name}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            logger.error(f"拉取模型失败: {e}")
            return {"success": False, "error": str(e)}


# 全局客户端实例缓存
_ollama_clients: Dict[str, OllamaClient] = {}


def get_ollama_client(host: str = DEFAULT_OLLAMA_HOST) -> OllamaClient:
    """
    获取 Ollama 客户端实例

    Args:
        host: Ollama 服务地址

    Returns:
        OllamaClient: 客户端实例
    """
    host = host.rstrip("/")
    if host not in _ollama_clients:
        _ollama_clients[host] = OllamaClient(host)
    return _ollama_clients[host]


async def check_ollama_status(host: str = DEFAULT_OLLAMA_HOST) -> OllamaStatus:
    """
    检查 Ollama 服务状态（便捷函数）

    Args:
        host: Ollama 服务地址

    Returns:
        OllamaStatus: 服务状态
    """
    client = get_ollama_client(host)
    return await client.check_status()


async def get_ollama_models(host: str = DEFAULT_OLLAMA_HOST) -> List[OllamaModel]:
    """
    获取 Ollama 模型列表（便捷函数）

    Args:
        host: Ollama 服务地址

    Returns:
        List[OllamaModel]: 模型列表
    """
    client = get_ollama_client(host)
    return await client.list_models()
