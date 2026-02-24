"""
直接调用接口（供 Agent 使用）

这些函数可以直接在 Python 进程内调用，无需 HTTP。
Agent 可以直接导入并使用这些函数。
"""

import json
import time
import uuid
from typing import Optional, List, Dict, Any

from .database import get_db


# ==================== 知识库直接调用 ====================

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
    knowledge_id = f"kb_{uuid.uuid4().hex}"
    now = int(time.time() * 1000)
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


# ==================== 对话直接调用 ====================

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


# ==================== 记忆直接调用 ====================

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

    from .routers.memory import _build_context_prompt
    context_prompt = _build_context_prompt(memories, summaries)

    return {
        "memories": memories,
        "summaries": summaries,
        "context_prompt": context_prompt
    }


# ==================== OCR 直接调用 ====================

def direct_ocr_recognize(image_base64: str) -> Dict[str, Any]:
    """直接调用：OCR 识别 Base64 图片"""
    try:
        from ocr_service import ocr_recognize_base64
        return ocr_recognize_base64(image_base64)
    except Exception as e:
        return {"success": False, "error": str(e)}


def direct_ocr_recognize_file(file_path: str) -> Dict[str, Any]:
    """直接调用：OCR 识别图片文件"""
    try:
        from ocr_service import ocr_recognize_image
        return ocr_recognize_image(file_path)
    except Exception as e:
        return {"success": False, "error": str(e)}


# ==================== 知识库文档直接调用 ====================

def direct_list_knowledge_documents(knowledge_id: str) -> List[Dict[str, Any]]:
    """
    直接调用：获取知识库文档列表

    Args:
        knowledge_id: 知识库 ID

    Returns:
        文档列表，包含 id, fileName, filePath, fileType, fileSize, chunkCount, ocrText, ocrBlocks 等
    """
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, knowledge_id, file_name, file_path, file_type, 
                   file_size, chunk_count, ocr_text, ocr_blocks, created_at
            FROM knowledge_documents WHERE knowledge_id = ?
            ORDER BY created_at DESC
        """, (knowledge_id,))
        rows = cursor.fetchall()

        # 转换为前端期望的格式
        documents = []
        for row in rows:
            documents.append({
                "id": row["id"],
                "knowledgeId": row["knowledge_id"],
                "fileName": row["file_name"],
                "filePath": row["file_path"],
                "fileType": row["file_type"],
                "fileSize": row["file_size"],
                "chunkCount": row["chunk_count"],
                "ocrText": row["ocr_text"],
                "ocrBlocks": row["ocr_blocks"],
                "createdAt": row["created_at"],
            })

        return documents
