"""
记忆处理器

处理记忆相关的消息。
"""
import time
import logging
from typing import Any, Dict, Optional, Callable, Awaitable

from .base_handler import BaseHandler

logger = logging.getLogger(__name__)


class MemoryHandler(BaseHandler):
    """
    记忆处理器

    处理以下消息类型：
    - memory_generate_summary: 生成摘要
    - memory_extract: 提取记忆
    """

    async def handle(self, message: dict) -> Optional[dict]:
        """处理记忆消息"""
        msg_type = message.get("type")

        if msg_type == "memory_generate_summary":
            return await self._handle_memory_generate_summary(message)
        elif msg_type == "memory_extract":
            return await self._handle_memory_extract(message)
        else:
            return self.error_response(f"未知的记忆消息类型: {msg_type}", message.get("id"))

    async def _handle_memory_generate_summary(self, message: dict) -> dict:
        """
        处理摘要生成请求

        从对话消息中生成摘要，用于多轮对话状态管理。
        """
        conversation_id = message.get("conversationId")
        messages = message.get("messages", [])
        model_id = message.get("modelId")

        if not conversation_id or not messages:
            return {
                "type": "memory_generate_summary_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少 conversationId 或 messages",
            }

        try:
            from memory_service import memory_service

            # 生成摘要
            result = await memory_service.generate_summary(messages, model_id)

            if not result:
                return {
                    "type": "memory_generate_summary_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": "摘要生成失败",
                }

            logger.info(f"[Memory] 生成摘要成功: conversation_id={conversation_id}")

            return {
                "type": "memory_generate_summary_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "conversationId": conversation_id,
                "summary": result.get("summary", ""),
                "keyTopics": result.get("key_topics", []),
                "pendingTasks": result.get("pending_tasks", []),
            }

        except Exception as e:
            logger.error(f"生成摘要错误: {e}")
            return {
                "type": "memory_generate_summary_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_memory_extract(self, message: dict) -> dict:
        """
        处理记忆提取请求

        从对话中提取用户偏好、项目上下文、任务进度等信息。
        """
        conversation_id = message.get("conversationId")
        messages = message.get("messages", [])
        model_id = message.get("modelId")

        if not messages:
            return {
                "type": "memory_extract_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少 messages",
            }

        try:
            from memory_service import memory_service

            # 提取记忆
            result = await memory_service.extract_memory(messages, model_id)

            if not result:
                return {
                    "type": "memory_extract_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": True,
                    "memories": {},
                }

            logger.info(f"[Memory] 提取记忆成功: {list(result.keys())}")

            return {
                "type": "memory_extract_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "conversationId": conversation_id,
                "memories": result,
            }

        except Exception as e:
            logger.error(f"提取记忆错误: {e}")
            return {
                "type": "memory_extract_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }
