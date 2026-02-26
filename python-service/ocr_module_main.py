#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OCR 模块独立入口

这是一个独立的 OCR 服务，可以单独打包为可执行文件。
提供 HTTP API 接口供主 Python 服务调用。

使用方法:
    python ocr_module_main.py --port 8767

API 端点:
    GET  /health         - 健康检查
    POST /recognize      - 识别图片
    POST /recognize/file - 识别图片文件
"""

import argparse
import base64
import json
import logging
import os
import sys
import tempfile
from typing import Optional, Dict, Any, List

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# 尝试导入 FastAPI
try:
    from fastapi import FastAPI, HTTPException, File, UploadFile, Form
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel
    import uvicorn
except ImportError as e:
    logger.error(f"缺少依赖: {e}")
    logger.error("请运行: pip install fastapi uvicorn python-multipart")
    sys.exit(1)

# 尝试导入 OCR 服务
try:
    from ocr_service import OcrService, OcrResult
except ImportError:
    # 如果导入失败，定义一个简化版本
    logger.warning("无法导入 ocr_service，使用内置实现")

    class OcrResult:
        def __init__(self, success: bool = True, text: str = "", blocks: List = None, error: str = None):
            self.success = success
            self.text = text
            self.blocks = blocks or []
            self.error = error

        def to_dict(self):
            return {
                "success": self.success,
                "text": self.text,
                "blocks": self.blocks,
                "error": self.error
            }

    class OcrService:
        _instance = None
        _ocr = None
        _init_error = None

        @classmethod
        def get_instance(cls):
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

        def _get_ocr(self):
            if self._ocr is None and self._init_error is None:
                try:
                    from paddleocr import PaddleOCR
                    # 禁用模型源检查，加快启动速度
                    os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'
                    logger.info("[OcrService] 正在初始化 PaddleOCR 模型...")
                    self._ocr = PaddleOCR(
                        use_angle_cls=True,
                        lang='ch',
                        show_log=False
                    )
                    logger.info("[OcrService] PaddleOCR 模型初始化完成")
                except ImportError as e:
                    self._init_error = f"PaddleOCR 未安装: {e}"
                    logger.error(self._init_error)
                except Exception as e:
                    self._init_error = f"PaddleOCR 初始化失败: {e}"
                    logger.error(self._init_error)
            return self._ocr

        def recognize_image(self, image_path: str) -> OcrResult:
            ocr = self._get_ocr()
            if ocr is None:
                return OcrResult(success=False, error=self._init_error or "OCR 服务不可用")

            if not os.path.exists(image_path):
                return OcrResult(success=False, error=f"图片文件不存在: {image_path}")

            try:
                result = ocr.ocr(image_path, cls=True)
                return self._parse_ocr_result(result)
            except Exception as e:
                return OcrResult(success=False, error=f"OCR 识别失败: {e}")

        def recognize_base64(self, base64_data: str) -> OcrResult:
            try:
                if base64_data.startswith('data:'):
                    base64_data = base64_data.split(',', 1)[1]

                image_bytes = base64.b64decode(base64_data)

                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                    f.write(image_bytes)
                    temp_path = f.name

                try:
                    return self.recognize_image(temp_path)
                finally:
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
            except Exception as e:
                return OcrResult(success=False, error=f"Base64 解析失败: {e}")

        def _parse_ocr_result(self, result) -> OcrResult:
            if not result or result[0] is None:
                return OcrResult(success=True, text="", blocks=[])

            blocks = []
            text_parts = []

            for line in result[0]:
                if line is None:
                    continue

                box = line[0]
                text_info = line[1]

                if text_info and len(text_info) >= 2:
                    text = text_info[0]
                    confidence = float(text_info[1])

                    blocks.append({
                        "text": text,
                        "confidence": confidence,
                        "box": box
                    })
                    text_parts.append(text)

            return OcrResult(
                success=True,
                text="\n".join(text_parts),
                blocks=blocks
            )

        def is_available(self) -> bool:
            return self._get_ocr() is not None

        def get_error_message(self) -> Optional[str]:
            return self._init_error


# ==================== FastAPI 应用 ====================

app = FastAPI(
    title="OCR Module",
    description="OCR 文字识别模块 - 基于 PaddleOCR",
    version="1.0.0"
)


class RecognizeRequest(BaseModel):
    """识别请求"""
    image: str  # Base64 编码的图片数据
    options: Optional[Dict[str, Any]] = None


class RecognizeResponse(BaseModel):
    """识别响应"""
    success: bool
    text: str = ""
    blocks: List[Dict[str, Any]] = []
    error: Optional[str] = None


@app.get("/health")
async def health_check():
    """健康检查"""
    service = OcrService.get_instance()
    available = service.is_available()
    error = service.get_error_message()

    return {
        "status": "ok" if available else "degraded",
        "ocr_available": available,
        "error": error
    }


@app.post("/recognize", response_model=RecognizeResponse)
async def recognize_image(request: RecognizeRequest):
    """
    识别 Base64 编码的图片

    Args:
        request: 包含 Base64 编码图片的请求

    Returns:
        识别结果
    """
    service = OcrService.get_instance()
    result = service.recognize_base64(request.image)

    return RecognizeResponse(
        success=result.success,
        text=result.text,
        blocks=result.blocks,
        error=result.error
    )


@app.post("/recognize/file", response_model=RecognizeResponse)
async def recognize_file(file: UploadFile = File(...)):
    """
    识别上传的图片文件

    Args:
        file: 上传的图片文件

    Returns:
        识别结果
    """
    # 保存临时文件
    suffix = os.path.splitext(file.filename or "image.png")[1] or ".png"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        content = await file.read()
        f.write(content)
        temp_path = f.name

    try:
        service = OcrService.get_instance()
        result = service.recognize_image(temp_path)

        return RecognizeResponse(
            success=result.success,
            text=result.text,
            blocks=result.blocks,
            error=result.error
        )
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


@app.get("/status")
async def get_status():
    """获取 OCR 服务状态"""
    service = OcrService.get_instance()
    available = service.is_available()
    error = service.get_error_message()

    return {
        "available": available,
        "message": "OCR 服务可用" if available else (error or "OCR 服务不可用")
    }


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="OCR 模块服务")
    parser.add_argument(
        "--port",
        type=int,
        default=8767,
        help="服务端口 (默认: 8767)"
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="服务地址 (默认: 127.0.0.1)"
    )

    args = parser.parse_args()

    logger.info(f"启动 OCR 模块服务: {args.host}:{args.port}")

    # 预热 OCR 模型
    logger.info("预热 OCR 模型...")
    service = OcrService.get_instance()
    if service.is_available():
        logger.info("OCR 模型预热完成")
    else:
        logger.warning(f"OCR 模型预热失败: {service.get_error_message()}")

    # 启动服务
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="info"
    )


if __name__ == "__main__":
    main()
