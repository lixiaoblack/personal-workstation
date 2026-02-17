"""
文本分块策略模块

提供智能文本分块功能：
1. 按字符数或 token 数分块
2. 支持重叠窗口
3. 保留代码块完整性
4. 支持自定义分隔符

使用示例：
    from rag.text_splitter import SmartTextSplitter
    
    splitter = SmartTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    )
    
    # 分块文本
    chunks = splitter.split_text(long_text)
    
    # 分块文档
    chunks = splitter.split_documents(documents)
"""

import logging
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """文本块"""
    content: str
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "content": self.content,
            "metadata": self.metadata,
        }


class SmartTextSplitter:
    """
    智能文本分块器

    特性：
    1. 按字符数分块（近似 token 数）
    2. 支持重叠窗口，保持上下文连续性
    3. 优先按段落、句子分割
    4. 保留代码块完整性
    5. 支持自定义分隔符

    分块优先级：
    1. 双换行符（段落）
    2. 单换行符
    3. 句号、问号、感叹号
    4. 逗号、分号
    5. 空格
    6. 字符
    """

    # 默认分隔符优先级
    DEFAULT_SEPARATORS = [
        "\n\n",      # 段落
        "\n",        # 行
        "。",        # 中文句号
        "！",        # 中文感叹号
        "？",        # 中文问号
        "！",        # 中文感叹号
        ".",         # 英文句号
        "!",         # 英文感叹号
        "?",         # 英文问号
        "；",        # 中文分号
        "；",        # 中文分号
        ";",         # 英文分号
        "，",        # 中文逗号
        ",",         # 英文逗号
        " ",         # 空格
        "",          # 字符
    ]

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: Optional[List[str]] = None,
        keep_code_blocks: bool = True,
        length_function: Optional[callable] = None,
    ):
        """
        初始化分块器

        Args:
            chunk_size: 块大小（字符数）
            chunk_overlap: 重叠大小（字符数）
            separators: 自定义分隔符列表
            keep_code_blocks: 是否保持代码块完整性
            length_function: 自定义长度计算函数
        """
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._separators = separators or self.DEFAULT_SEPARATORS
        self._keep_code_blocks = keep_code_blocks
        self._length_function = length_function or len

    @property
    def chunk_size(self) -> int:
        """获取块大小"""
        return self._chunk_size

    @property
    def chunk_overlap(self) -> int:
        """获取重叠大小"""
        return self._chunk_overlap

    def _get_length(self, text: str) -> int:
        """获取文本长度"""
        return self._length_function(text)

    def _extract_code_blocks(self, text: str) -> List[Dict[str, Any]]:
        """
        提取代码块

        Args:
            text: 文本内容

        Returns:
            代码块列表 [{"start": int, "end": int, "content": str}, ...]
        """
        pattern = r'```[\s\S]*?```'
        matches = list(re.finditer(pattern, text))

        code_blocks = []
        for match in matches:
            code_blocks.append({
                "start": match.start(),
                "end": match.end(),
                "content": match.group(),
            })

        return code_blocks

    def _is_in_code_block(self, position: int, code_blocks: List[Dict[str, Any]]) -> bool:
        """检查位置是否在代码块内"""
        for block in code_blocks:
            if block["start"] <= position < block["end"]:
                return True
        return False

    def _split_text_with_separators(
        self,
        text: str,
        separators: List[str],
    ) -> List[str]:
        """
        使用分隔符分割文本

        Args:
            text: 文本
            separators: 分隔符列表

        Returns:
            分割后的文本列表
        """
        if not separators:
            return [text]

        separator = separators[0]

        if separator:
            # 提取代码块（如果需要保持完整性）
            code_blocks = []
            if self._keep_code_blocks and separator in ["\n\n", "\n"]:
                code_blocks = self._extract_code_blocks(text)

            # 分割
            if separator == "\n\n":
                splits = re.split(r'\n\s*\n', text)
            elif separator == "\n":
                splits = text.split("\n")
            else:
                splits = text.split(separator)

            # 处理分割结果
            result = []
            for split in splits:
                if split.strip():
                    result.append(split.strip() if separator in [
                                  "\n\n", "\n"] else split)

            return result
        else:
            # 最后一个分隔符，按字符分割
            return list(text)

    def _merge_splits(self, splits: List[str], separator: str) -> List[str]:
        """
        合并分割片段为块

        Args:
            splits: 分割片段
            separator: 分隔符

        Returns:
            合并后的块列表
        """
        chunks = []
        current_chunk = []
        current_length = 0

        for split in splits:
            split_length = self._get_length(split)
            separator_length = len(separator) if current_chunk else 0

            # 检查是否需要创建新块
            if current_length + separator_length + split_length > self._chunk_size:
                if current_chunk:
                    # 保存当前块
                    chunk_text = separator.join(current_chunk)
                    if chunk_text.strip():
                        chunks.append(chunk_text)

                    # 计算重叠
                    if self._chunk_overlap > 0:
                        # 从当前块中提取重叠部分
                        overlap_text = ""
                        overlap_length = 0

                        for s in reversed(current_chunk):
                            s_len = self._get_length(s)
                            if overlap_length + s_len + len(separator) <= self._chunk_overlap:
                                overlap_text = s + \
                                    (separator + overlap_text if overlap_text else "")
                                overlap_length += s_len + len(separator)
                            else:
                                break

                        # 开始新块（包含重叠）
                        if overlap_text:
                            current_chunk = [overlap_text]
                            current_length = self._get_length(overlap_text)
                        else:
                            current_chunk = []
                            current_length = 0
                    else:
                        current_chunk = []
                        current_length = 0

                # 添加当前分割
                if split_length <= self._chunk_size:
                    current_chunk.append(split)
                    current_length += split_length
                else:
                    # 分割片段太大，需要进一步分割
                    if chunks:
                        chunks.append(split)
                    else:
                        current_chunk.append(split)
                        current_length += split_length
            else:
                current_chunk.append(split)
                current_length += separator_length + split_length

        # 添加最后一个块
        if current_chunk:
            chunk_text = separator.join(current_chunk)
            if chunk_text.strip():
                chunks.append(chunk_text)

        return chunks

    def split_text(self, text: str) -> List[str]:
        """
        分割文本

        Args:
            text: 文本内容

        Returns:
            分割后的文本块列表
        """
        if not text or not text.strip():
            return []

        # 如果文本已经足够小，直接返回
        if self._get_length(text) <= self._chunk_size:
            return [text.strip()]

        # 提取代码块（保持完整性）
        code_blocks = []
        if self._keep_code_blocks:
            code_blocks = self._extract_code_blocks(text)

        # 处理包含代码块的文本
        if code_blocks:
            return self._split_text_with_code_blocks(text, code_blocks)

        # 常规分割
        return self._split_text_recursive(text, self._separators)

    def _split_text_recursive(
        self,
        text: str,
        separators: List[str],
    ) -> List[str]:
        """
        递归分割文本

        Args:
            text: 文本
            separators: 分隔符列表

        Returns:
            分割后的块列表
        """
        if not text:
            return []

        # 检查是否足够小
        if self._get_length(text) <= self._chunk_size:
            return [text.strip()] if text.strip() else []

        # 尝试使用当前分隔符
        for i, separator in enumerate(separators):
            if separator and separator in text:
                # 分割
                splits = self._split_text_with_separators(text, [separator])

                # 合并为块
                chunks = self._merge_splits(splits, separator)

                # 检查是否有需要进一步分割的块
                final_chunks = []
                for chunk in chunks:
                    if self._get_length(chunk) <= self._chunk_size:
                        final_chunks.append(chunk)
                    else:
                        # 递归使用下一级分隔符
                        next_separators = separators[i + 1:]
                        final_chunks.extend(
                            self._split_text_recursive(chunk, next_separators))

                return final_chunks

        # 没有找到合适的分隔符，按字符分割
        return [text[i:i + self._chunk_size] for i in range(0, len(text), self._chunk_size - self._chunk_overlap)]

    def _split_text_with_code_blocks(
        self,
        text: str,
        code_blocks: List[Dict[str, Any]],
    ) -> List[str]:
        """
        处理包含代码块的文本

        Args:
            text: 文本
            code_blocks: 代码块列表

        Returns:
            分割后的块列表
        """
        chunks = []
        last_end = 0

        for block in code_blocks:
            # 处理代码块之前的文本
            if block["start"] > last_end:
                pre_text = text[last_end:block["start"]]
                if pre_text.strip():
                    chunks.extend(self._split_text_recursive(
                        pre_text, self._separators))

            # 处理代码块本身
            code_content = block["content"]
            if self._get_length(code_content) <= self._chunk_size:
                chunks.append(code_content)
            else:
                # 代码块太大，需要分割但尽量保持完整性
                # 按行分割代码
                code_lines = code_content.split("\n")
                current_block = []
                current_length = 0

                for line in code_lines:
                    line_length = len(line) + 1  # +1 for newline

                    if current_length + line_length > self._chunk_size:
                        if current_block:
                            chunks.append("\n".join(current_block))
                            current_block = []
                            current_length = 0

                    current_block.append(line)
                    current_length += line_length

                if current_block:
                    chunks.append("\n".join(current_block))

            last_end = block["end"]

        # 处理最后一个代码块之后的文本
        if last_end < len(text):
            post_text = text[last_end:]
            if post_text.strip():
                chunks.extend(self._split_text_recursive(
                    post_text, self._separators))

        return chunks

    def split_documents(
        self,
        documents: List[Any],
    ) -> List[TextChunk]:
        """
        分割文档列表

        Args:
            documents: 文档列表（需要有 content 和 metadata 属性）

        Returns:
            分割后的块列表
        """
        chunks = []

        for doc in documents:
            # 获取内容和元数据
            if hasattr(doc, "content"):
                content = doc.content
                metadata = getattr(doc, "metadata", {})
            elif isinstance(doc, dict):
                content = doc.get("content", "")
                metadata = doc.get("metadata", {})
            else:
                continue

            # 分割文本
            text_chunks = self.split_text(content)

            # 创建块对象
            for i, chunk_content in enumerate(text_chunks):
                chunk_metadata = metadata.copy()
                if len(text_chunks) > 1:
                    chunk_metadata["chunk_index"] = i
                    chunk_metadata["total_chunks"] = len(text_chunks)

                chunks.append(TextChunk(
                    content=chunk_content,
                    metadata=chunk_metadata,
                ))

        return chunks


# 便捷函数
def split_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[str]:
    """
    分割文本的便捷函数

    Args:
        text: 文本内容
        chunk_size: 块大小
        chunk_overlap: 重叠大小

    Returns:
        分割后的文本块列表
    """
    splitter = SmartTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return splitter.split_text(text)
