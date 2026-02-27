"""
OCR 识别服务

基于 RapidOCR 实现图片文字识别功能，支持：
- 中英文混合识别
- Base64 图片数据识别
- 文件路径识别
- 结构化返回结果（文字内容、置信度、位置坐标）

RapidOCR 优势：
- 移除 PaddlePaddle 依赖，改用 ONNX Runtime
- 跨平台兼容性好，打包简单
- 识别效果与 PaddleOCR 相当（使用相同模型）

使用示例：
    from ocr_service import OcrService

    # 获取单例实例
    ocr = OcrService.get_instance()

    # 识别图片文件
    result = ocr.recognize_image("/path/to/image.png")

    # 识别 Base64 数据
    result = ocr.recognize_base64("data:image/png;base64,...")
"""

import os
import base64
import logging
import tempfile
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class OcrResult:
    """
    OCR 识别结果

    Attributes:
        success: 是否识别成功
        text: 识别的文字内容（纯文本）
        blocks: 识别的文字块列表，每个块包含：
            - text: 文字内容
            - confidence: 置信度 (0-1)
            - box: 边界框坐标 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        error: 错误信息
    """
    success: bool = True
    text: str = ""
    blocks: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "success": self.success,
            "text": self.text,
            "blocks": self.blocks,
            "error": self.error
        }


class OcrService:
    """
    OCR 识别服务（单例模式）

    封装 RapidOCR 的初始化和识别逻辑，支持：
    - 延迟加载模型（首次使用时加载）
    - 单例模式避免重复初始化
    - 中英文混合识别
    - 打包环境下优雅降级（OCR 不可用但不影响其他功能）
    """

    _instance: Optional['OcrService'] = None
    _ocr: Optional[Any] = None
    _init_error: Optional[str] = None  # 记录初始化错误

    def __new__(cls):
        """单例模式：确保全局只有一个实例"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_instance(cls) -> 'OcrService':
        """获取单例实例"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_ocr(self):
        """
        延迟加载 RapidOCR 模型

        首次调用时加载模型，模型文件会自动下载到用户目录。
        模型大小约 100MB，首次加载可能需要几秒钟。

        注意：在打包环境下，如果 ONNX Runtime 不可用，返回 None
        """
        if self._ocr is None and self._init_error is None:
            try:
                logger.info("[OcrService] 正在初始化 RapidOCR 模型...")

                from rapidocr_onnxruntime import RapidOCR

                # 初始化 RapidOCR
                # 默认使用 PP-OCRv4 模型，支持中英文混合识别
                self._ocr = RapidOCR()

                logger.info("[OcrService] RapidOCR 模型初始化完成")

            except ImportError as e:
                error_msg = f"RapidOCR 未安装: {e}"
                logger.warning(f"[OcrService] {error_msg}")
                self._init_error = "OCR 功能不可用：RapidOCR 未安装。请运行: pip install rapidocr-onnxruntime"
            except Exception as e:
                error_msg = str(e)
                if "No module named" in error_msg:
                    logger.warning(f"[OcrService] 模块缺失: {e}")
                    self._init_error = f"OCR 功能不可用：缺少依赖 - {error_msg}"
                elif "onnxruntime" in error_msg.lower():
                    logger.warning(f"[OcrService] ONNX Runtime 错误: {e}")
                    self._init_error = "OCR 功能不可用：ONNX Runtime 初始化失败"
                else:
                    logger.error(f"[OcrService] RapidOCR 初始化失败: {e}")
                    self._init_error = f"OCR 初始化失败: {error_msg}"

        return self._ocr

    def recognize_image(self, image_path: str) -> OcrResult:
        """
        识别图片文件中的文字

        Args:
            image_path: 图片文件路径

        Returns:
            OcrResult: 识别结果
        """
        # 检查 OCR 是否可用
        ocr = self._get_ocr()
        if ocr is None:
            error_msg = self._init_error or "OCR 服务不可用"
            logger.warning(f"[OcrService] {error_msg}")
            return OcrResult(
                success=False,
                error=error_msg
            )

        # 检查文件是否存在
        if not os.path.exists(image_path):
            logger.error(f"[OcrService] 图片文件不存在: {image_path}")
            return OcrResult(
                success=False,
                error=f"图片文件不存在: {image_path}"
            )

        # 检查文件格式
        valid_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.webp', '.gif'}
        ext = os.path.splitext(image_path)[1].lower()
        if ext not in valid_extensions:
            logger.error(f"[OcrService] 不支持的图片格式: {ext}")
            return OcrResult(
                success=False,
                error=f"不支持的图片格式: {ext}，支持: {valid_extensions}"
            )

        try:
            logger.info(f"[OcrService] 正在识别图片: {image_path}")

            # 执行 OCR 识别
            # RapidOCR 返回格式: (result, elapsed_time)
            # result 是一个列表，每个元素是 [box, text, confidence]
            result, elapsed = ocr(image_path)

            # 解析结果
            return self._parse_ocr_result(result)

        except Exception as e:
            error_msg = f"OCR 识别失败: {str(e)}"
            logger.error(f"[OcrService] {error_msg}")
            return OcrResult(success=False, error=error_msg)

    def recognize_base64(self, base64_data: str) -> OcrResult:
        """
        识别 Base64 编码的图片数据

        Args:
            base64_data: Base64 编码的图片数据
                支持两种格式：
                - 带 Data URL 前缀: "data:image/png;base64,..."
                - 纯 Base64 数据: "iVBORw0KGgo..."

        Returns:
            OcrResult: 识别结果
        """
        try:
            # 解析 Base64 数据
            if base64_data.startswith('data:'):
                # 移除 Data URL 前缀
                # 格式: data:image/png;base64,xxxxx
                base64_data = base64_data.split(',', 1)[1]

            # 解码 Base64
            image_bytes = base64.b64decode(base64_data)

            # 保存为临时文件
            with tempfile.NamedTemporaryFile(
                suffix='.png',
                delete=False
            ) as temp_file:
                temp_file.write(image_bytes)
                temp_path = temp_file.name

            try:
                # 识别临时文件
                result = self.recognize_image(temp_path)
                return result
            finally:
                # 清理临时文件
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        except Exception as e:
            error_msg = f"Base64 图片解析失败: {str(e)}"
            logger.error(f"[OcrService] {error_msg}")
            return OcrResult(success=False, error=error_msg)

    def recognize_bytes(self, image_bytes: bytes) -> OcrResult:
        """
        识别图片字节数据

        Args:
            image_bytes: 图片的字节数据

        Returns:
            OcrResult: 识别结果
        """
        try:
            # 保存为临时文件
            with tempfile.NamedTemporaryFile(
                suffix='.png',
                delete=False
            ) as temp_file:
                temp_file.write(image_bytes)
                temp_path = temp_file.name

            try:
                result = self.recognize_image(temp_path)
                return result
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        except Exception as e:
            error_msg = f"图片字节数据识别失败: {str(e)}"
            logger.error(f"[OcrService] {error_msg}")
            return OcrResult(success=False, error=error_msg)

    def _parse_ocr_result(self, result: Any) -> OcrResult:
        """
        解析 RapidOCR 的原始输出结果

        RapidOCR 返回格式：
        [
            [box, text, confidence],
            ...
        ]
        其中 box 是 numpy 数组: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]

        Args:
            result: RapidOCR 原始输出（列表或 None）

        Returns:
            OcrResult: 标准化的识别结果
        """
        if not result:
            return OcrResult(
                success=True,
                text="",
                blocks=[]
            )

        blocks = []
        text_parts = []

        for item in result:
            if item is None or len(item) < 3:
                continue

            # 解析边界框和文字
            box = item[0]  # numpy 数组 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            text = item[1]  # 文字内容
            confidence = item[2]  # 置信度

            # 转换 box 为列表格式
            if hasattr(box, 'tolist'):
                box_list = box.tolist()
            else:
                box_list = list(box)

            blocks.append({
                "text": text,
                "confidence": float(confidence),
                "box": box_list
            })

            text_parts.append(text)

        # 合并所有文字，用换行分隔
        full_text = "\n".join(text_parts)

        logger.info(f"[OcrService] 识别完成，共 {len(blocks)} 个文字块")

        return OcrResult(
            success=True,
            text=full_text,
            blocks=blocks
        )

    def is_available(self) -> bool:
        """
        检查 OCR 服务是否可用

        Returns:
            bool: True 表示可用
        """
        ocr = self._get_ocr()
        return ocr is not None

    def get_error_message(self) -> Optional[str]:
        """
        获取 OCR 初始化错误信息

        Returns:
            str: 错误信息，如果没有错误则返回 None
        """
        return self._init_error


# ==================== 便捷函数 ====================

def ocr_recognize_image(image_path: str) -> Dict[str, Any]:
    """
    识别图片文件（便捷函数）

    Args:
        image_path: 图片文件路径

    Returns:
        识别结果字典
    """
    service = OcrService.get_instance()
    result = service.recognize_image(image_path)
    return result.to_dict()


def ocr_recognize_base64(base64_data: str) -> Dict[str, Any]:
    """
    识别 Base64 图片数据（便捷函数）

    Args:
        base64_data: Base64 编码的图片数据

    Returns:
        识别结果字典
    """
    service = OcrService.get_instance()
    result = service.recognize_base64(base64_data)
    return result.to_dict()
