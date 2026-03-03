"""
Ollama 处理器

处理 Ollama 相关的消息。
"""
import time
import logging
from typing import Any, Dict, Optional, Callable, Awaitable

from .base_handler import BaseHandler
from ollama_client import check_ollama_status, get_ollama_models, get_ollama_client

logger = logging.getLogger(__name__)


class OllamaHandler(BaseHandler):
    """
    Ollama 处理器

    处理以下消息类型：
    - ollama_status: 查询 Ollama 状态
    - ollama_models: 获取 Ollama 模型列表
    - ollama_test: 测试 Ollama 连接
    """

    async def handle(self, message: dict) -> Optional[dict]:
        """处理 Ollama 消息"""
        msg_type = message.get("type")

        if msg_type == "ollama_status":
            return await self._handle_ollama_status(message)
        elif msg_type == "ollama_models":
            return await self._handle_ollama_models(message)
        elif msg_type == "ollama_test":
            return await self._handle_ollama_test(message)
        else:
            return self.error_response(f"未知的 Ollama 消息类型: {msg_type}", message.get("id"))

    async def _handle_ollama_status(self, message: dict) -> dict:
        """处理 Ollama 状态查询"""
        host = message.get("host", "http://127.0.0.1:11434")

        try:
            status = await check_ollama_status(host)
            return {
                "type": "ollama_status_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                **status.to_dict()
            }
        except Exception as e:
            logger.error(f"检查 Ollama 状态失败: {e}")
            return {
                "type": "ollama_status_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "running": False,
                "host": host,
                "error": str(e),
            }

    async def _handle_ollama_models(self, message: dict) -> dict:
        """处理 Ollama 模型列表查询"""
        host = message.get("host", "http://127.0.0.1:11434")

        try:
            models = await get_ollama_models(host)
            return {
                "type": "ollama_models_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "host": host,
                "models": [m.to_dict() for m in models],
                "count": len(models),
            }
        except Exception as e:
            logger.error(f"获取 Ollama 模型列表失败: {e}")
            return {
                "type": "ollama_models_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "host": host,
                "error": str(e),
                "models": [],
                "count": 0,
            }

    async def _handle_ollama_test(self, message: dict) -> dict:
        """处理 Ollama 连接测试"""
        host = message.get("host", "http://127.0.0.1:11434")

        try:
            client = get_ollama_client(host)
            result = await client.test_connection()
            return {
                "type": "ollama_test_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                **result
            }
        except Exception as e:
            logger.error(f"测试 Ollama 连接失败: {e}")
            return {
                "type": "ollama_test_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "host": host,
                "error": str(e),
            }
