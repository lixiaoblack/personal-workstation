"""
OCR API 路由
"""

import os
import uuid
import time
import logging

from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import OcrRecognizeRequest, OcrSaveToKnowledgeRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ocr", tags=["OCR"])


@router.post("/recognize")
async def ocr_recognize(data: OcrRecognizeRequest):
    """
    OCR 识别 - 接受 Base64 图片数据

    返回识别结果，包含：
    - success: 是否成功
    - text: 识别的完整文字内容
    - blocks: 文字块列表（含置信度和位置）
    """
    try:
        from ocr_service import ocr_recognize_base64

        result = ocr_recognize_base64(data.image_base64)
        return {"success": True, "data": result}

    except Exception as e:
        logger.error(f"OCR 识别失败: {e}")
        return {"success": False, "error": str(e)}


@router.post("/recognize-file")
async def ocr_recognize_file(file_path: str):
    """
    OCR 识别 - 接受文件路径

    Args:
        file_path: 图片文件路径

    Returns:
        识别结果
    """
    try:
        from ocr_service import ocr_recognize_image

        result = ocr_recognize_image(file_path)
        return {"success": True, "data": result}

    except Exception as e:
        logger.error(f"OCR 识别失败: {e}")
        return {"success": False, "error": str(e)}


@router.post("/save-to-knowledge")
async def ocr_save_to_knowledge(data: OcrSaveToKnowledgeRequest):
    """
    将 OCR 识别结果保存到知识库

    创建一个文本文档保存到指定知识库
    """
    try:
        from rag.vectorstore import VectorStore
        from rag.text_splitter import TextSplitter

        knowledge_id = data.knowledge_id
        title = data.title
        content = data.content

        # 获取知识库信息
        from ..routers.knowledge import get_knowledge
        knowledge = await get_knowledge(knowledge_id)
        if not knowledge.get("success"):
            raise HTTPException(status_code=404, detail="知识库不存在")

        # 创建文档记录
        doc_id = f"doc_{uuid.uuid4().hex}"
        now = int(time.time() * 1000)

        # 获取存储路径
        storage_path = knowledge["data"].get("storage_path", "")
        home = os.path.expanduser("~")
        base_dir = os.path.join(home, ".personal-workstation", storage_path)
        os.makedirs(base_dir, exist_ok=True)

        # 保存文本文件
        file_name = f"{title}.txt"
        file_path = os.path.join(base_dir, file_name)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        # 分块处理
        text_splitter = TextSplitter()
        chunks = text_splitter.split_text(content)

        # 向量化并存储
        vector_store = VectorStore(knowledge_id)
        chunk_count = 0
        for i, chunk in enumerate(chunks):
            chunk_metadata = {
                "source": title,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "created_at": now,
                "doc_type": "ocr_result"
            }
            vector_store.add_text(chunk, chunk_metadata)
            chunk_count += 1

        # 添加文档记录到数据库
        with get_db() as conn:
            conn.execute("""
                INSERT INTO knowledge_documents
                (id, knowledge_id, file_name, file_path, file_type, file_size, chunk_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (doc_id, knowledge_id, file_name, file_path, "text/plain",
                  len(content.encode('utf-8')), chunk_count, now))

            # 更新知识库统计
            conn.execute("""
                UPDATE knowledge
                SET document_count = document_count + 1,
                    total_chunks = total_chunks + ?,
                    updated_at = ?
                WHERE id = ?
            """, (chunk_count, now, knowledge_id))

            conn.commit()

        return {
            "success": True,
            "data": {
                "document_id": doc_id,
                "file_name": file_name,
                "chunk_count": chunk_count
            }
        }

    except Exception as e:
        logger.error(f"保存到知识库失败: {e}")
        return {"success": False, "error": str(e)}


@router.get("/status")
async def ocr_status():
    """
    获取 OCR 服务状态

    返回 OCR 服务是否可用
    """
    try:
        from ocr_service import OcrService

        service = OcrService.get_instance()
        available = service.is_available()
        error_message = service.get_error_message()

        if available:
            message = "OCR 服务可用"
        elif error_message:
            message = error_message
        else:
            message = "OCR 服务不可用，请检查 PaddleOCR 是否正确安装"

        return {
            "success": True,
            "data": {
                "available": available,
                "message": message
            }
        }
    except Exception as e:
        return {
            "success": True,
            "data": {
                "available": False,
                "message": f"OCR 服务初始化失败: {str(e)}"
            }
        }
