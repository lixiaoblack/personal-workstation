"""
知识库 API 路由
"""

import uuid
import time
from typing import Optional

from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import KnowledgeCreate, KnowledgeUpdate

router = APIRouter(prefix="/api/knowledge", tags=["知识库"])


@router.get("/list")
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


@router.get("/{knowledge_id}")
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


@router.post("/create")
async def create_knowledge(data: KnowledgeCreate):
    """创建知识库"""
    knowledge_id = f"kb_{uuid.uuid4().hex}"
    now = int(time.time() * 1000)
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


@router.put("/{knowledge_id}")
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


@router.delete("/{knowledge_id}")
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


@router.get("/{knowledge_id}/documents")
async def list_knowledge_documents(knowledge_id: str):
    """获取知识库文档列表"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, knowledge_id, file_name, file_path, file_type, 
                   file_size, chunk_count, ocr_text, ocr_blocks, created_at
            FROM knowledge_documents WHERE knowledge_id = ?
            ORDER BY created_at DESC
        """, (knowledge_id,))
        rows = cursor.fetchall()
        return {"success": True, "data": [dict(row) for row in rows]}
