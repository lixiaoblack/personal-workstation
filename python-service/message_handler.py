#!/usr/bin/env python3
"""
消息处理器
处理来自 Electron 的消息并返回响应
"""
import json
import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class MessageHandler:
    """消息处理器"""
    
    def __init__(self):
        self.handlers = {
            "ping": self._handle_ping,
            "chat_message": self._handle_chat_message,
            "system_status": self._handle_system_status,
        }
        # 会话存储（后续可替换为持久化存储）
        self.conversations: Dict[str, list] = {}
        
    async def process(self, message: dict) -> Optional[dict]:
        """处理消息"""
        msg_type = message.get("type")
        
        if not msg_type:
            return self._error_response("无效的消息类型", message.get("id"))
            
        handler = self.handlers.get(msg_type)
        if not handler:
            logger.warning(f"未知的消息类型: {msg_type}")
            return self._error_response(f"未知的消息类型: {msg_type}", message.get("id"))
            
        try:
            return await handler(message)
        except Exception as e:
            logger.error(f"处理消息错误: {e}")
            return self._error_response(str(e), message.get("id"))
            
    async def _handle_ping(self, message: dict) -> dict:
        """处理心跳消息"""
        return {
            "type": "pong",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000)
        }
        
    async def _handle_chat_message(self, message: dict) -> dict:
        """处理聊天消息"""
        content = message.get("content", "")
        conversation_id = message.get("conversationId")
        
        logger.info(f"收到聊天消息: {content[:50]}...")
        
        # 存储会话历史
        if conversation_id:
            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = []
            self.conversations[conversation_id].append({
                "role": "user",
                "content": content,
                "timestamp": int(time.time() * 1000)
            })
        
        # TODO: 接入实际的 AI 智能体处理
        # 目前返回模拟响应
        response_content = await self._generate_mock_response(content)
        
        # 存储响应
        if conversation_id:
            self.conversations[conversation_id].append({
                "role": "assistant",
                "content": response_content,
                "timestamp": int(time.time() * 1000)
            })
        
        return {
            "type": "chat_response",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            "content": response_content,
            "conversationId": conversation_id,
            "success": True
        }
        
    async def _handle_system_status(self, message: dict) -> dict:
        """处理系统状态查询"""
        return {
            "type": "system_status",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            "status": "ready",
            "conversations": len(self.conversations)
        }
        
    async def _generate_mock_response(self, content: str) -> str:
        """生成模拟响应（后续替换为实际 AI 处理）"""
        # 模拟处理延迟
        await self._async_sleep(0.1)
        
        # 简单的响应逻辑
        responses = {
            "你好": "你好！我是 AI 助手，很高兴为您服务。",
            "hello": "Hello! I'm your AI assistant.",
            "帮助": "我可以帮助您：\n1. 回答问题\n2. 处理文本\n3. 提供建议\n\n请告诉我您需要什么帮助？",
            "help": "I can help you with:\n1. Answering questions\n2. Processing text\n3. Providing suggestions\n\nWhat do you need?",
        }
        
        # 检查是否有预设响应
        content_lower = content.lower().strip()
        for key, response in responses.items():
            if key.lower() in content_lower:
                return response
                
        # 默认响应
        return f"收到您的消息：\"{content}\"\n\n我是 AI 助手，目前处于测试模式。后续将接入实际的智能体进行处理。"
        
    async def _async_sleep(self, seconds: float):
        """异步睡眠"""
        import asyncio
        await asyncio.sleep(seconds)
        
    def _error_response(self, error: str, msg_id: Optional[str] = None) -> dict:
        """生成错误响应"""
        return {
            "type": "chat_error",
            "id": msg_id,
            "timestamp": int(time.time() * 1000),
            "error": error,
            "code": "PROCESSING_ERROR"
        }
