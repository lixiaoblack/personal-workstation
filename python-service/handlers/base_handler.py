"""
基础消息处理器

提供所有处理器的通用方法和接口定义。
"""
import time
import logging
from typing import Any, Dict, Optional, Callable, Awaitable

logger = logging.getLogger(__name__)


class BaseHandler:
    """
    基础处理器类

    所有具体处理器都继承此类，获得通用的消息处理能力。

    Attributes:
        send_callback: 发送消息的异步回调函数
    """

    def __init__(self, send_callback: Optional[Callable[[dict], Awaitable[None]]] = None):
        """
        初始化基础处理器

        Args:
            send_callback: 发送消息的异步回调函数，用于流式消息
        """
        self.send_callback = send_callback

    def set_send_callback(self, callback: Callable[[dict], Awaitable[None]]):
        """
        设置发送消息的回调函数

        Args:
            callback: 异步回调函数
        """
        self.send_callback = callback

    async def send_message(self, message: dict):
        """
        发送消息到前端

        Args:
            message: 消息字典
        """
        if self.send_callback:
            await self.send_callback(message)
        else:
            logger.warning("send_callback 未设置，无法发送消息")

    def error_response(self, error: str, msg_id: Optional[str] = None) -> dict:
        """
        生成错误响应

        Args:
            error: 错误信息
            msg_id: 消息 ID

        Returns:
            错误响应字典
        """
        return {
            "type": "chat_error",
            "id": msg_id,
            "timestamp": int(time.time() * 1000),
            "error": error,
            "code": "PROCESSING_ERROR"
        }

    def success_response(
        self,
        msg_type: str,
        msg_id: Optional[str] = None,
        **kwargs
    ) -> dict:
        """
        生成成功响应

        Args:
            msg_type: 响应消息类型
            msg_id: 消息 ID
            **kwargs: 其他响应字段

        Returns:
            成功响应字典
        """
        response = {
            "type": msg_type,
            "id": msg_id,
            "timestamp": int(time.time() * 1000),
            "success": True,
        }
        response.update(kwargs)
        return response

    async def _async_sleep(self, seconds: float):
        """异步睡眠"""
        import asyncio
        await asyncio.sleep(seconds)

    async def handle(self, message: dict) -> Optional[dict]:
        """
        处理消息（子类必须实现）

        Args:
            message: 消息字典

        Returns:
            响应字典，或 None（流式消息通过 send_callback 发送）

        Raises:
            NotImplementedError: 子类未实现此方法
        """
        raise NotImplementedError("子类必须实现 handle 方法")
