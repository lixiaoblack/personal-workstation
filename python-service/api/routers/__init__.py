"""
API 路由模块

包含所有 API 端点的路由定义。
"""

from .knowledge import router as knowledge_router
from .conversation import router as conversation_router
from .memory import router as memory_router
from .user import router as user_router
from .ocr import router as ocr_router
from .llm import router as llm_router

__all__ = [
    "knowledge_router",
    "conversation_router",
    "memory_router",
    "user_router",
    "ocr_router",
    "llm_router",
]
