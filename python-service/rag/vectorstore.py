"""
向量存储模块

使用 LanceDB 作为嵌入式向量数据库：
1. 无需独立服务进程
2. 支持向量相似度搜索
3. 支持元数据过滤
4. 数据持久化到本地

使用示例：
    from rag.vectorstore import LanceDBVectorStore
    from rag.embeddings import EmbeddingService
    
    # 初始化
    embedding_service = EmbeddingService()
    vectorstore = LanceDBVectorStore(db_path="~/.personal-workstation/knowledge")
    
    # 创建知识库（集合）
    vectorstore.create_collection("my_knowledge")
    
    # 添加文档
    await vectorstore.add_documents(
        knowledge_id="my_knowledge",
        documents=[
            {"content": "文档内容", "metadata": {"source": "file.txt"}}
        ],
        embedding_service=embedding_service
    )
    
    # 搜索
    results = await vectorstore.search(
        knowledge_id="my_knowledge",
        query="搜索内容",
        embedding_service=embedding_service,
        k=5
    )
"""

import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import lancedb
from lancedb.pydantic import LanceModel, Vector

logger = logging.getLogger(__name__)


@dataclass
class Document:
    """文档数据结构"""
    id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[List[float]] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "content": self.content,
            "metadata": self.metadata,
            "embedding": self.embedding,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Document":
        """从字典创建"""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            content=data.get("content", ""),
            metadata=data.get("metadata", {}),
            embedding=data.get("embedding"),
        )


@dataclass
class SearchResult:
    """搜索结果"""
    document: Document
    score: float

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "document": self.document.to_dict(),
            "score": self.score,
        }


def _create_schema(vector_dim: int):
    """
    动态创建 LanceDB 表结构

    Args:
        vector_dim: 向量维度

    Returns:
        Pydantic 模型类
    """
    class DocumentSchema(LanceModel):
        """文档向量表结构"""
        id: str
        content: str
        metadata: str  # JSON 序列化的元数据
        vector: Vector(vector_dim)
        created_at: float

    return DocumentSchema


class LanceDBVectorStore:
    """
    LanceDB 向量存储

    特性：
    1. 嵌入式数据库，无需独立服务
    2. 支持多个知识库（集合）
    3. 支持向量相似度搜索
    4. 数据持久化到本地

    数据存储位置：
    - 默认：~/.personal-workstation/knowledge/
    - 可通过 db_path 参数自定义
    """

    def __init__(
        self,
        db_path: Optional[str] = None,
    ):
        """
        初始化向量存储

        Args:
            db_path: 数据库存储路径，默认 ~/.personal-workstation/knowledge
        """
        # 使用默认路径如果未指定或为 None
        actual_path = db_path or "~/.personal-workstation/knowledge"
        # 展开路径
        self._db_path = os.path.expanduser(actual_path)

        # 确保目录存在
        os.makedirs(self._db_path, exist_ok=True)

        # 连接数据库
        self._db = lancedb.connect(self._db_path)

        # 缓存的表对象
        self._tables: Dict[str, Any] = {}

        # 向量维度缓存
        self._vector_dims: Dict[str, int] = {}

        logger.info(f"LanceDB 向量存储初始化: {self._db_path}")

    @property
    def db_path(self) -> str:
        """获取数据库路径"""
        return self._db_path

    def list_collections(self) -> List[str]:
        """
        列出所有知识库（表）

        Returns:
            知识库 ID 列表
        """
        return self._db.table_names()

    def collection_exists(self, knowledge_id: str) -> bool:
        """
        检查知识库是否存在

        Args:
            knowledge_id: 知识库 ID

        Returns:
            是否存在
        """
        return knowledge_id in self._db.table_names()

    def get_collection_dimension(self, knowledge_id: str) -> Optional[int]:
        """
        获取知识库的向量维度

        Args:
            knowledge_id: 知识库 ID

        Returns:
            向量维度，如果不存在返回 None
        """
        # 先从缓存获取
        if knowledge_id in self._vector_dims:
            logger.debug(f"从缓存获取维度: {knowledge_id} = {self._vector_dims[knowledge_id]}")
            return self._vector_dims[knowledge_id]

        # 从表中获取
        try:
            if not self.collection_exists(knowledge_id):
                logger.debug(f"集合不存在: {knowledge_id}")
                return None

            table = self._get_table(knowledge_id)
            # 获取表的一行数据来检查向量维度
            df = table.to_pandas()
            logger.debug(f"获取集合数据: {knowledge_id}, 行数={len(df) if df is not None else 0}, 列={list(df.columns) if df is not None else []}")
            
            if df is not None and len(df) > 0 and "vector" in df.columns:
                vector = df.iloc[0]["vector"]
                dim = len(vector) if vector is not None else None
                logger.info(f"从数据获取维度: {knowledge_id} = {dim}")
                if dim:
                    # 缓存维度
                    self._vector_dims[knowledge_id] = dim
                return dim
            logger.debug(f"无法获取维度: df={df is not None}, len={len(df) if df is not None else 0}, has_vector={'vector' in df.columns if df is not None else False}")
            return None
        except Exception as e:
            logger.warning(f"获取知识库维度失败: {knowledge_id}, 错误: {e}")
            return None

    def create_collection(
        self,
        knowledge_id: str,
        vector_dim: int = 768,
    ) -> bool:
        """
        创建知识库（表）

        Args:
            knowledge_id: 知识库 ID
            vector_dim: 向量维度

        Returns:
            是否创建成功
        """
        try:
            if self.collection_exists(knowledge_id):
                logger.warning(f"知识库已存在: {knowledge_id}")
                return True

            # 创建表结构
            schema = _create_schema(vector_dim)

            # 创建空表
            self._db.create_table(
                knowledge_id,
                schema=schema,
                mode="create",
            )

            # 缓存向量维度
            self._vector_dims[knowledge_id] = vector_dim

            logger.info(f"创建知识库: {knowledge_id}, 向量维度: {vector_dim}")
            return True

        except Exception as e:
            logger.error(f"创建知识库失败: {knowledge_id}, 错误: {e}")
            return False

    def delete_collection(self, knowledge_id: str) -> bool:
        """
        删除知识库（表）

        Args:
            knowledge_id: 知识库 ID

        Returns:
            是否删除成功
        """
        try:
            if not self.collection_exists(knowledge_id):
                logger.warning(f"知识库不存在: {knowledge_id}")
                return True

            self._db.drop_table(knowledge_id)

            # 清理缓存
            if knowledge_id in self._tables:
                del self._tables[knowledge_id]
            if knowledge_id in self._vector_dims:
                del self._vector_dims[knowledge_id]

            logger.info(f"删除知识库: {knowledge_id}")
            return True

        except Exception as e:
            logger.error(f"删除知识库失败: {knowledge_id}, 错误: {e}")
            return False

    def _get_table(self, knowledge_id: str):
        """
        获取表对象

        Args:
            knowledge_id: 知识库 ID

        Returns:
            LanceDB 表对象
        """
        if knowledge_id not in self._tables:
            if not self.collection_exists(knowledge_id):
                raise ValueError(f"知识库不存在: {knowledge_id}")
            self._tables[knowledge_id] = self._db.open_table(knowledge_id)

        return self._tables[knowledge_id]

    async def add_documents(
        self,
        knowledge_id: str,
        documents: List[Document],
        embedding_service: Any,
        batch_size: int = 100,
    ) -> int:
        """
        添加文档到知识库

        Args:
            knowledge_id: 知识库 ID
            documents: 文档列表
            embedding_service: 嵌入服务
            batch_size: 批量处理大小

        Returns:
            添加的文档数量
        """
        if not documents:
            return 0

        try:
            table = self._get_table(knowledge_id)

            # 获取向量维度
            vector_dim = embedding_service.dimension

            # 批量生成嵌入
            all_embeddings = []
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                texts = [doc.content for doc in batch]
                embeddings = await embedding_service.get_embeddings(texts)
                all_embeddings.extend(embeddings)

            # 准备数据
            records = []
            current_time = datetime.now().timestamp()

            for doc, embedding in zip(documents, all_embeddings):
                record = {
                    "id": doc.id,
                    "content": doc.content,
                    "metadata": json.dumps(doc.metadata, ensure_ascii=False),
                    "vector": embedding,
                    "created_at": current_time,
                }
                records.append(record)

            # 添加到表
            table.add(records)

            logger.info(f"添加文档到知识库: {knowledge_id}, 数量: {len(records)}")
            return len(records)

        except Exception as e:
            logger.error(f"添加文档失败: {knowledge_id}, 错误: {e}")
            return 0

    async def add_document(
        self,
        knowledge_id: str,
        document: Document,
        embedding_service: Any,
    ) -> bool:
        """
        添加单个文档

        Args:
            knowledge_id: 知识库 ID
            document: 文档
            embedding_service: 嵌入服务

        Returns:
            是否添加成功
        """
        count = await self.add_documents(
            knowledge_id=knowledge_id,
            documents=[document],
            embedding_service=embedding_service,
        )
        return count == 1

    def delete_document(self, knowledge_id: str, document_id: str) -> bool:
        """
        删除文档

        Args:
            knowledge_id: 知识库 ID
            document_id: 文档 ID

        Returns:
            是否删除成功
        """
        try:
            table = self._get_table(knowledge_id)
            table.delete(f"id = '{document_id}'")

            logger.info(f"删除文档: {knowledge_id}/{document_id}")
            return True

        except Exception as e:
            logger.error(f"删除文档失败: {document_id}, 错误: {e}")
            return False

    def delete_documents_by_file(
        self,
        knowledge_id: str,
        file_path: str,
    ) -> int:
        """
        删除指定文件的所有文档块

        Args:
            knowledge_id: 知识库 ID
            file_path: 文件路径

        Returns:
            删除的文档数量
        """
        try:
            table = self._get_table(knowledge_id)

            # 先查询要删除的数量
            results = table.search().where(
                f"json_extract(metadata, '$.file_path') = '{file_path}'"
            ).to_list()

            count = len(results)

            if count > 0:
                table.delete(
                    f"json_extract(metadata, '$.file_path') = '{file_path}'")
                logger.info(f"删除文件文档: {knowledge_id}/{file_path}, 数量: {count}")

            return count

        except Exception as e:
            logger.error(f"删除文件文档失败: {file_path}, 错误: {e}")
            return 0

    async def search(
        self,
        knowledge_id: str,
        query: str,
        embedding_service: Any,
        k: int = 5,
        filter_: Optional[str] = None,
    ) -> List[SearchResult]:
        """
        相似度搜索

        Args:
            knowledge_id: 知识库 ID
            query: 查询文本
            embedding_service: 嵌入服务
            k: 返回数量
            filter_: 元数据过滤条件

        Returns:
            搜索结果列表
        """
        try:
            table = self._get_table(knowledge_id)

            # 生成查询向量
            query_embedding = await embedding_service.get_embedding(query)

            # 执行搜索
            search = table.search(query_embedding).limit(k)

            if filter_:
                search = search.where(filter_)

            results = search.to_list()

            # 转换结果
            search_results = []
            for result in results:
                doc = Document(
                    id=result.get("id", ""),
                    content=result.get("content", ""),
                    metadata=json.loads(result.get("metadata", "{}")),
                    embedding=result.get("vector"),
                )
                # LanceDB 返回的是距离，需要转换为相似度分数
                # 使用 1 / (1 + distance) 将距离转换为分数
                distance = result.get("_distance", 0)
                score = 1 / (1 + distance)

                search_results.append(SearchResult(document=doc, score=score))

            return search_results

        except Exception as e:
            logger.error(f"搜索失败: {knowledge_id}, 错误: {e}")
            return []

    def get_document_count(self, knowledge_id: str) -> int:
        """
        获取知识库文档数量

        Args:
            knowledge_id: 知识库 ID

        Returns:
            文档数量
        """
        try:
            if not self.collection_exists(knowledge_id):
                return 0

            table = self._get_table(knowledge_id)
            return table.count_rows()

        except Exception as e:
            logger.error(f"获取文档数量失败: {knowledge_id}, 错误: {e}")
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """
        获取向量存储统计信息

        Returns:
            统计信息字典
        """
        collections = self.list_collections()

        stats = {
            "db_path": self._db_path,
            "collections": [],
            "total_documents": 0,
        }

        for collection_id in collections:
            count = self.get_document_count(collection_id)
            stats["collections"].append({
                "id": collection_id,
                "document_count": count,
            })
            stats["total_documents"] += count

        return stats


# 全局向量存储实例
_global_vectorstore: Optional[LanceDBVectorStore] = None


def get_vectorstore(db_path: Optional[str] = None) -> LanceDBVectorStore:
    """
    获取全局向量存储实例

    Args:
        db_path: 数据库路径

    Returns:
        向量存储实例
    """
    global _global_vectorstore

    if _global_vectorstore is None:
        # 使用默认路径如果未指定
        actual_path = db_path or "~/.personal-workstation/knowledge"
        _global_vectorstore = LanceDBVectorStore(db_path=actual_path)

    return _global_vectorstore
