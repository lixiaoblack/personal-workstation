#!/usr/bin/env python3
"""
消息处理器
处理来自 Electron 的消息并返回响应

重构说明：
    原有的 message_handler.py 文件过于复杂（2000+ 行），
    现在拆分为多个独立的处理器模块，每个处理器负责一类消息。

    处理器模块位于 handlers/ 目录下：
    - base_handler.py: 基础处理器，提供通用方法
    - chat_handler.py: 聊天消息处理（保留原有逻辑）
    - model_handler.py: 模型管理
    - ollama_handler.py: Ollama 相关
    - skill_handler.py: Skills 技能
    - knowledge_handler.py: 知识库管理
    - memory_handler.py: 记忆服务
    - web_handler.py: 网页采集
    - ask_handler.py: Ask 模块
    - agent_handler.py: 智能体/工作流（新增）

使用方式：
    handler = MessageHandler(send_callback=callback)
    response = await handler.process(message)
"""
import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional

from model_router import model_router

# 导入所有处理器
from handlers.base_handler import BaseHandler
from handlers.chat_handler import ChatHandler
from handlers.model_handler import ModelHandler
from handlers.ollama_handler import OllamaHandler
from handlers.skill_handler import SkillHandler
from handlers.knowledge_handler import KnowledgeHandler
from handlers.memory_handler import MemoryHandler
from handlers.web_handler import WebHandler
from handlers.ask_handler import AskMsgHandler
from handlers.agent_handler import AgentHandler
from handlers.workflow_handler import WorkflowHandler

# 导入 Ask 模块
from ask import AskHandler

logger = logging.getLogger(__name__)


class MessageHandler:
    """消息处理器 - 整合所有子处理器"""

    def __init__(self, send_callback=None):
        """
        初始化消息处理器

        Args:
            send_callback: 发送消息的异步回调函数，用于流式消息
        """
        self.send_callback = send_callback

        # 初始化 Ask 模块
        self.ask_handler = AskHandler(send_callback=send_callback)

        # 设置 AskHandler 引用到 Todo 工具模块
        from agent.todo_tool import set_ask_handler
        set_ask_handler(self.ask_handler)

        # 初始化所有子处理器
        self._init_handlers()

        # 注册消息类型到处理器的映射
        self._register_handlers()

    def _init_handlers(self):
        """初始化所有子处理器"""
        # 聊天处理器（保留原有逻辑）
        self.chat_handler = ChatHandler(send_callback=self.send_callback)

        # 模型管理处理器
        self.model_handler = ModelHandler(send_callback=self.send_callback)

        # Ollama 处理器
        self.ollama_handler = OllamaHandler(send_callback=self.send_callback)

        # Skills 技能处理器
        self.skill_handler = SkillHandler(send_callback=self.send_callback)

        # 知识库处理器
        self.knowledge_handler = KnowledgeHandler(
            send_callback=self.send_callback)

        # 记忆处理器
        self.memory_handler = MemoryHandler(send_callback=self.send_callback)

        # 网页采集处理器
        self.web_handler = WebHandler(send_callback=self.send_callback)

        # Ask 模块处理器
        self.ask_msg_handler = AskMsgHandler(
            send_callback=self.send_callback,
            ask_handler=self.ask_handler
        )

        # 智能体/工作流处理器（新增）
        self.agent_handler = AgentHandler(send_callback=self.send_callback)

        # 工作流聊天处理器（与 Agent 隔离）
        self.workflow_handler = WorkflowHandler(
            send_callback=self.send_callback)

    def _register_handlers(self):
        """注册消息类型到处理器的映射"""
        # 消息类型 -> 处理器方法 映射
        self.handlers = {
            # 基础消息
            "ping": self._handle_ping,
            "connection_ack": self._handle_connection_ack,

            # 聊天消息（使用 ChatHandler）
            "chat_message": self.chat_handler.handle,

            # Agent 聊天（使用 AgentHandler）
            "agent_chat": self.agent_handler.handle,

            # Workflow 聊天（使用 WorkflowHandler，与 Agent 隔离）
            "workflow_chat": self.workflow_handler.handle,

            # 系统状态
            "system_status": self._handle_system_status,

            # 模型管理（使用 ModelHandler）
            "model_register": self.model_handler.handle,
            "model_unregister": self.model_handler.handle,
            "model_test": self.model_handler.handle,
            "model_config_sync": self.model_handler.handle,

            # Ollama 相关（使用 OllamaHandler）
            "ollama_status": self.ollama_handler.handle,
            "ollama_models": self.ollama_handler.handle,
            "ollama_test": self.ollama_handler.handle,

            # Skills 技能（使用 SkillHandler）
            "skill_list": self.skill_handler.handle,
            "skill_execute": self.skill_handler.handle,
            "skill_reload": self.skill_handler.handle,

            # Knowledge 知识库（使用 KnowledgeHandler）
            "knowledge_create": self.knowledge_handler.handle,
            "knowledge_delete": self.knowledge_handler.handle,
            "knowledge_list": self.knowledge_handler.handle,
            "knowledge_get": self.knowledge_handler.handle,
            "knowledge_add_document": self.knowledge_handler.handle,
            "knowledge_remove_document": self.knowledge_handler.handle,
            "knowledge_search": self.knowledge_handler.handle,
            "knowledge_list_documents": self.knowledge_handler.handle,

            # Memory 记忆（使用 MemoryHandler）
            "memory_generate_summary": self.memory_handler.handle,
            "memory_extract": self.memory_handler.handle,

            # Web Crawl 网页采集（使用 WebHandler）
            "web_crawl": self.web_handler.handle,
            "web_fetch": self.web_handler.handle,

            # Ask 通用交互模块（使用 AskMsgHandler）
            "ask_response": self.ask_msg_handler.handle,
        }

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

    # ===== 基础消息处理 =====

    async def _handle_ping(self, message: dict) -> dict:
        """处理心跳消息"""
        return {
            "type": "pong",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000)
        }

    async def _handle_connection_ack(self, message: dict) -> Optional[dict]:
        """处理连接确认消息"""
        logger.debug(f"收到连接确认: {message.get('clientId')}")
        return None  # 不需要响应

    async def _handle_system_status(self, message: dict) -> dict:
        """处理系统状态查询"""
        return {
            "type": "system_status",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            "status": "ready",
            "conversations": len(self.chat_handler.conversations),
            "registered_models": len(model_router._models)
        }

    def _error_response(self, error: str, msg_id: Optional[str] = None) -> dict:
        """生成错误响应"""
        return {
            "type": "chat_error",
            "id": msg_id,
            "timestamp": int(time.time() * 1000),
            "error": error,
            "code": "PROCESSING_ERROR"
        }
