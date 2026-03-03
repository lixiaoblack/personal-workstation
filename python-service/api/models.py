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


# ==================== 智能体模型 ====================

class AgentCreate(BaseModel):
    """创建智能体请求"""
    name: str
    description: Optional[str] = None
    avatar: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[str]] = []
    knowledge_ids: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    parameters: Optional[Dict[str, Any]] = {}
    workflow_id: Optional[str] = None


class AgentUpdate(BaseModel):
    """更新智能体请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    avatar: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[str]] = None
    knowledge_ids: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    parameters: Optional[Dict[str, Any]] = None
    workflow_id: Optional[str] = None
    status: Optional[str] = None


# ==================== 工作流模型 ====================

class WorkflowNode(BaseModel):
    """工作流节点"""
    id: str
    type: str  # start, end, llm, tool, knowledge, condition, loop, file_select, user_input, human_review, message, webhook
    position: Dict[str, float]  # {x, y}
    data: Dict[str, Any] = {}  # 节点配置数据


class WorkflowEdge(BaseModel):
    """工作流边（连线）"""
    id: str
    source: str  # 源节点 ID
    target: str  # 目标节点 ID
    sourceHandle: Optional[str] = None  # 源节点的连接点
    targetHandle: Optional[str] = None  # 目标节点的连接点
    label: Optional[str] = None  # 边标签（条件分支时使用）
    data: Optional[Dict[str, Any]] = None  # 边配置数据


class WorkflowCreate(BaseModel):
    """创建工作流请求"""
    name: str
    description: Optional[str] = None
    agent_id: Optional[str] = None
    nodes: Optional[List[Dict[str, Any]]] = []
    edges: Optional[List[Dict[str, Any]]] = []
    variables: Optional[Dict[str, Any]] = {}


class WorkflowUpdate(BaseModel):
    """更新工作流请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    agent_id: Optional[str] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    variables: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
