"""
PDF API 路由
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pdf", tags=["PDF"])


# ==================== 请求模型 ====================

class PdfParseRequest(BaseModel):
    """PDF 解析请求 - Base64 数据"""
    pdf_base64: str
    use_ocr: bool = False


class PdfParseFileRequest(BaseModel):
    """PDF 解析请求 - 文件路径"""
    file_path: str
    use_ocr: bool = False


# ==================== API 端点 ====================

@router.post("/parse")
async def pdf_parse(data: PdfParseRequest):
    """
    解析 PDF - 接受 Base64 数据

    返回结构化数据：
    - success: 是否成功
    - fileName: 文件名
    - totalPages: 总页数
    - pages: 页面数据列表
    - isScanned: 是否为扫描版
    """
    try:
        from pdf_service import parse_pdf_base64

        result = parse_pdf_base64(data.pdf_base64, data.use_ocr)
        return {"success": True, "data": result}

    except Exception as e:
        logger.error(f"PDF 解析失败: {e}")
        return {"success": False, "error": str(e)}


@router.post("/parse-file")
async def pdf_parse_file(data: PdfParseFileRequest):
    """
    解析 PDF - 接受文件路径

    Args:
        file_path: PDF 文件路径
        use_ocr: 是否强制使用 OCR 模式

    Returns:
        结构化解析结果
    """
    try:
        from pdf_service import parse_pdf_file

        result = parse_pdf_file(data.file_path, data.use_ocr)
        return {"success": True, "data": result}

    except Exception as e:
        logger.error(f"PDF 解析失败: {e}")
        return {"success": False, "error": str(e)}


@router.get("/status")
async def pdf_status():
    """
    获取 PDF 服务状态

    返回 PDF 服务是否可用
    """
    try:
        from pdf_service import PdfService

        service = PdfService.get_instance()

        # 尝试加载 PyMuPDF
        fitz = service._get_fitz()

        if fitz:
            return {
                "success": True,
                "data": {
                    "available": True,
                    "message": "PDF 服务可用"
                }
            }
        else:
            return {
                "success": True,
                "data": {
                    "available": False,
                    "message": service._init_error or "PDF 服务不可用"
                }
            }

    except Exception as e:
        return {
            "success": True,
            "data": {
                "available": False,
                "message": f"PDF 服务初始化失败: {str(e)}"
            }
        }
