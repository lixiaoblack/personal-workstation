"""
Notes 笔记向量存储模块

为 Markdown 笔记提供语义搜索能力：
1. 将笔记内容分块并转化为向量存储
2. 支持语义相似度搜索
3. 支持按文件路径、标题等元数据过滤
4. 笔记更新时自动同步向量

使用示例：
    from rag.notes_vectorstore import NotesVectorStore
    
    # 初始化
    store = NotesVectorStore()
    
    # 索引笔记
    await store.index_note(
        file_path="/Users/xxx/Notes/React Hooks.md",
        content="# React Hooks...",
        metadata={"title": "React Hooks", "modified_at": 1708123456}
    )
    
    # 语义搜索
    results = await store.search("React Hooks 怎么使用")
"""

import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from .vectorstore import LanceDBVectorStore, Document, get_vectorstore
from .embeddings import get_embedding_service
from .text_splitter import SmartTextSplitter, TextChunk

logger = logging.getLogger(__name__)

# Notes 向量集合名称
NOTES_COLLECTION_ID = "__notes__"


@dataclass
class NoteChunk:
    """笔记块结构"""
    file_path: str
    file_name: str
    heading: str
    content: str
    chunk_index: int
    modified_at: Optional[int] = None

    def to_search_text(self) -> str:
        """
        生成用于搜索的文本
        
        将笔记的各种信息组合成一段完整的文本，
        便于语义搜索时匹配相关内容。
        """
        parts = []
        
        # 添加文件名作为上下文
        parts.append(f"文件：{self.file_name}")
        
        # 添加标题层级
        if self.heading:
            parts.append(f"章节：{self.heading}")
        
        # 添加内容
        parts.append(f"内容：{self.content}")
        
        return "\n".join(parts)

    def to_document(self) -> Document:
        """转换为向量存储文档"""
        # 使用 file_path + chunk_index 作为唯一 ID
        chunk_id = f"{self.file_path}#{self.chunk_index}"
        
        return Document(
            id=chunk_id,
            content=self.to_search_text(),
            metadata={
                "file_path": self.file_path,
                "file_name": self.file_name,
                "heading": self.heading,
                "chunk_index": self.chunk_index,
                "modified_at": self.modified_at,
            }
        )


class MarkdownSplitter:
    """
    Markdown 智能分块器
    
    按 Heading 分块，保留代码块完整性。
    """
    
    def __init__(self, chunk_size: int = 1500, chunk_overlap: int = 200):
        """
        初始化分块器
        
        Args:
            chunk_size: 块大小（字符数）
            chunk_overlap: 重叠大小
        """
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        # 使用通用分块器处理大块
        self._text_splitter = SmartTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            keep_code_blocks=True
        )
    
    def split(self, content: str, file_path: str, file_name: str) -> List[NoteChunk]:
        """
        分块 Markdown 内容
        
        Args:
            content: Markdown 内容
            file_path: 文件路径
            file_name: 文件名
            
        Returns:
            笔记块列表
        """
        chunks = []
        
        # 按 Heading 分割
        sections = self._split_by_headings(content)
        
        chunk_index = 0
        for section in sections:
            heading = section["heading"]
            section_content = section["content"]
            
            # 如果块太大，进一步分割
            if len(section_content) > self._chunk_size:
                text_chunks = self._text_splitter.split_text(section_content)
                for text_chunk in text_chunks:
                    chunks.append(NoteChunk(
                        file_path=file_path,
                        file_name=file_name,
                        heading=heading,
                        content=text_chunk.content if hasattr(text_chunk, 'content') else text_chunk,
                        chunk_index=chunk_index
                    ))
                    chunk_index += 1
            else:
                chunks.append(NoteChunk(
                    file_path=file_path,
                    file_name=file_name,
                    heading=heading,
                    content=section_content,
                    chunk_index=chunk_index
                ))
                chunk_index += 1
        
        return chunks
    
    def _split_by_headings(self, content: str) -> List[Dict[str, str]]:
        """
        按 Heading 分割内容
        
        Args:
            content: Markdown 内容
            
        Returns:
            [{"heading": "## Title", "content": "..."}]
        """
        sections = []
        current_heading = ""
        current_content = []
        
        lines = content.split('\n')
        
        for line in lines:
            # 检测 Heading
            heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)
            
            if heading_match:
                # 保存之前的 section
                if current_content:
                    sections.append({
                        "heading": current_heading,
                        "content": '\n'.join(current_content).strip()
                    })
                
                # 开始新的 section
                current_heading = heading_match.group(2).strip()
                current_content = [line]
            else:
                current_content.append(line)
        
        # 保存最后一个 section
        if current_content:
            sections.append({
                "heading": current_heading,
                "content": '\n'.join(current_content).strip()
            })
        
        return sections


class NotesVectorStore:
    """
    笔记向量存储
    
    提供笔记内容的语义搜索能力。
    """
    
    def __init__(self):
        """初始化笔记向量存储"""
        self._vectorstore = get_vectorstore()
        self._embedding_service = get_embedding_service()
        self._markdown_splitter = MarkdownSplitter()
        self._initialized = False

    async def _ensure_collection(self):
        """确保集合已创建"""
        if self._initialized:
            return

        if not self._vectorstore.collection_exists(NOTES_COLLECTION_ID):
            self._vectorstore.create_collection(
                NOTES_COLLECTION_ID,
                vector_dim=self._embedding_service.dimension
            )
            logger.info(f"[NotesVectorStore] 创建笔记向量集合: {NOTES_COLLECTION_ID}")

        self._initialized = True

    async def index_note(
        self,
        file_path: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        索引单个笔记
        
        Args:
            file_path: 文件路径
            content: Markdown 内容
            metadata: 额外元数据（如 modified_at）
            
        Returns:
            索引的块数量
        """
        try:
            await self._ensure_collection()
            
            # 先删除该文件的旧向量
            await self.delete_note(file_path)
            
            # 获取文件名
            file_name = os.path.basename(file_path)
            
            # 分块
            chunks = self._markdown_splitter.split(content, file_path, file_name)
            
            if not chunks:
                return 0
            
            # 添加元数据
            modified_at = metadata.get("modified_at") if metadata else None
            
            # 转换为文档
            documents = []
            for chunk in chunks:
                chunk.modified_at = modified_at
                documents.append(chunk.to_document())
            
            # 批量添加到向量存储
            count = await self._vectorstore.add_documents(
                NOTES_COLLECTION_ID,
                documents,
                self._embedding_service
            )
            
            logger.debug(f"[NotesVectorStore] 索引笔记: {file_path}, {count} 块")
            return count
            
        except Exception as e:
            logger.error(f"[NotesVectorStore] 索引笔记失败: {e}")
            return 0

    async def delete_note(self, file_path: str) -> bool:
        """
        删除笔记的所有向量
        
        Args:
            file_path: 文件路径
            
        Returns:
            是否删除成功
        """
        try:
            # 获取该文件的所有文档 ID
            # 由于 LanceDB 不支持直接按 metadata 过滤删除，我们需要手动处理
            # 这里使用 VectorStore 的 delete_by_metadata 方法（如果有的话）
            # 否则需要遍历删除
            
            # 简单方案：通过 ID 前缀删除
            # ID 格式为: file_path#chunk_index
            # 这里需要查询所有匹配的文档
            
            if not self._vectorstore.collection_exists(NOTES_COLLECTION_ID):
                return True
            
            # 获取表中所有数据并过滤
            table = self._vectorstore._get_table(NOTES_COLLECTION_ID)
            if table is None:
                return True
            
            # 查询匹配的记录
            try:
                # 使用 LanceDB 的 filter 功能
                df = table.to_pandas()
                matching_ids = df[df['metadata'].str.contains(f'"file_path": "{file_path}"')]['id'].tolist()
                
                if matching_ids:
                    # 删除匹配的记录
                    for doc_id in matching_ids:
                        self._vectorstore.delete_document(NOTES_COLLECTION_ID, doc_id)
                    
                    logger.debug(f"[NotesVectorStore] 删除笔记向量: {file_path}, {len(matching_ids)} 条")
                
                return True
            except Exception as inner_e:
                logger.warning(f"[NotesVectorStore] 删除笔记向量时出错: {inner_e}")
                return True  # 即使删除失败也返回 True，避免阻塞
            
        except Exception as e:
            logger.error(f"[NotesVectorStore] 删除笔记向量失败: {e}")
            return False

    async def search(
        self,
        query: str,
        k: int = 5,
        file_path_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        语义搜索笔记
        
        Args:
            query: 搜索查询
            k: 返回数量
            file_path_filter: 文件路径过滤
            
        Returns:
            搜索结果列表
        """
        try:
            await self._ensure_collection()
            
            results = await self._vectorstore.search(
                NOTES_COLLECTION_ID,
                query,
                self._embedding_service,
                k=k * 2  # 多取一些，后面过滤
            )
            
            if not results:
                return []
            
            # 过滤并格式化结果
            formatted_results = []
            seen_files = set()  # 去重：同一文件只保留最佳匹配
            
            for result in results:
                doc = result.document
                metadata = doc.metadata
                
                # 文件路径过滤
                if file_path_filter and metadata.get("file_path") != file_path_filter:
                    continue
                
                # 去重
                file_path = metadata.get("file_path", "")
                if file_path in seen_files and len(formatted_results) >= k:
                    continue
                
                seen_files.add(file_path)
                
                formatted_results.append({
                    "file_path": file_path,
                    "file_name": metadata.get("file_name", ""),
                    "heading": metadata.get("heading", ""),
                    "content": doc.content,
                    "chunk_index": metadata.get("chunk_index", 0),
                    "modified_at": metadata.get("modified_at"),
                    "score": result.score
                })
                
                if len(formatted_results) >= k:
                    break
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"[NotesVectorStore] 搜索笔记失败: {e}")
            return []

    async def get_notes_stats(self) -> Dict[str, Any]:
        """
        获取笔记索引统计
        
        Returns:
            统计信息
        """
        try:
            if not self._vectorstore.collection_exists(NOTES_COLLECTION_ID):
                return {
                    "total_chunks": 0,
                    "total_files": 0,
                    "indexed": False
                }
            
            table = self._vectorstore._get_table(NOTES_COLLECTION_ID)
            if table is None:
                return {
                    "total_chunks": 0,
                    "total_files": 0,
                    "indexed": False
                }
            
            df = table.to_pandas()
            total_chunks = len(df)
            
            # 统计唯一文件数
            unique_files = set()
            for _, row in df.iterrows():
                try:
                    import json
                    metadata = json.loads(row['metadata'])
                    unique_files.add(metadata.get('file_path', ''))
                except:
                    pass
            
            return {
                "total_chunks": total_chunks,
                "total_files": len(unique_files),
                "indexed": True
            }
            
        except Exception as e:
            logger.error(f"[NotesVectorStore] 获取统计信息失败: {e}")
            return {
                "total_chunks": 0,
                "total_files": 0,
                "indexed": False,
                "error": str(e)
            }


# 单例实例
_notes_vectorstore: Optional[NotesVectorStore] = None


def get_notes_vectorstore() -> NotesVectorStore:
    """获取笔记向量存储单例"""
    global _notes_vectorstore
    if _notes_vectorstore is None:
        _notes_vectorstore = NotesVectorStore()
    return _notes_vectorstore
