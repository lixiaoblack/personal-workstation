"""
记忆和摘要 API 路由
"""

import json
import time
from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException, Query

from ..database import get_db
from ..models import MemorySave, SummaryCreate

router = APIRouter(tags=["记忆"])


# ==================== 记忆管理 ====================

@router.get("/api/memories")
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


@router.post("/api/memories")
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


@router.delete("/api/memories/{memory_id}")
async def delete_memory(memory_id: int):
    """删除记忆"""
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM user_memory WHERE id = ?", (memory_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="记忆不存在")

        return {"success": True, "message": "记忆已删除"}


# ==================== 摘要管理 ====================

@router.get("/api/summaries")
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


@router.post("/api/summaries")
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


# ==================== 记忆上下文 ====================

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


@router.get("/api/memories/context")
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

    context_prompt = _build_context_prompt(memories, summaries)

    return {
        "success": True,
        "data": {
            "memories": memories,
            "summaries": summaries,
            "context_prompt": context_prompt
        }
    }
