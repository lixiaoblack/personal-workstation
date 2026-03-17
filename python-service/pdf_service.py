"""
PDF 解析服务

基于 PyMuPDF 实现文档解析，支持：
- 文本提取 + 坐标信息
- 结构化分析（标题/段落识别）
- 扫描版 PDF OCR 支持

使用示例：
    from pdf_service import PdfService

    # 获取单例实例
    pdf = PdfService.get_instance()

    # 解析 PDF 文件
    result = pdf.parse_pdf("/path/to/document.pdf")
"""

import os
import base64
import logging
import tempfile
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class PdfBlock:
    """
    PDF 文本块

    Attributes:
        id: 块唯一标识
        type: 块类型 (title, heading1, heading2, paragraph, list)
        text: 文本内容
        bbox: 边界框坐标 [x0, y0, x1, y1]
        pageNumber: 页码
        fontSize: 字体大小
        confidence: OCR 置信度（扫描版 PDF）
    """
    id: str
    type: str
    text: str
    bbox: List[float]
    pageNumber: int
    fontSize: float = 0.0
    confidence: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "type": self.type,
            "text": self.text,
            "bbox": self.bbox,
            "pageNumber": self.pageNumber,
            "fontSize": self.fontSize,
            "confidence": self.confidence
        }


@dataclass
class PdfPage:
    """
    PDF 页面数据

    Attributes:
        pageNumber: 页码
        width: 页面宽度
        height: 页面高度
        blocks: 文本块列表
    """
    pageNumber: int
    width: float
    height: float
    blocks: List[PdfBlock] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "pageNumber": self.pageNumber,
            "width": self.width,
            "height": self.height,
            "blocks": [block.to_dict() for block in self.blocks]
        }


@dataclass
class PdfParseResult:
    """
    PDF 解析结果

    Attributes:
        success: 是否解析成功
        fileName: 文件名
        totalPages: 总页数
        pages: 页面数据列表
        isScanned: 是否为扫描版 PDF
        error: 错误信息
    """
    success: bool = True
    fileName: str = ""
    totalPages: int = 0
    pages: List[PdfPage] = field(default_factory=list)
    isScanned: bool = False
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "success": self.success,
            "fileName": self.fileName,
            "totalPages": self.totalPages,
            "pages": [page.to_dict() for page in self.pages],
            "isScanned": self.isScanned,
            "error": self.error
        }


class PdfService:
    """
    PDF 解析服务（单例模式）

    封装 PyMuPDF 的解析逻辑，支持：
    - 文本型 PDF 解析
    - 扫描版 PDF OCR 解析
    - 结构化分析
    """

    _instance: Optional['PdfService'] = None
    _init_error: Optional[str] = None

    def __new__(cls):
        """单例模式：确保全局只有一个实例"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_instance(cls) -> 'PdfService':
        """获取单例实例"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_fitz(self):
        """
        延迟加载 PyMuPDF

        Returns:
            fitz 模块或 None
        """
        try:
            import fitz
            return fitz
        except ImportError as e:
            logger.error(f"[PdfService] PyMuPDF 未安装: {e}")
            self._init_error = "PDF 解析功能不可用：PyMuPDF 未安装。请运行: pip install pymupdf"
            return None

    def _get_ocr(self):
        """
        获取 OCR 服务

        Returns:
            OcrService 实例或 None
        """
        try:
            from ocr_service import OcrService
            ocr = OcrService.get_instance()
            if ocr.is_available():
                return ocr
            return None
        except ImportError:
            logger.warning("[PdfService] OCR 服务不可用")
            return None

    def parse_pdf(self, file_path: str, use_ocr: bool = False) -> PdfParseResult:
        """
        解析 PDF 文件

        Args:
            file_path: PDF 文件路径
            use_ocr: 是否强制使用 OCR 模式

        Returns:
            PdfParseResult: 解析结果
        """
        fitz = self._get_fitz()
        if fitz is None:
            return PdfParseResult(
                success=False,
                error=self._init_error or "PDF 服务不可用"
            )

        # 检查文件是否存在
        if not os.path.exists(file_path):
            logger.error(f"[PdfService] PDF 文件不存在: {file_path}")
            return PdfParseResult(
                success=False,
                error=f"PDF 文件不存在: {file_path}"
            )

        # 检查文件格式
        if not file_path.lower().endswith('.pdf'):
            logger.error(f"[PdfService] 不是 PDF 文件: {file_path}")
            return PdfParseResult(
                success=False,
                error="请上传 PDF 格式的文件"
            )

        try:
            logger.info(f"[PdfService] 正在解析 PDF: {file_path}")

            doc = fitz.open(file_path)
            file_name = os.path.basename(file_path)

            # 检测是否为扫描版 PDF
            is_scanned = self._detect_scanned_pdf(doc) if not use_ocr else True

            if is_scanned or use_ocr:
                logger.info("[PdfService] 检测到扫描版 PDF，使用 OCR 模式")
                result = self._parse_with_ocr(doc, file_name)
            else:
                result = self._parse_normal(doc, file_name)

            doc.close()
            return result

        except Exception as e:
            error_msg = f"PDF 解析失败: {str(e)}"
            logger.error(f"[PdfService] {error_msg}")
            return PdfParseResult(success=False, error=error_msg)

    def _detect_scanned_pdf(self, doc, sample_pages: int = 3) -> bool:
        """
        检测是否为扫描版 PDF（图片型）

        扫描版 PDF 特征：
        - 页面主要是图片
        - 文本内容很少或没有

        Args:
            doc: fitz.Document 对象
            sample_pages: 检测的样本页数

        Returns:
            bool: True 表示扫描版
        """
        total_pages = len(doc)
        check_pages = min(sample_pages, total_pages)

        total_text_length = 0
        total_image_count = 0

        for i in range(check_pages):
            page = doc[i]

            # 获取文本长度
            text = page.get_text()
            total_text_length += len(text.strip())

            # 获取图片数量
            images = page.get_images()
            total_image_count += len(images)

        # 判断标准：平均每页文本少于 100 字符，且有图片
        avg_text = total_text_length / check_pages
        avg_images = total_image_count / check_pages

        is_scanned = avg_text < 100 and avg_images > 0

        logger.debug(
            f"[PdfService] 扫描检测: 平均文本={avg_text:.1f}, 平均图片={avg_images:.1f}, 结果={is_scanned}")

        return is_scanned

    def _parse_normal(self, doc, file_name: str) -> PdfParseResult:
        """
        解析普通文本型 PDF

        改进：按文本块（block）合并，而不是按单个 span

        Args:
            doc: fitz.Document 对象
            file_name: 文件名

        Returns:
            PdfParseResult: 解析结果
        """
        pages = []

        # 第一遍：收集所有字体大小，计算平均值
        all_font_sizes = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            blocks = page.get_text("dict", flags=11)["blocks"]

            for block in blocks:
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    for span in line["spans"]:
                        if span["text"].strip():
                            all_font_sizes.append(span["size"])

        avg_font_size = sum(all_font_sizes) / \
            len(all_font_sizes) if all_font_sizes else 12
        logger.debug(f"[PdfService] 平均字体大小: {avg_font_size:.2f}")

        # 第二遍：解析每一页，按 block 合并文本
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_rect = page.rect

            pdf_page = PdfPage(
                pageNumber=page_num + 1,
                width=page_rect.width,
                height=page_rect.height
            )

            blocks = page.get_text("dict", flags=11)["blocks"]
            block_index = 0

            for block in blocks:
                if "lines" not in block:
                    continue

                # 合并同一 block 内的所有文本
                text_parts = []
                min_x, min_y = float('inf'), float('inf')
                max_x, max_y = 0, 0
                font_sizes = []

                for line in block["lines"]:
                    line_texts = []
                    for span in line["spans"]:
                        text = span["text"]
                        if text.strip():
                            line_texts.append(text)
                            font_sizes.append(span["size"])

                            # 更新边界框
                            x0, y0, x1, y1 = span["bbox"]
                            min_x = min(min_x, x0)
                            min_y = min(min_y, y0)
                            max_x = max(max_x, x1)
                            max_y = max(max_y, y1)

                    if line_texts:
                        text_parts.append("".join(line_texts))

                if not text_parts:
                    continue

                # 合并文本，保留换行
                full_text = "\n".join(text_parts).strip()
                if not full_text:
                    continue

                # 计算平均字体大小
                avg_block_font_size = sum(
                    font_sizes) / len(font_sizes) if font_sizes else avg_font_size

                # 根据字体大小判断类型
                block_type = self._classify_block_type(
                    avg_block_font_size, avg_font_size)

                # 创建合并后的块
                pdf_block = PdfBlock(
                    id=f"{page_num}_{block_index}",
                    type=block_type,
                    text=full_text,
                    bbox=[min_x, min_y, max_x, max_y],
                    pageNumber=page_num + 1,
                    fontSize=avg_block_font_size
                )

                pdf_page.blocks.append(pdf_block)
                block_index += 1

            pages.append(pdf_page)
            logger.debug(
                f"[PdfService] 第 {page_num + 1} 页解析完成，共 {len(pdf_page.blocks)} 个块")

        logger.info(f"[PdfService] PDF 解析完成，共 {len(pages)} 页")

        return PdfParseResult(
            success=True,
            fileName=file_name,
            totalPages=len(pages),
            pages=pages,
            isScanned=False
        )

    def _parse_with_ocr(self, doc, file_name: str) -> PdfParseResult:
        """
        使用 OCR 解析扫描版 PDF

        改进：合并相邻的文字块为完整段落

        Args:
            doc: fitz.Document 对象
            file_name: 文件名

        Returns:
            PdfParseResult: 解析结果
        """
        ocr = self._get_ocr()
        if ocr is None:
            logger.warning("[PdfService] OCR 服务不可用，尝试普通解析")
            return self._parse_normal(doc, file_name)

        pages = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            page_rect = page.rect

            pdf_page = PdfPage(
                pageNumber=page_num + 1,
                width=page_rect.width,
                height=page_rect.height
            )

            # 将页面渲染为图片
            # 使用 2x 缩放提高 OCR 识别率
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)

            # 转换为 PNG 字节
            img_bytes = pix.tobytes("png")

            # OCR 识别
            ocr_result = ocr.recognize_bytes(img_bytes)

            if ocr_result.success and ocr_result.blocks:
                # 转换坐标并按位置排序（从上到下，从左到右）
                ocr_blocks = []
                for block in ocr_result.blocks:
                    box = block["box"]
                    if box and len(box) >= 4:
                        # box 是四个点 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                        x_coords = [p[0] / 2 for p in box]  # 除以 2 转换回 PDF 坐标
                        y_coords = [p[1] / 2 for p in box]
                        min_x = min(x_coords)
                        min_y = min(y_coords)
                        max_x = max(x_coords)
                        max_y = max(y_coords)
                    else:
                        min_x, min_y, max_x, max_y = 0, 0, 0, 0

                    ocr_blocks.append({
                        "text": block["text"],
                        "bbox": [min_x, min_y, max_x, max_y],
                        "y_center": (min_y + max_y) / 2,
                        "x_left": min_x,
                        "confidence": block.get("confidence", 0)
                    })

                # 按 Y 坐标排序（从上到下），Y 相近时按 X 排序（从左到右）
                ocr_blocks.sort(key=lambda b: (b["y_center"], b["x_left"]))

                # 合并相邻的文字块
                merged_blocks = self._merge_ocr_blocks(
                    ocr_blocks, page_rect.height)

                # 创建最终的 PDF 块
                for block_index, merged in enumerate(merged_blocks):
                    pdf_block = PdfBlock(
                        id=f"{page_num}_{block_index}",
                        type=merged["type"],
                        text=merged["text"],
                        bbox=merged["bbox"],
                        pageNumber=page_num + 1,
                        confidence=merged.get("confidence", 0)
                    )
                    pdf_page.blocks.append(pdf_block)

            pages.append(pdf_page)
            logger.debug(
                f"[PdfService] OCR 第 {page_num + 1} 页完成，共 {len(pdf_page.blocks)} 个块")

        logger.info(f"[PdfService] OCR 解析完成，共 {len(pages)} 页")

        return PdfParseResult(
            success=True,
            fileName=file_name,
            totalPages=len(pages),
            pages=pages,
            isScanned=True
        )

    def _merge_ocr_blocks(self, ocr_blocks: list, page_height: float) -> list:
        """
        合并相邻的 OCR 文字块

        合并规则：
        1. Y 坐标相近（同一行）的文字块合并为一行
        2. 行间距较小时，多行合并为一个段落

        Args:
            ocr_blocks: 排序后的 OCR 块列表
            page_height: 页面高度

        Returns:
            合并后的块列表
        """
        if not ocr_blocks:
            return []

        # 计算平均行高
        heights = [b["bbox"][3] - b["bbox"][1] for b in ocr_blocks]
        avg_height = sum(heights) / len(heights) if heights else 12

        # 行合并阈值：Y 中心距离小于 0.5 倍行高认为是同一行
        line_threshold = avg_height * 0.5

        # 段落合并阈值：Y 距离小于 1.5 倍行高认为是同一段落
        paragraph_threshold = avg_height * 1.5

        # 第一步：按行合并
        lines = []
        current_line = [ocr_blocks[0]]
        current_y = ocr_blocks[0]["y_center"]

        for block in ocr_blocks[1:]:
            if abs(block["y_center"] - current_y) < line_threshold:
                # 同一行
                current_line.append(block)
                # 更新当前行的 Y 中心为平均值
                current_y = sum(b["y_center"]
                                for b in current_line) / len(current_line)
            else:
                # 新的一行
                lines.append(current_line)
                current_line = [block]
                current_y = block["y_center"]

        if current_line:
            lines.append(current_line)

        # 第二步：合并行为段落
        merged_blocks = []

        for line in lines:
            # 合并同一行的文字
            line.sort(key=lambda b: b["x_left"])  # 按从左到右排序
            line_text = " ".join(b["text"] for b in line)

            # 计算行的边界框
            min_x = min(b["bbox"][0] for b in line)
            min_y = min(b["bbox"][1] for b in line)
            max_x = max(b["bbox"][2] for b in line)
            max_y = max(b["bbox"][3] for b in line)
            avg_confidence = sum(b["confidence"] for b in line) / len(line)

            # 判断是否为标题（行高较大，或位于页面顶部且文字较短）
            line_height = max_y - min_y
            is_title = (
                line_height > avg_height * 1.3 or
                (min_y < page_height * 0.15 and len(line_text) < 50)
            )

            merged_blocks.append({
                "text": line_text,
                "bbox": [min_x, min_y, max_x, max_y],
                "y_top": min_y,
                "type": "title" if is_title else "paragraph",
                "confidence": avg_confidence
            })

        # 第三步：合并相邻的段落（可选，如果段落间距很小）
        # 这里暂不合并，保持按行分组

        return merged_blocks

    def _classify_block_type(self, font_size: float, avg_font_size: float) -> str:
        """
        根据字体大小判断块类型

        Args:
            font_size: 当前字体大小
            avg_font_size: 平均字体大小

        Returns:
            str: 块类型
        """
        if font_size > avg_font_size * 2:
            return "title"
        elif font_size > avg_font_size * 1.5:
            return "heading1"
        elif font_size > avg_font_size * 1.2:
            return "heading2"
        else:
            return "paragraph"

    def parse_base64(self, base64_data: str, use_ocr: bool = False) -> PdfParseResult:
        """
        解析 Base64 编码的 PDF 数据

        Args:
            base64_data: Base64 编码的 PDF 数据
            use_ocr: 是否强制使用 OCR 模式

        Returns:
            PdfParseResult: 解析结果
        """
        try:
            # 解析 Base64 数据
            if base64_data.startswith('data:'):
                base64_data = base64_data.split(',', 1)[1]

            # 解码 Base64
            pdf_bytes = base64.b64decode(base64_data)

            # 保存为临时文件
            with tempfile.NamedTemporaryFile(
                suffix='.pdf',
                delete=False
            ) as temp_file:
                temp_file.write(pdf_bytes)
                temp_path = temp_file.name

            try:
                result = self.parse_pdf(temp_path, use_ocr)
                return result
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        except Exception as e:
            error_msg = f"Base64 PDF 解析失败: {str(e)}"
            logger.error(f"[PdfService] {error_msg}")
            return PdfParseResult(success=False, error=error_msg)


# ==================== 便捷函数 ====================

def parse_pdf_file(file_path: str, use_ocr: bool = False) -> Dict[str, Any]:
    """
    解析 PDF 文件（便捷函数）

    Args:
        file_path: PDF 文件路径
        use_ocr: 是否强制使用 OCR 模式

    Returns:
        解析结果字典
    """
    service = PdfService.get_instance()
    result = service.parse_pdf(file_path, use_ocr)
    return result.to_dict()


def parse_pdf_base64(base64_data: str, use_ocr: bool = False) -> Dict[str, Any]:
    """
    解析 Base64 PDF 数据（便捷函数）

    Args:
        base64_data: Base64 编码的 PDF 数据
        use_ocr: 是否强制使用 OCR 模式

    Returns:
        解析结果字典
    """
    service = PdfService.get_instance()
    result = service.parse_base64(base64_data, use_ocr)
    return result.to_dict()
