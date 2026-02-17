"""
文档处理模块

支持多种文档格式的解析：
1. Markdown (.md)
2. PDF (.pdf)
3. 纯文本 (.txt)
4. JSON (.json)
5. HTML (.html)

使用示例：
    from rag.document_processor import DocumentProcessor
    
    processor = DocumentProcessor()
    
    # 处理单个文件
    documents = processor.process_file("/path/to/document.pdf")
    
    # 处理目录
    documents = processor.process_directory("/path/to/docs", recursive=True)
"""

import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ProcessedDocument:
    """处理后的文档"""
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "content": self.content,
            "metadata": self.metadata,
        }


class DocumentProcessor:
    """
    文档处理器

    支持格式：
    - Markdown (.md)
    - PDF (.pdf) - 需要 pypdf
    - 纯文本 (.txt)
    - JSON (.json)
    - HTML (.html) - 需要 beautifulsoup4

    功能：
    - 提取文档内容
    - 提取元数据（文件名、路径、大小、时间等）
    - 支持批量处理目录
    """

    SUPPORTED_EXTENSIONS = {
        ".md": "markdown",
        ".markdown": "markdown",
        ".pdf": "pdf",
        ".txt": "text",
        ".json": "json",
        ".html": "html",
        ".htm": "html",
    }

    def __init__(self, encoding: str = "utf-8"):
        """
        初始化文档处理器

        Args:
            encoding: 文件编码
        """
        self._encoding = encoding
        self._pdf_reader = None
        self._html_parser = None

    def _get_pdf_reader(self):
        """延迟加载 PDF 解析器"""
        if self._pdf_reader is None:
            try:
                from pypdf import PdfReader
                self._pdf_reader = PdfReader
            except ImportError:
                logger.warning("pypdf 未安装，PDF 解析功能不可用")
                return None
        return self._pdf_reader

    def _get_html_parser(self):
        """延迟加载 HTML 解析器"""
        if self._html_parser is None:
            try:
                from bs4 import BeautifulSoup
                self._html_parser = BeautifulSoup
            except ImportError:
                logger.warning("beautifulsoup4 未安装，HTML 解析功能不可用")
                return None
        return self._html_parser

    def get_file_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        获取文件元数据

        Args:
            file_path: 文件路径

        Returns:
            元数据字典
        """
        path = Path(file_path)

        stat = path.stat()

        return {
            "file_name": path.name,
            "file_path": str(path.absolute()),
            "file_ext": path.suffix.lower(),
            "file_size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        }

    def is_supported(self, file_path: str) -> bool:
        """
        检查文件是否支持

        Args:
            file_path: 文件路径

        Returns:
            是否支持
        """
        ext = Path(file_path).suffix.lower()
        return ext in self.SUPPORTED_EXTENSIONS

    def process_file(self, file_path: str) -> List[ProcessedDocument]:
        """
        处理单个文件

        Args:
            file_path: 文件路径

        Returns:
            处理后的文档列表（一个文件可能产生多个文档块）
        """
        if not os.path.exists(file_path):
            logger.error(f"文件不存在: {file_path}")
            return []

        ext = Path(file_path).suffix.lower()
        file_type = self.SUPPORTED_EXTENSIONS.get(ext)

        if not file_type:
            logger.warning(f"不支持的文件格式: {ext}")
            return []

        # 获取元数据
        metadata = self.get_file_metadata(file_path)
        metadata["file_type"] = file_type

        try:
            # 根据类型选择处理方法
            processor = getattr(self, f"_process_{file_type}", None)
            if processor:
                contents = processor(file_path)
            else:
                logger.warning(f"未实现的处理方法: {file_type}")
                return []

            # 创建文档对象
            documents = []
            for i, content in enumerate(contents):
                doc_metadata = metadata.copy()
                if len(contents) > 1:
                    doc_metadata["chunk_index"] = i
                    doc_metadata["total_chunks"] = len(contents)

                documents.append(ProcessedDocument(
                    content=content,
                    metadata=doc_metadata,
                ))

            logger.info(
                f"处理文件: {file_path}, 类型: {file_type}, 文档数: {len(documents)}")
            return documents

        except Exception as e:
            logger.error(f"处理文件失败: {file_path}, 错误: {e}")
            return []

    def _process_text(self, file_path: str) -> List[str]:
        """处理纯文本文件"""
        with open(file_path, "r", encoding=self._encoding, errors="ignore") as f:
            content = f.read()
        return [content]

    def _process_markdown(self, file_path: str) -> List[str]:
        """
        处理 Markdown 文件

        按标题分块，保持内容结构完整
        """
        with open(file_path, "r", encoding=self._encoding, errors="ignore") as f:
            content = f.read()

        # 按一级和二级标题分块
        sections = re.split(r'\n(?=#{1,2}\s)', content)

        # 过滤空内容
        sections = [s.strip() for s in sections if s.strip()]

        # 如果没有标题，返回整个内容
        if not sections:
            return [content]

        return sections

    def _process_pdf(self, file_path: str) -> List[str]:
        """处理 PDF 文件"""
        PdfReader = self._get_pdf_reader()
        if not PdfReader:
            return []

        try:
            reader = PdfReader(file_path)
            contents = []

            for page_num, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    contents.append(text.strip())

            return contents

        except Exception as e:
            logger.error(f"PDF 解析失败: {file_path}, 错误: {e}")
            return []

    def _process_json(self, file_path: str) -> List[str]:
        """处理 JSON 文件"""
        with open(file_path, "r", encoding=self._encoding, errors="ignore") as f:
            data = json.load(f)

        # 将 JSON 转换为文本
        if isinstance(data, str):
            return [data]
        elif isinstance(data, (list, dict)):
            # 格式化 JSON 为文本
            text = json.dumps(data, ensure_ascii=False, indent=2)
            return [text]
        else:
            return [str(data)]

    def _process_html(self, file_path: str) -> List[str]:
        """处理 HTML 文件"""
        BeautifulSoup = self._get_html_parser()
        if not BeautifulSoup:
            return []

        with open(file_path, "r", encoding=self._encoding, errors="ignore") as f:
            html_content = f.read()

        try:
            soup = BeautifulSoup(html_content, "lxml")

            # 移除脚本和样式
            for element in soup(["script", "style", "nav", "footer", "header"]):
                element.decompose()

            # 提取文本
            text = soup.get_text(separator="\n")

            # 清理空白行
            lines = [line.strip()
                     for line in text.splitlines() if line.strip()]
            content = "\n".join(lines)

            return [content]

        except Exception as e:
            logger.error(f"HTML 解析失败: {file_path}, 错误: {e}")
            return []

    def process_directory(
        self,
        directory: str,
        recursive: bool = False,
        extensions: Optional[List[str]] = None,
    ) -> List[ProcessedDocument]:
        """
        处理目录下所有支持的文件

        Args:
            directory: 目录路径
            recursive: 是否递归处理子目录
            extensions: 指定处理的扩展名列表

        Returns:
            处理后的文档列表
        """
        if not os.path.isdir(directory):
            logger.error(f"目录不存在: {directory}")
            return []

        documents = []
        dir_path = Path(directory)

        # 获取要处理的扩展名
        if extensions:
            exts = [e.lower() if e.startswith(
                ".") else f".{e.lower()}" for e in extensions]
        else:
            exts = list(self.SUPPORTED_EXTENSIONS.keys())

        # 获取文件列表
        if recursive:
            files = []
            for ext in exts:
                files.extend(dir_path.rglob(f"*{ext}"))
        else:
            files = []
            for ext in exts:
                files.extend(dir_path.glob(f"*{ext}"))

        # 处理每个文件
        for file_path in files:
            docs = self.process_file(str(file_path))
            documents.extend(docs)

        logger.info(
            f"处理目录: {directory}, 文件数: {len(files)}, 文档数: {len(documents)}")
        return documents

    def get_supported_extensions(self) -> List[str]:
        """获取支持的文件扩展名列表"""
        return list(self.SUPPORTED_EXTENSIONS.keys())
