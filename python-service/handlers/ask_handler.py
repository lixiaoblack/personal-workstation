"""
Ask 模块处理器

处理 Ask 通用交互模块的消息。
"""
import time
import logging
from typing import Any, Dict, Optional, Callable, Awaitable

from .base_handler import BaseHandler

logger = logging.getLogger(__name__)


class AskMsgHandler(BaseHandler):
    """
    Ask 模块处理器

    处理以下消息类型：
    - ask_response: 用户对 Ask 的响应
    """

    def __init__(self, send_callback: Optional[Callable[[dict], Awaitable[None]]] = None, ask_handler=None):
        super().__init__(send_callback)
        self.ask_handler = ask_handler

    def set_ask_handler(self, ask_handler):
        """设置 AskHandler 实例"""
        self.ask_handler = ask_handler

    async def handle(self, message: dict) -> Optional[dict]:
        """处理 Ask 消息"""
        msg_type = message.get("type")

        if msg_type == "ask_response":
            return await self._handle_ask_response(message)
        else:
            return self.error_response(f"未知的 Ask 消息类型: {msg_type}", message.get("id"))

    async def _handle_ask_response(self, message: dict) -> dict:
        """
        处理用户对 Ask 的响应

        用户响应通过 AskHandler 处理，设置到对应的询问会话中。
        后续处理通过上下文进行。
        """
        try:
            logger.info(f"[Ask] 收到响应消息: {message}")

            if self.ask_handler:
                success = await self.ask_handler.handle_response(message)
            else:
                # 如果没有设置 ask_handler，尝试从 ask 模块获取
                from ask import AskHandler
                # 这里可能需要创建或获取全局实例
                logger.warning("[Ask] ask_handler 未设置")
                success = False

            logger.info(f"[Ask] 响应处理结果: success={success}")
            return {
                "type": "ask_response_ack",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": success,
                "askId": message.get("askId"),
            }
        except Exception as e:
            logger.error(f"[Ask] 处理响应错误: {e}")
            return {
                "type": "ask_response_ack",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }
