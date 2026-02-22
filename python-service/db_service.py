"""
数据库服务 - FastAPI HTTP API

提供统一的数据访问层，所有数据库操作都在这里实现。
Electron 通过 HTTP API 调用，Agent 直接调用数据库函数。

API 端点:
- /api/knowledge/*   知识库管理
- /api/conversations/* 对话管理
- /api/messages/*    消息管理
- /api/memories/*    记忆管理
- /api/users/*       用户管理
- /health            健康检查
"""

import os
import json
import time
import sqlite3
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== 数据库配置 ====================

# 数据库路径，优先从环境变量获取
DB_PATH = os.environ.get("DB_PATH")


def get_db_path() -> str:
    """获取数据库路径"""
    global DB_PATH
    if DB_PATH:
        return DB_PATH

    # 默认路径
    home = os.path.expanduser("~")
    data_dir = os.path.join(home, ".personal-workstation", "data")
    os.makedirs(data_dir, exist_ok=True)
    DB_PATH = os.path.join(data_dir, "workstation.db")
    return DB_PATH


def get_connection() -> sqlite3.Connection:
    """获取数据库连接"""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db():
    """数据库连接上下文管理器"""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def execute_with_retry(conn, sql: str, params: tuple = (), max_retries: int = 3):
    """执行 SQL，支持重试（处理并发写入锁冲突）"""
    for i in range(max_retries):
        try:
            cursor = conn.execute(sql, params)
            return cursor
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and i < max_retries - 1:
                time.sleep(0.1 * (i + 1))
                continue
            raise


# ==================== FastAPI 应用 ====================

app = FastAPI(
    title="Personal Workstation Data Service",
    description="统一数据访问层 API",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Pydantic 模型 ====================

# 知识库
class KnowledgeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    embedding_model: str = "ollama"
    embedding_model_name: str = "nomic-embed-text"


class KnowledgeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


# 对话
class ConversationCreate(BaseModel):
    title: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    model_id: Optional[int] = None
    model_name: Optional[str] = None


# 消息
class MessageCreate(BaseModel):
    conversation_id: int
    role: str
    content: str
    tokens_used: Optional[int] = None
    timestamp: int
    metadata: Optional[Dict[str, Any]] = None


# 记忆
class MemorySave(BaseModel):
    memory_type: str
    memory_key: str
    memory_value: str
    source_conversation_id: Optional[int] = None
    confidence: float = 1.0


# 用户资料
class UserProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birthday: Optional[str] = None
    gender: Optional[int] = None
    bio: Optional[str] = None


# ==================== 健康检查 ====================

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "db_path": get_db_path()
    }


# ==================== 知识库 API ====================

@app.get("/api/knowledge/list")
async def list_knowledge():
    """获取知识库列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, name, description, embedding_model, embedding_model_name,
                   document_count, total_chunks, storage_path, created_at, updated_at
            FROM knowledge ORDER BY updated_at DESC
        """)
        rows = cursor.fetchall()
        return {
            "success": True,
            "data": [dict(row) for row in rows]
        }


@app.get("/api/knowledge/{knowledge_id}")
async def get_knowledge(knowledge_id: str):
    """获取知识库详情"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, name, description, embedding_model, embedding_model_name,
                   document_count, total_chunks, storage_path, created_at, updated_at
            FROM knowledge WHERE id = ?
        """, (knowledge_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="知识库不存在")
        return {"success": True, "data": dict(row)}


@app.post("/api/knowledge/create")
async def create_knowledge(data: KnowledgeCreate):
    """创建知识库"""
    import uuid

    knowledge_id = f"kb_{uuid.uuid4().hex}"
    now = int(time.time() * 1000)
    # 存储路径：~/.personal-workstation/knowledge-files/{knowledge_id}/
    storage_path = f"knowledge-files/{knowledge_id}"

    with get_db() as conn:
        try:
            conn.execute("""
                INSERT INTO knowledge 
                (id, name, description, embedding_model, embedding_model_name, storage_path, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (knowledge_id, data.name, data.description,
                  data.embedding_model, data.embedding_model_name, storage_path, now, now))
            conn.commit()

            return {
                "success": True,
                "data": {
                    "id": knowledge_id,
                    "name": data.name,
                    "description": data.description,
                    "embedding_model": data.embedding_model,
                    "embedding_model_name": data.embedding_model_name,
                    "document_count": 0,
                    "total_chunks": 0,
                    "storage_path": storage_path,
                    "created_at": now,
                    "updated_at": now
                }
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/knowledge/{knowledge_id}")
async def update_knowledge(knowledge_id: str, data: KnowledgeUpdate):
    """更新知识库"""
    now = int(time.time() * 1000)

    with get_db() as conn:
        updates = []
        params = []

        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name)
        if data.description is not None:
            updates.append("description = ?")
            params.append(data.description)

        if not updates:
            return await get_knowledge(knowledge_id)

        updates.append("updated_at = ?")
        params.extend([now, knowledge_id])

        conn.execute(
            f"UPDATE knowledge SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

        return await get_knowledge(knowledge_id)


@app.delete("/api/knowledge/{knowledge_id}")
async def delete_knowledge(knowledge_id: str):
    """删除知识库"""
    with get_db() as conn:
        # 删除关联文档
        conn.execute(
            "DELETE FROM knowledge_documents WHERE knowledge_id = ?", (knowledge_id,))
        # 删除知识库
        cursor = conn.execute(
            "DELETE FROM knowledge WHERE id = ?", (knowledge_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="知识库不存在")

        return {"success": True, "message": "知识库已删除"}


@app.get("/api/knowledge/{knowledge_id}/documents")
async def list_knowledge_documents(knowledge_id: str):
    """获取知识库文档列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, knowledge_id, file_name, file_path, file_type, 
                   file_size, chunk_count, created_at
            FROM knowledge_documents WHERE knowledge_id = ?
            ORDER BY created_at DESC
        """, (knowledge_id,))
        rows = cursor.fetchall()
        return {"success": True, "data": [dict(row) for row in rows]}


# ==================== 对话 API ====================

@app.get("/api/conversations")
async def list_conversations():
    """获取对话列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, title, model_id, model_name, message_count, created_at, updated_at
            FROM conversations ORDER BY updated_at DESC
        """)
        rows = cursor.fetchall()
        return {"success": True, "data": [dict(row) for row in rows]}


@app.get("/api/conversations/grouped")
async def get_grouped_conversations():
    """获取分组后的对话列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, title, model_id, model_name, message_count, created_at, updated_at
            FROM conversations ORDER BY updated_at DESC
        """)
        rows = cursor.fetchall()
        conversations = [dict(row) for row in rows]

    # 分组逻辑
    now = datetime.now()
    today = datetime(now.year, now.month, now.day)
    yesterday = datetime(today.year, today.month, today.day - 1)
    week_ago = datetime(today.year, today.month, today.day - 7)

    groups = {"今天": [], "昨天": [], "本周": [], "更早": []}

    for conv in conversations:
        updated_at = datetime.fromisoformat(conv["updated_at"])
        if updated_at >= today:
            groups["今天"].append(conv)
        elif updated_at >= yesterday:
            groups["昨天"].append(conv)
        elif updated_at >= week_ago:
            groups["本周"].append(conv)
        else:
            groups["更早"].append(conv)

    result = [{"label": label, "conversations": items}
              for label, items in groups.items() if items]

    return {"success": True, "data": result}


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: int):
    """获取对话详情"""
    with get_db() as conn:
        # 获取对话信息
        cursor = conn.execute("""
            SELECT id, title, model_id, model_name, message_count, created_at, updated_at
            FROM conversations WHERE id = ?
        """, (conversation_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="对话不存在")

        conversation = dict(row)

        # 获取消息列表
        cursor = conn.execute("""
            SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at, metadata
            FROM messages WHERE conversation_id = ?
            ORDER BY timestamp ASC
        """, (conversation_id,))
        messages = [dict(row) for row in cursor.fetchall()]

        # 解析 metadata
        for msg in messages:
            if msg["metadata"]:
                try:
                    msg["metadata"] = json.loads(msg["metadata"])
                except:
                    msg["metadata"] = None

        conversation["messages"] = messages

        return {"success": True, "data": conversation}


@app.post("/api/conversations")
async def create_conversation(data: ConversationCreate):
    """创建对话"""
    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO conversations (title, model_id, model_name)
            VALUES (?, ?, ?)
        """, (data.title, data.model_id, data.model_name))
        conn.commit()

        conversation_id = cursor.lastrowid

        # 返回创建的对话
        cursor = conn.execute("""
            SELECT id, title, model_id, model_name, message_count, created_at, updated_at
            FROM conversations WHERE id = ?
        """, (conversation_id,))
        row = cursor.fetchone()

        return {"success": True, "data": dict(row)}


@app.put("/api/conversations/{conversation_id}")
async def update_conversation(conversation_id: int, data: ConversationUpdate):
    """更新对话"""
    with get_db() as conn:
        updates = []
        params = []

        if data.title is not None:
            updates.append("title = ?")
            params.append(data.title)
        if data.model_id is not None:
            updates.append("model_id = ?")
            params.append(data.model_id)
        if data.model_name is not None:
            updates.append("model_name = ?")
            params.append(data.model_name)

        if updates:
            updates.append("updated_at = datetime('now', 'localtime')")
            params.append(conversation_id)
            conn.execute(
                f"UPDATE conversations SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()

        return await get_conversation(conversation_id)


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int):
    """删除对话"""
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM conversations WHERE id = ?", (conversation_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="对话不存在")

        return {"success": True, "message": "对话已删除"}


# ==================== 消息 API ====================

@app.get("/api/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: int, limit: Optional[int] = Query(None)):
    """获取对话消息"""
    with get_db() as conn:
        sql = """
            SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at, metadata
            FROM messages WHERE conversation_id = ?
        """
        params = [conversation_id]

        if limit:
            sql += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            cursor = conn.execute(sql, params)
            messages = [dict(row) for row in cursor.fetchall()]
            # 反转顺序，按时间正序
            messages.reverse()
        else:
            sql += " ORDER BY timestamp ASC"
            cursor = conn.execute(sql, params)
            messages = [dict(row) for row in cursor.fetchall()]

        # 解析 metadata
        for msg in messages:
            if msg["metadata"]:
                try:
                    msg["metadata"] = json.loads(msg["metadata"])
                except:
                    msg["metadata"] = None

        return {"success": True, "data": messages}


@app.post("/api/conversations/{conversation_id}/messages")
async def add_message(conversation_id: int, data: MessageCreate):
    """添加消息"""
    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO messages (conversation_id, role, content, tokens_used, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (conversation_id, data.role, data.content,
              data.tokens_used, data.timestamp,
              json.dumps(data.metadata) if data.metadata else None))

        message_id = cursor.lastrowid

        # 更新对话消息数和更新时间
        conn.execute("""
            UPDATE conversations 
            SET message_count = message_count + 1, updated_at = datetime('now', 'localtime')
            WHERE id = ?
        """, (conversation_id,))
        conn.commit()

        # 返回创建的消息
        cursor = conn.execute("""
            SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at, metadata
            FROM messages WHERE id = ?
        """, (message_id,))
        row = cursor.fetchone()
        msg = dict(row)
        if msg["metadata"]:
            try:
                msg["metadata"] = json.loads(msg["metadata"])
            except:
                msg["metadata"] = None

        return {"success": True, "data": msg}


# ==================== 记忆 API ====================

@app.get("/api/memories")
async def get_memories(memory_type: Optional[str] = Query(None)):
    """获取记忆列表"""
    with get_db() as conn:
        if memory_type:
            cursor = conn.execute("""
                SELECT id, memory_type, memory_key, memory_value, 
                       source_conversation_id, confidence, created_at, updated_at
                FROM user_memory WHERE memory_type = ?
                ORDER BY updated_at DESC
            """, (memory_type,))
        else:
            cursor = conn.execute("""
                SELECT id, memory_type, memory_key, memory_value, 
                       source_conversation_id, confidence, created_at, updated_at
                FROM user_memory ORDER BY updated_at DESC
            """)

        rows = cursor.fetchall()
        return {"success": True, "data": [dict(row) for row in rows]}


@app.post("/api/memories")
async def save_memory(data: MemorySave):
    """保存记忆"""
    now = int(time.time() * 1000)

    with get_db() as conn:
        # 检查是否已存在
        cursor = conn.execute(
            "SELECT id FROM user_memory WHERE memory_type = ? AND memory_key = ?",
            (data.memory_type, data.memory_key)
        )
        existing = cursor.fetchone()

        if existing:
            # 更新
            conn.execute("""
                UPDATE user_memory 
                SET memory_value = ?, confidence = ?, updated_at = ?
                WHERE id = ?
            """, (data.memory_value, data.confidence, now, existing["id"]))
            memory_id = existing["id"]
        else:
            # 创建
            cursor = conn.execute("""
                INSERT INTO user_memory 
                (memory_type, memory_key, memory_value, source_conversation_id, confidence, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (data.memory_type, data.memory_key, data.memory_value,
                  data.source_conversation_id, data.confidence, now, now))
            memory_id = cursor.lastrowid

        conn.commit()

        # 返回保存的记忆
        cursor = conn.execute("""
            SELECT id, memory_type, memory_key, memory_value, 
                   source_conversation_id, confidence, created_at, updated_at
            FROM user_memory WHERE id = ?
        """, (memory_id,))
        row = cursor.fetchone()

        return {"success": True, "data": dict(row)}


@app.delete("/api/memories/{memory_id}")
async def delete_memory(memory_id: int):
    """删除记忆"""
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM user_memory WHERE id = ?", (memory_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="记忆不存在")

        return {"success": True, "message": "记忆已删除"}


# ==================== 摘要 API ====================

class SummaryCreate(BaseModel):
    conversation_id: int
    start_message_id: int
    end_message_id: int
    summary: str
    key_topics: List[str] = []
    message_count: int


@app.get("/api/summaries")
async def get_summaries(
    conversation_id: Optional[int] = Query(None),
    limit: Optional[int] = Query(None)
):
    """获取摘要列表"""
    with get_db() as conn:
        if conversation_id:
            cursor = conn.execute("""
                SELECT id, conversation_id, start_message_id, end_message_id,
                       summary, key_topics, message_count, created_at
                FROM conversation_summaries
                WHERE conversation_id = ?
                ORDER BY created_at DESC
            """, (conversation_id,))
        elif limit:
            cursor = conn.execute("""
                SELECT id, conversation_id, start_message_id, end_message_id,
                       summary, key_topics, message_count, created_at
                FROM conversation_summaries
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))
        else:
            cursor = conn.execute("""
                SELECT id, conversation_id, start_message_id, end_message_id,
                       summary, key_topics, message_count, created_at
                FROM conversation_summaries
                ORDER BY created_at DESC
            """)

        summaries = [dict(row) for row in cursor.fetchall()]

        # 解析 key_topics
        for s in summaries:
            if s["key_topics"]:
                try:
                    s["key_topics"] = json.loads(s["key_topics"])
                except:
                    s["key_topics"] = []

        return {"success": True, "data": summaries}


@app.post("/api/summaries")
async def create_summary(data: SummaryCreate):
    """创建对话摘要"""
    now = int(time.time() * 1000)

    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO conversation_summaries 
            (conversation_id, start_message_id, end_message_id, summary, key_topics, message_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data.conversation_id, data.start_message_id, data.end_message_id,
              data.summary, json.dumps(data.key_topics), data.message_count, now))
        summary_id = cursor.lastrowid
        conn.commit()

        # 返回创建的摘要
        cursor = conn.execute("""
            SELECT id, conversation_id, start_message_id, end_message_id,
                   summary, key_topics, message_count, created_at
            FROM conversation_summaries WHERE id = ?
        """, (summary_id,))
        row = cursor.fetchone()
        result = dict(row)
        result["key_topics"] = data.key_topics

        return {"success": True, "data": result}


@app.get("/api/memories/context")
async def build_memory_context():
    """构建记忆上下文"""
    with get_db() as conn:
        # 获取所有记忆
        cursor = conn.execute("""
            SELECT id, memory_type, memory_key, memory_value, 
                   source_conversation_id, confidence, created_at, updated_at
            FROM user_memory ORDER BY updated_at DESC
        """)
        memories = [dict(row) for row in cursor.fetchall()]

        # 获取最近摘要
        cursor = conn.execute("""
            SELECT id, conversation_id, start_message_id, end_message_id,
                   summary, key_topics, message_count, created_at
            FROM conversation_summaries ORDER BY created_at DESC LIMIT 3
        """)
        summaries = [dict(row) for row in cursor.fetchall()]

        # 解析 key_topics
        for s in summaries:
            if s["key_topics"]:
                try:
                    s["key_topics"] = json.loads(s["key_topics"])
                except:
                    s["key_topics"] = []

    # 构建上下文提示
    context_prompt = _build_context_prompt(memories, summaries)

    return {
        "success": True,
        "data": {
            "memories": memories,
            "summaries": summaries,
            "context_prompt": context_prompt
        }
    }


def _build_context_prompt(memories: List[Dict], summaries: List[Dict]) -> str:
    """构建上下文提示文本"""
    parts = []

    # 按类型分组记忆
    memories_by_type: Dict[str, List[Dict]] = {}
    for m in memories:
        t = m["memory_type"]
        if t not in memories_by_type:
            memories_by_type[t] = []
        memories_by_type[t].append(m)

    type_labels = {
        "preference": "用户偏好",
        "project": "项目信息",
        "task": "任务进度",
        "fact": "重要事实",
        "context": "上下文"
    }

    # 添加各类型记忆
    for mem_type, mems in memories_by_type.items():
        label = type_labels.get(mem_type, mem_type)
        items = [f"- {m['memory_key']}: {m['memory_value']}" for m in mems]
        if items:
            parts.append(f"**{label}**\n" + "\n".join(items))

    # 添加历史摘要
    if summaries:
        summary_texts = [f"- {s['summary']}" for s in summaries]
        parts.append(f"**历史对话摘要**\n" + "\n".join(summary_texts))

    return "\n\n".join(parts)


# ==================== 用户 API ====================

@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    """获取用户信息"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, username, nickname, avatar, email, phone, 
                   birthday, gender, bio, created_at, updated_at, last_login_at, settings
            FROM users WHERE id = ?
        """, (user_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")

        return {"success": True, "data": dict(row)}


@app.put("/api/users/{user_id}")
async def update_user_profile(user_id: int, data: UserProfileUpdate):
    """更新用户资料"""
    with get_db() as conn:
        updates = []
        params = []

        if data.nickname is not None:
            updates.append("nickname = ?")
            params.append(data.nickname)
        if data.avatar is not None:
            updates.append("avatar = ?")
            params.append(data.avatar)
        if data.email is not None:
            updates.append("email = ?")
            params.append(data.email)
        if data.phone is not None:
            updates.append("phone = ?")
            params.append(data.phone)
        if data.birthday is not None:
            updates.append("birthday = ?")
            params.append(data.birthday)
        if data.gender is not None:
            updates.append("gender = ?")
            params.append(data.gender)
        if data.bio is not None:
            updates.append("bio = ?")
            params.append(data.bio)

        if not updates:
            return await get_user(user_id)

        updates.append("updated_at = datetime('now', 'localtime')")
        params.append(user_id)

        conn.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()

        return await get_user(user_id)


# ==================== 直接调用接口（供 Agent 使用）====================

# 这些函数可以直接在 Python 进程内调用，无需 HTTP
# Agent 可以直接导入并使用这些函数

def direct_list_knowledge() -> List[Dict[str, Any]]:
    """直接调用：获取知识库列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, name, description, embedding_model, embedding_model_name,
                   document_count, total_chunks, storage_path, created_at, updated_at
            FROM knowledge ORDER BY updated_at DESC
        """)
        return [dict(row) for row in cursor.fetchall()]


def direct_get_knowledge(knowledge_id: str) -> Optional[Dict[str, Any]]:
    """直接调用：获取知识库详情"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, name, description, embedding_model, embedding_model_name,
                   document_count, total_chunks, storage_path, created_at, updated_at
            FROM knowledge WHERE id = ?
        """, (knowledge_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def direct_create_knowledge(
    name: str,
    description: Optional[str] = None,
    embedding_model: str = "ollama",
    embedding_model_name: str = "nomic-embed-text"
) -> Dict[str, Any]:
    """直接调用：创建知识库"""
    import uuid

    knowledge_id = f"kb_{uuid.uuid4().hex}"
    now = int(time.time() * 1000)
    # 存储路径：~/.personal-workstation/knowledge-files/{knowledge_id}/
    storage_path = f"knowledge-files/{knowledge_id}"

    with get_db() as conn:
        conn.execute("""
            INSERT INTO knowledge 
            (id, name, description, embedding_model, embedding_model_name, storage_path, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (knowledge_id, name, description,
              embedding_model, embedding_model_name, storage_path, now, now))
        conn.commit()

        return {
            "id": knowledge_id,
            "name": name,
            "description": description,
            "embedding_model": embedding_model,
            "embedding_model_name": embedding_model_name,
            "document_count": 0,
            "total_chunks": 0,
            "storage_path": storage_path,
            "created_at": now,
            "updated_at": now
        }


def direct_list_conversations() -> List[Dict[str, Any]]:
    """直接调用：获取对话列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, title, model_id, model_name, message_count, created_at, updated_at
            FROM conversations ORDER BY updated_at DESC
        """)
        return [dict(row) for row in cursor.fetchall()]


def direct_get_conversation(conversation_id: int) -> Optional[Dict[str, Any]]:
    """直接调用：获取对话详情"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, title, model_id, model_name, message_count, created_at, updated_at
            FROM conversations WHERE id = ?
        """, (conversation_id,))
        row = cursor.fetchone()
        if not row:
            return None

        conversation = dict(row)

        cursor = conn.execute("""
            SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at, metadata
            FROM messages WHERE conversation_id = ?
            ORDER BY timestamp ASC
        """, (conversation_id,))
        messages = [dict(row) for row in cursor.fetchall()]

        for msg in messages:
            if msg["metadata"]:
                try:
                    msg["metadata"] = json.loads(msg["metadata"])
                except:
                    msg["metadata"] = None

        conversation["messages"] = messages
        return conversation


def direct_get_messages(conversation_id: int, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """直接调用：获取消息列表"""
    with get_db() as conn:
        if limit:
            cursor = conn.execute("""
                SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at, metadata
                FROM messages WHERE conversation_id = ?
                ORDER BY timestamp DESC LIMIT ?
            """, (conversation_id, limit))
            messages = [dict(row) for row in cursor.fetchall()]
            messages.reverse()
        else:
            cursor = conn.execute("""
                SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at, metadata
                FROM messages WHERE conversation_id = ?
                ORDER BY timestamp ASC
            """, (conversation_id,))
            messages = [dict(row) for row in cursor.fetchall()]

        for msg in messages:
            if msg["metadata"]:
                try:
                    msg["metadata"] = json.loads(msg["metadata"])
                except:
                    msg["metadata"] = None

        return messages


def direct_get_memories(memory_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """直接调用：获取记忆列表"""
    with get_db() as conn:
        if memory_type:
            cursor = conn.execute("""
                SELECT id, memory_type, memory_key, memory_value, 
                       source_conversation_id, confidence, created_at, updated_at
                FROM user_memory WHERE memory_type = ?
                ORDER BY updated_at DESC
            """, (memory_type,))
        else:
            cursor = conn.execute("""
                SELECT id, memory_type, memory_key, memory_value, 
                       source_conversation_id, confidence, created_at, updated_at
                FROM user_memory ORDER BY updated_at DESC
            """)
        return [dict(row) for row in cursor.fetchall()]


def direct_save_memory(
    memory_type: str,
    memory_key: str,
    memory_value: str,
    source_conversation_id: Optional[int] = None,
    confidence: float = 1.0
) -> Dict[str, Any]:
    """直接调用：保存记忆"""
    now = int(time.time() * 1000)

    with get_db() as conn:
        cursor = conn.execute(
            "SELECT id FROM user_memory WHERE memory_type = ? AND memory_key = ?",
            (memory_type, memory_key)
        )
        existing = cursor.fetchone()

        if existing:
            conn.execute("""
                UPDATE user_memory 
                SET memory_value = ?, confidence = ?, updated_at = ?
                WHERE id = ?
            """, (memory_value, confidence, now, existing["id"]))
            memory_id = existing["id"]
        else:
            cursor = conn.execute("""
                INSERT INTO user_memory 
                (memory_type, memory_key, memory_value, source_conversation_id, confidence, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (memory_type, memory_key, memory_value,
                  source_conversation_id, confidence, now, now))
            memory_id = cursor.lastrowid

        conn.commit()

        cursor = conn.execute("""
            SELECT id, memory_type, memory_key, memory_value, 
                   source_conversation_id, confidence, created_at, updated_at
            FROM user_memory WHERE id = ?
        """, (memory_id,))
        return dict(cursor.fetchone())


def direct_build_memory_context() -> Dict[str, Any]:
    """直接调用：构建记忆上下文"""
    memories = direct_get_memories()

    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, conversation_id, start_message_id, end_message_id,
                   summary, key_topics, message_count, created_at
            FROM conversation_summaries ORDER BY created_at DESC LIMIT 3
        """)
        summaries = [dict(row) for row in cursor.fetchall()]

    for s in summaries:
        if s["key_topics"]:
            try:
                s["key_topics"] = json.loads(s["key_topics"])
            except:
                s["key_topics"] = []

    context_prompt = _build_context_prompt(memories, summaries)

    return {
        "memories": memories,
        "summaries": summaries,
        "context_prompt": context_prompt
    }


# ==================== 启动入口 ====================

def run_http_server(host: str = "127.0.0.1", port: int = 8766):
    """运行 HTTP 服务"""
    import uvicorn
    logger.info(f"启动 HTTP 数据服务: http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    run_http_server()
