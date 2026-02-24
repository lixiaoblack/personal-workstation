#!/usr/bin/env python3
"""
Ask 处理器 - 提供询问 API

提供便捷的询问方法，支持各种交互类型。
"""
import asyncio
import logging
from typing import Any, Callable, Dict, List, Optional, Union, Awaitable

from .types import (
    AskType,
    AskOption,
    AskMessage,
    AskResponse,
    AskResult,
    AskApiConfig,
    AskInputConfig,
    generate_ask_id,
)
from .registry import AskRegistry

logger = logging.getLogger(__name__)


class AskHandler:
    """通用询问处理器"""

    def __init__(self, send_callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None):
        """
        初始化询问处理器

        Args:
            send_callback: 发送消息的异步回调函数
        """
        self.send_callback = send_callback
        self.registry = AskRegistry()

    def set_send_callback(self, callback: Callable[[Dict[str, Any]], Awaitable[None]]) -> None:
        """设置发送消息的回调"""
        self.send_callback = callback

    async def _send(self, message: Dict[str, Any]) -> None:
        """发送消息"""
        if self.send_callback:
            await self.send_callback(message)
        else:
            logger.warning("[AskHandler] 未设置 send_callback，无法发送消息")

    async def ask(
        self,
        ask_type: AskType,
        title: str,
        description: Optional[str] = None,
        options: Optional[List[AskOption]] = None,
        api_config: Optional[AskApiConfig] = None,
        input_config: Optional[AskInputConfig] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300000,
        default_value: Optional[Union[str, List[str], bool]] = None,
    ) -> str:
        """
        发起询问

        Args:
            ask_type: 交互类型
            title: 标题
            description: 描述
            options: 选项列表
            api_config: API 配置
            input_config: 输入配置
            conversation_id: 会话 ID
            context: 上下文数据（后端处理用）
            timeout: 超时时间（毫秒）
            default_value: 默认值

        Returns:
            ask_id: 询问唯一标识
        """
        ask_id = generate_ask_id()

        # 注册询问
        await self.registry.register(
            ask_id=ask_id,
            context=context,
            timeout=timeout,
        )

        # 构建消息
        message = AskMessage(
            ask_id=ask_id,
            ask_type=ask_type,
            title=title,
            description=description,
            conversation_id=conversation_id,
            options=options,
            api_config=api_config,
            input_config=input_config,
            timeout=timeout,
            default_value=default_value,
        )

        # 发送询问消息
        await self._send(message.to_dict())
        logger.info(f"[AskHandler] 发起询问: {ask_id}, type={ask_type.value}, title={title}")

        return ask_id

    async def ask_select(
        self,
        title: str,
        options: List[AskOption],
        description: Optional[str] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300000,
    ) -> str:
        """发起单选询问"""
        return await self.ask(
            ask_type=AskType.SELECT,
            title=title,
            description=description,
            options=options,
            conversation_id=conversation_id,
            context=context,
            timeout=timeout,
        )

    async def ask_multi(
        self,
        title: str,
        options: List[AskOption],
        description: Optional[str] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300000,
    ) -> str:
        """发起多选询问"""
        return await self.ask(
            ask_type=AskType.MULTI,
            title=title,
            description=description,
            options=options,
            conversation_id=conversation_id,
            context=context,
            timeout=timeout,
        )

    async def ask_confirm(
        self,
        title: str,
        description: Optional[str] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        default_value: bool = False,
        timeout: int = 300000,
    ) -> str:
        """发起确认询问"""
        return await self.ask(
            ask_type=AskType.CONFIRM,
            title=title,
            description=description,
            conversation_id=conversation_id,
            context=context,
            default_value=default_value,
            timeout=timeout,
        )

    async def ask_input(
        self,
        title: str,
        description: Optional[str] = None,
        input_config: Optional[AskInputConfig] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300000,
    ) -> str:
        """发起输入询问"""
        return await self.ask(
            ask_type=AskType.INPUT,
            title=title,
            description=description,
            input_config=input_config,
            conversation_id=conversation_id,
            context=context,
            timeout=timeout,
        )

    async def ask_cascade(
        self,
        title: str,
        options: List[AskOption],
        description: Optional[str] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300000,
    ) -> str:
        """发起级联选择询问"""
        return await self.ask(
            ask_type=AskType.CASCADE,
            title=title,
            description=description,
            options=options,
            conversation_id=conversation_id,
            context=context,
            timeout=timeout,
        )

    async def ask_api_select(
        self,
        title: str,
        api_config: AskApiConfig,
        description: Optional[str] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300000,
    ) -> str:
        """发起 API 动态选项询问"""
        return await self.ask(
            ask_type=AskType.API_SELECT,
            title=title,
            description=description,
            api_config=api_config,
            conversation_id=conversation_id,
            context=context,
            timeout=timeout,
        )

    async def wait_response(
        self,
        ask_id: str,
        timeout: Optional[int] = None
    ) -> Optional[AskResponse]:
        """
        等待用户响应

        Args:
            ask_id: 询问唯一标识
            timeout: 超时时间（毫秒）

        Returns:
            用户响应，超时返回 action="timeout" 的响应
        """
        return await self.registry.wait_for_response(ask_id, timeout)

    async def ask_and_wait(
        self,
        ask_type: AskType,
        title: str,
        description: Optional[str] = None,
        options: Optional[List[AskOption]] = None,
        api_config: Optional[AskApiConfig] = None,
        input_config: Optional[AskInputConfig] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        timeout: int = 300000,
        default_value: Optional[Union[str, List[str], bool]] = None,
    ) -> Optional[AskResponse]:
        """
        发起询问并等待响应（便捷方法）

        适用于需要在同一位置发起询问和处理响应的场景。
        """
        ask_id = await self.ask(
            ask_type=ask_type,
            title=title,
            description=description,
            options=options,
            api_config=api_config,
            input_config=input_config,
            conversation_id=conversation_id,
            context=context,
            timeout=timeout,
            default_value=default_value,
        )
        return await self.wait_response(ask_id, timeout)

    async def handle_response(self, message: Dict[str, Any]) -> bool:
        """
        处理用户响应消息

        Args:
            message: 用户响应消息

        Returns:
            是否处理成功
        """
        response = AskResponse.from_dict(message)
        return await self.registry.set_response(response.ask_id, response)

    async def result(
        self,
        ask_id: str,
        success: bool,
        message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        发送询问结果

        Args:
            ask_id: 询问唯一标识
            success: 是否成功
            message: 结果消息
            data: 附加数据
        """
        result = AskResult(
            ask_id=ask_id,
            success=success,
            message=message,
            data=data,
        )
        await self._send(result.to_dict())
        logger.info(f"[AskHandler] 发送结果: {ask_id}, success={success}")

        # 清理询问
        await self.registry.remove(ask_id)

    def get_context(self, ask_id: str) -> Optional[Dict[str, Any]]:
        """获取询问上下文"""
        return self.registry.get_context(ask_id)

    def is_active(self, ask_id: str) -> bool:
        """检查询问是否活跃"""
        return self.registry.is_active(ask_id)

    async def cleanup(self) -> int:
        """清理过期询问"""
        return await self.registry.cleanup_expired()
