"""
Pydantic 数据模型

定义所有 API 请求和响应的数据模型。
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


# ==================== 知识库模型 ====================

class KnowledgeCreate(BaseModel):
    """创建知识库请求"""
    name: str
    description: Optional[str] = None
    embedding_model: str = "ollama"
    embedding_model_name: str = "nomic-embed-text"


class KnowledgeUpdate(BaseModel):
    """更新知识库请求"""
    name: Optional[str] = None
    description: Optional[str] = None


# ==================== 对话模型 ====================

class ConversationCreate(BaseModel):
    """创建对话请求"""
    title: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None


class ConversationUpdate(BaseModel):
    """更新对话请求"""
    title: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None


# ==================== 消息模型 ====================

class MessageCreate(BaseModel):
    """创建消息请求"""
    conversation_id: int
    role: str
    content: str
    tokens_used: Optional[int] = None
    timestamp: int
    metadata: Optional[Dict[str, Any]] = None


# ==================== 记忆模型 ====================

class MemorySave(BaseModel):
    """保存记忆请求"""
    memory_type: str
    memory_key: str
    memory_value: str
    source_conversation_id: Optional[int] = None
    confidence: float = 1.0


# ==================== 摘要模型 ====================

class SummaryCreate(BaseModel):
    """创建摘要请求"""
    conversation_id: int
    start_message_id: int
    end_message_id: int
    summary: str
    key_topics: List[str] = []
    message_count: int


# ==================== 用户模型 ====================

class UserProfileUpdate(BaseModel):
    """更新用户资料请求"""
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None
    gender: Optional[int] = None
    bio: Optional[str] = None


# ==================== OCR 模型 ====================

class OcrRecognizeRequest(BaseModel):
    """OCR 识别请求"""
    image_base64: str  # Base64 编码的图片数据


class OcrSaveToKnowledgeRequest(BaseModel):
    """OCR 结果保存到知识库请求"""
    knowledge_id: str
    title: str
    content: str
