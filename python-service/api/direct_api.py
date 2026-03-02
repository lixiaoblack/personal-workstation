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


# ==================== Todo 待办直接调用 ====================

def direct_list_todo_categories() -> List[Dict[str, Any]]:
    """直接调用：获取待办分类列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, name, description, color, icon, sort_order,
                   float_window_enabled, float_window_x, float_window_y,
                   float_window_width, float_window_height, float_window_always_on_top,
                   created_at, updated_at
            FROM todo_categories
            ORDER BY sort_order ASC, created_at ASC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def direct_get_todo_category(category_id: int) -> Optional[Dict[str, Any]]:
    """直接调用：获取单个待办分类"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, name, description, color, icon, sort_order,
                   float_window_enabled, float_window_x, float_window_y,
                   float_window_width, float_window_height, float_window_always_on_top,
                   created_at, updated_at
            FROM todo_categories WHERE id = ?
        """, (category_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def direct_create_todo(
    title: str,
    description: Optional[str] = None,
    category_id: Optional[int] = None,
    priority: str = "medium",
    status: str = "pending",
    due_date: Optional[int] = None,
    reminder_time: Optional[int] = None,
    repeat_type: str = "none",
    repeat_config: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    直接调用：创建待办事项

    Args:
        title: 待办标题（必填）
        description: 待办描述
        category_id: 分类 ID
        priority: 优先级 (low/medium/high/urgent)
        status: 状态 (pending/in_progress/completed/cancelled)
        due_date: 截止时间（毫秒时间戳）
        reminder_time: 提醒时间（毫秒时间戳）
        repeat_type: 重复类型 (none/daily/weekly/monthly/yearly)
        repeat_config: 重复配置
        tags: 标签列表

    Returns:
        创建的待办事项
    """
    now = int(time.time() * 1000)

    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO todos 
            (title, description, category_id, priority, status, due_date, 
             reminder_time, repeat_type, repeat_config, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            title,
            description,
            category_id,
            priority,
            status,
            due_date,
            reminder_time,
            repeat_type,
            json.dumps(repeat_config) if repeat_config else None,
            json.dumps(tags) if tags else None,
            now,
            now
        ))
        todo_id = cursor.lastrowid
        conn.commit()

        # 返回创建的待办
        todo = direct_get_todo(todo_id)

        # 同步到向量存储（后台执行）
        if todo:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # 在后台线程中同步
                    import concurrent.futures
                    executor = concurrent.futures.ThreadPoolExecutor(
                        max_workers=1)
                    executor.submit(
                        asyncio.run, direct_sync_todo_to_vectorstore(todo_id))
                else:
                    loop.run_until_complete(
                        direct_sync_todo_to_vectorstore(todo_id))
            except:
                pass

        return todo


def direct_get_todo(todo_id: int) -> Optional[Dict[str, Any]]:
    """直接调用：获取单个待办事项"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, title, description, category_id, priority, status,
                   due_date, reminder_time, repeat_type, repeat_config,
                   parent_id, tags, sort_order, completed_at, created_at, updated_at
            FROM todos WHERE id = ?
        """, (todo_id,))
        row = cursor.fetchone()
        if not row:
            return None

        todo = dict(row)
        # 解析 JSON 字段
        if todo.get("repeat_config"):
            try:
                todo["repeat_config"] = json.loads(todo["repeat_config"])
            except:
                todo["repeat_config"] = None
        if todo.get("tags"):
            try:
                todo["tags"] = json.loads(todo["tags"])
            except:
                todo["tags"] = []

        return todo


def direct_list_todos(
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    直接调用：获取待办事项列表

    Args:
        category_id: 分类 ID 过滤
        status: 状态过滤
        priority: 优先级过滤
        limit: 返回数量限制

    Returns:
        待办事项列表
    """
    with get_db() as conn:
        query = """
            SELECT id, title, description, category_id, priority, status,
                   due_date, reminder_time, repeat_type, repeat_config,
                   parent_id, tags, sort_order, completed_at, created_at, updated_at
            FROM todos WHERE 1=1
        """
        params = []

        if category_id is not None:
            query += " AND category_id = ?"
            params.append(category_id)
        if status:
            query += " AND status = ?"
            params.append(status)
        if priority:
            query += " AND priority = ?"
            params.append(priority)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor = conn.execute(query, params)
        rows = cursor.fetchall()

        todos = []
        for row in rows:
            todo = dict(row)
            if todo.get("repeat_config"):
                try:
                    todo["repeat_config"] = json.loads(todo["repeat_config"])
                except:
                    todo["repeat_config"] = None
            if todo.get("tags"):
                try:
                    todo["tags"] = json.loads(todo["tags"])
                except:
                    todo["tags"] = []
            todos.append(todo)

        return todos


def direct_get_today_todos() -> List[Dict[str, Any]]:
    """直接调用：获取今日待办（未完成的今日截止或逾期的）"""
    import datetime

    # 获取今天开始和结束的时间戳
    today = datetime.datetime.now().replace(
        hour=0, minute=0, second=0, microsecond=0)
    today_end = int((today + datetime.timedelta(days=1)).timestamp() * 1000)

    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, title, description, category_id, priority, status,
                   due_date, reminder_time, repeat_type, repeat_config,
                   parent_id, tags, sort_order, completed_at, created_at, updated_at
            FROM todos 
            WHERE status != 'completed' 
            AND status != 'cancelled'
            AND due_date IS NOT NULL
            AND due_date < ?
            ORDER BY due_date ASC, priority DESC
        """, (today_end,))
        rows = cursor.fetchall()

        todos = []
        for row in rows:
            todo = dict(row)
            if todo.get("repeat_config"):
                try:
                    todo["repeat_config"] = json.loads(todo["repeat_config"])
                except:
                    todo["repeat_config"] = None
            if todo.get("tags"):
                try:
                    todo["tags"] = json.loads(todo["tags"])
                except:
                    todo["tags"] = []
            todos.append(todo)

        return todos


def direct_update_todo_status(todo_id: int, status: str) -> Optional[Dict[str, Any]]:
    """直接调用：更新待办状态"""
    now = int(time.time() * 1000)

    with get_db() as conn:
        # 如果是完成状态，记录完成时间
        completed_at = now if status == "completed" else None

        conn.execute("""
            UPDATE todos SET status = ?, completed_at = ?, updated_at = ?
            WHERE id = ?
        """, (status, completed_at, now, todo_id))
        conn.commit()

        todo = direct_get_todo(todo_id)

        # 同步到向量存储
        if todo:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # 在后台线程中同步
                    import concurrent.futures
                    executor = concurrent.futures.ThreadPoolExecutor(
                        max_workers=1)
                    executor.submit(
                        asyncio.run, direct_sync_todo_to_vectorstore(todo_id))
                else:
                    loop.run_until_complete(
                        direct_sync_todo_to_vectorstore(todo_id))
            except:
                pass

        return todo


async def direct_sync_todo_to_vectorstore(todo_id: int) -> bool:
    """
    直接调用：同步待办到向量存储

    Args:
        todo_id: 待办 ID

    Returns:
        是否同步成功
    """
    try:
        todo = direct_get_todo(todo_id)
        if not todo:
            return False

        # 获取分类名称
        category_name = None
        if todo.get("category_id"):
            category = direct_get_todo_category(todo["category_id"])
            if category:
                category_name = category.get("name")

        # 同步到向量存储
        from rag.todo_vectorstore import get_todo_vectorstore
        store = get_todo_vectorstore()

        return await store.add_todo(todo, category_name)

    except Exception as e:
        import logging
        logging.error(f"[direct_api] 同步待办到向量存储失败: {e}")
        return False


async def direct_sync_all_todos_to_vectorstore() -> int:
    """
    直接调用：同步所有待办到向量存储

    Returns:
        同步成功的数量
    """
    try:
        todos = direct_list_todos(limit=1000)
        categories = direct_list_todo_categories()

        # 构建分类 ID 到名称的映射
        category_map = {cat["id"]: cat["name"] for cat in categories}

        from rag.todo_vectorstore import get_todo_vectorstore
        store = get_todo_vectorstore()

        count = 0
        for todo in todos:
            category_name = category_map.get(todo.get("category_id"))
            if await store.add_todo(todo, category_name):
                count += 1

        return count

    except Exception as e:
        import logging
        logging.error(f"[direct_api] 同步所有待办到向量存储失败: {e}")
        return 0


# ==================== 笔记向量存储直接调用 ====================

async def direct_index_note(
    file_path: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> int:
    """
    直接调用：索引笔记到向量存储

    Args:
        file_path: 文件路径
        content: Markdown 内容
        metadata: 额外元数据（如 modified_at）

    Returns:
        索引的块数量
    """
    try:
        from rag.notes_vectorstore import get_notes_vectorstore
        store = get_notes_vectorstore()

        return await store.index_note(file_path, content, metadata)

    except Exception as e:
        import logging
        logging.error(f"[direct_api] 索引笔记失败: {e}")
        return 0


async def direct_delete_note_from_vectorstore(file_path: str) -> bool:
    """
    直接调用：从向量存储删除笔记

    Args:
        file_path: 文件路径

    Returns:
        是否删除成功
    """
    try:
        from rag.notes_vectorstore import get_notes_vectorstore
        store = get_notes_vectorstore()

        return await store.delete_note(file_path)

    except Exception as e:
        import logging
        logging.error(f"[direct_api] 删除笔记向量失败: {e}")
        return False


async def direct_search_notes(
    query: str,
    k: int = 5,
    file_path_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    直接调用：语义搜索笔记

    Args:
        query: 搜索查询
        k: 返回数量
        file_path_filter: 文件路径过滤

    Returns:
        搜索结果列表
    """
    try:
        from rag.notes_vectorstore import get_notes_vectorstore
        store = get_notes_vectorstore()

        return await store.search(query, k, file_path_filter)

    except Exception as e:
        import logging
        logging.error(f"[direct_api] 搜索笔记失败: {e}")
        return []


async def direct_get_notes_stats() -> Dict[str, Any]:
    """
    直接调用：获取笔记索引统计

    Returns:
        统计信息
    """
    try:
        from rag.notes_vectorstore import get_notes_vectorstore
        store = get_notes_vectorstore()

        return await store.get_notes_stats()

    except Exception as e:
        import logging
        logging.error(f"[direct_api] 获取笔记统计失败: {e}")
        return {
            "total_chunks": 0,
            "total_files": 0,
            "indexed": False,
            "error": str(e)
        }
