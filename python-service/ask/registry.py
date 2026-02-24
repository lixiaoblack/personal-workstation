#!/usr/bin/env python3
"""
Ask 注册表 - 管理活跃的询问会话

负责：
1. 注册新询问
2. 存储询问上下文
3. 等待用户响应
4. 处理超时
"""
import asyncio
import logging
from typing import Any, Dict, Optional
from dataclasses import dataclass, field
import time

from .types import AskResponse

logger = logging.getLogger(__name__)


@dataclass
class AskSession:
    """询问会话"""
    ask_id: str
    context: Optional[Dict[str, Any]] = None
    created_at: int = field(default_factory=lambda: int(time.time() * 1000))
    timeout: int = 300000  # 5分钟
    response: Optional[AskResponse] = None
    completed: bool = False
    event: asyncio.Event = field(default_factory=asyncio.Event)


class AskRegistry:
    """询问注册表"""

    def __init__(self):
        self._sessions: Dict[str, AskSession] = {}
        self._lock = asyncio.Lock()

    async def register(
        self,
        ask_id: str,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300000
    ) -> None:
        """
        注册一个新询问

        Args:
            ask_id: 询问唯一标识
            context: 上下文数据
            timeout: 超时时间（毫秒）
        """
        async with self._lock:
            session = AskSession(
                ask_id=ask_id,
                context=context,
                timeout=timeout,
            )
            self._sessions[ask_id] = session
            logger.debug(f"[AskRegistry] 注册询问: {ask_id}")

    async def set_response(self, ask_id: str, response: AskResponse) -> bool:
        """
        设置用户响应

        Args:
            ask_id: 询问唯一标识
            response: 用户响应

        Returns:
            是否设置成功
        """
        async with self._lock:
            session = self._sessions.get(ask_id)
            if not session:
                logger.warning(f"[AskRegistry] 未找到询问: {ask_id}")
                return False

            if session.completed:
                logger.warning(f"[AskRegistry] 询问已完成: {ask_id}")
                return False

            session.response = response
            session.completed = True
            session.event.set()
            logger.debug(f"[AskRegistry] 设置响应: {ask_id}, action={response.action}")
            return True

    async def wait_for_response(
        self,
        ask_id: str,
        timeout: Optional[int] = None
    ) -> Optional[AskResponse]:
        """
        等待用户响应

        Args:
            ask_id: 询问唯一标识
            timeout: 超时时间（毫秒），None 使用询问默认超时

        Returns:
            用户响应，超时返回 None
        """
        session = self._sessions.get(ask_id)
        if not session:
            logger.warning(f"[AskRegistry] 未找到询问: {ask_id}")
            return None

        # 使用传入超时或询问默认超时
        wait_timeout = (timeout or session.timeout) / 1000  # 转换为秒

        try:
            # 等待响应或超时
            await asyncio.wait_for(
                session.event.wait(),
                timeout=wait_timeout
            )
            return session.response
        except asyncio.TimeoutError:
            logger.warning(f"[AskRegistry] 询问超时: {ask_id}")
            session.completed = True
            return AskResponse(
                ask_id=ask_id,
                action="timeout",
                value=None,
            )

    def get_context(self, ask_id: str) -> Optional[Dict[str, Any]]:
        """
        获取询问上下文

        Args:
            ask_id: 询问唯一标识

        Returns:
            上下文数据
        """
        session = self._sessions.get(ask_id)
        return session.context if session else None

    async def remove(self, ask_id: str) -> bool:
        """
        移除询问

        Args:
            ask_id: 询问唯一标识

        Returns:
            是否移除成功
        """
        async with self._lock:
            if ask_id in self._sessions:
                del self._sessions[ask_id]
                logger.debug(f"[AskRegistry] 移除询问: {ask_id}")
                return True
            return False

    def is_active(self, ask_id: str) -> bool:
        """检查询问是否活跃"""
        session = self._sessions.get(ask_id)
        return session is not None and not session.completed

    def get_active_count(self) -> int:
        """获取活跃询问数量"""
        return sum(1 for s in self._sessions.values() if not s.completed)

    async def cleanup_expired(self) -> int:
        """
        清理过期的询问

        Returns:
            清理的询问数量
        """
        async with self._lock:
            now = int(time.time() * 1000)
            expired = [
                ask_id for ask_id, session in self._sessions.items()
                if now - session.created_at > session.timeout
            ]

            for ask_id in expired:
                del self._sessions[ask_id]

            if expired:
                logger.info(f"[AskRegistry] 清理过期询问: {len(expired)} 个")

            return len(expired)
