"""
消息处理器模块

将 message_handler.py 拆分为多个独立的处理器，提高代码可维护性。

处理器结构：
- BaseHandler: 基础处理器，提供通用方法
- ChatHandler: 聊天处理（保留原有逻辑）
- ModelHandler: 模型管理
- OllamaHandler: Ollama 相关
- SkillHandler: Skills 技能
- KnowledgeHandler: 知识库管理
- MemoryHandler: 记忆服务
- WebHandler: 网页采集
- AskHandler: Ask 模块
- AgentHandler: 智能体/工作流（新增）
"""

from .base_handler import BaseHandler
from .chat_handler import ChatHandler
from .model_handler import ModelHandler
from .ollama_handler import OllamaHandler
from .skill_handler import SkillHandler
from .knowledge_handler import KnowledgeHandler
from .memory_handler import MemoryHandler
from .web_handler import WebHandler
from .ask_handler import AskMsgHandler
from .agent_handler import AgentHandler
from .workflow_handler import WorkflowHandler

__all__ = [
    "BaseHandler",
    "ChatHandler",
    "ModelHandler",
    "OllamaHandler",
    "SkillHandler",
    "KnowledgeHandler",
    "MemoryHandler",
    "WebHandler",
    "AskMsgHandler",
    "AgentHandler",
    "WorkflowHandler",
]
