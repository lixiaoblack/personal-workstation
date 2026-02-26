"""
API 模块

提供 HTTP API 和直接调用接口。
"""

from .database import get_db, get_db_path, get_connection, execute_with_retry
from .models import (
    KnowledgeCreate, KnowledgeUpdate,
    ConversationCreate, ConversationUpdate,
    MessageCreate, MemorySave, SummaryCreate,
    UserProfileUpdate, OcrRecognizeRequest, OcrSaveToKnowledgeRequest
)
from .routers import (
    knowledge_router, conversation_router,
    memory_router, user_router, ocr_router, llm_router
)
from .direct_api import (
    direct_list_knowledge, direct_get_knowledge, direct_create_knowledge,
    direct_list_conversations, direct_get_conversation, direct_get_messages,
    direct_get_memories, direct_save_memory, direct_build_memory_context,
    direct_ocr_recognize, direct_ocr_recognize_file
)

__all__ = [
    # 数据库
    "get_db", "get_db_path", "get_connection", "execute_with_retry",
    # 模型
    "KnowledgeCreate", "KnowledgeUpdate",
    "ConversationCreate", "ConversationUpdate",
    "MessageCreate", "MemorySave", "SummaryCreate",
    "UserProfileUpdate", "OcrRecognizeRequest", "OcrSaveToKnowledgeRequest",
    # 路由
    "knowledge_router", "conversation_router",
    "memory_router", "user_router", "ocr_router", "llm_router",
    # 直接调用接口
    "direct_list_knowledge", "direct_get_knowledge", "direct_create_knowledge",
    "direct_list_conversations", "direct_get_conversation", "direct_get_messages",
    "direct_get_memories", "direct_save_memory", "direct_build_memory_context",
    "direct_ocr_recognize", "direct_ocr_recognize_file",
]
