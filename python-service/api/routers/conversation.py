"""
对话和消息 API 路由
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..database import get_db
from ..models import ConversationCreate, ConversationUpdate, MessageCreate

router = APIRouter(tags=["对话"])


# ==================== 对话管理 ====================

@router.get("/api/conversations")
async def list_conversations():
    """获取对话列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, title, model_id, model_name, message_count, created_at, updated_at
            FROM conversations ORDER BY updated_at DESC
        """)
        rows = cursor.fetchall()
        return {"success": True, "data": [dict(row) for row in rows]}


@router.get("/api/conversations/grouped")
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
    from datetime import timedelta
    now = datetime.now()
    today = datetime(now.year, now.month, now.day)
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)

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


@router.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: int):
    """获取对话详情"""
    with get_db() as conn:
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


@router.post("/api/conversations")
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


@router.put("/api/conversations/{conversation_id}")
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


@router.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int):
    """删除对话"""
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM conversations WHERE id = ?", (conversation_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="对话不存在")

        return {"success": True, "message": "对话已删除"}


# ==================== 消息管理 ====================

@router.get("/api/conversations/{conversation_id}/messages")
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


@router.post("/api/conversations/{conversation_id}/messages")
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
