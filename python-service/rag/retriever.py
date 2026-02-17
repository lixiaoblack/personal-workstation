"""
知识检索器模块

提供知识库检索功能：
1. 向量相似度检索
2. 关键词检索
3. 混合检索（向量 + 关键词）
4. 重排序支持

使用示例：
    from rag.retriever import KnowledgeRetriever
    from rag.embeddings import EmbeddingService
    from rag.vectorstore import LanceDBVectorStore
    
    # 初始化
    embedding_service = EmbeddingService()
    vectorstore = LanceDBVectorStore()
    retriever = KnowledgeRetriever(vectorstore, embedding_service)
    
    # 检索
    results = await retriever.retrieve(
        knowledge_id="my_knowledge",
        query="搜索内容",
        top_k=5,
    )
"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class RetrievedDocument:
    """检索到的文档"""
    content: str
    score: float
    metadata: Dict[str, Any]
    retrieval_method: str  # "vector" | "keyword" | "hybrid"

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "content": self.content,
            "score": self.score,
            "metadata": self.metadata,
            "retrieval_method": self.retrieval_method,
        }


class KeywordSearcher:
    """
    关键词搜索器

    使用 BM25 风格的简单关键词匹配
    """

    def __init__(self):
        """初始化关键词搜索器"""
        # 停用词
        self._stop_words = {
            "的", "了", "是", "在", "我", "有", "和", "就", "不", "人", "都", "一",
            "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有",
            "看", "好", "自己", "这", "the", "a", "an", "is", "are", "was", "were",
            "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "must", "shall", "can",
        }

    def tokenize(self, text: str) -> List[str]:
        """
        分词

        Args:
            text: 文本

        Returns:
            词列表
        """
        # 简单分词：中文字符、英文单词、数字
        tokens = []

        # 提取中文词（按字符）
        chinese_chars = re.findall(r'[\u4e00-\u9fff]+', text)
        for chars in chinese_chars:
            # 简单处理：每个中文字符作为一个词（后续可以用更复杂的分词）
            tokens.extend(list(chars))

        # 提取英文单词
        english_words = re.findall(r'[a-zA-Z]+', text.lower())
        tokens.extend(english_words)

        # 提取数字
        numbers = re.findall(r'\d+', text)
        tokens.extend(numbers)

        return tokens

    def extract_keywords(self, text: str, top_n: int = 10) -> List[Tuple[str, float]]:
        """
        提取关键词

        Args:
            text: 文本
            top_n: 返回数量

        Returns:
            关键词和权重列表
        """
        tokens = self.tokenize(text)

        # 计算词频
        word_freq: Dict[str, int] = {}
        for token in tokens:
            if token not in self._stop_words and len(token) > 1:
                word_freq[token] = word_freq.get(token, 0) + 1

        # 排序
        sorted_words = sorted(
            word_freq.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # 归一化权重
        max_freq = sorted_words[0][1] if sorted_words else 1
        keywords = [(word, freq / max_freq)
                    for word, freq in sorted_words[:top_n]]

        return keywords

    def calculate_score(
        self,
        query_keywords: List[Tuple[str, float]],
        document: str,
    ) -> float:
        """
        计算文档与查询的相关性分数

        Args:
            query_keywords: 查询关键词
            document: 文档内容

        Returns:
            相关性分数
        """
        if not query_keywords:
            return 0.0

        doc_lower = document.lower()
        total_score = 0.0

        for keyword, weight in query_keywords:
            # 计算关键词出现次数
            count = doc_lower.count(keyword.lower())
            if count > 0:
                # BM25 风格的得分
                total_score += weight * (1 + count / (count + 2))

        return total_score / len(query_keywords)


class KnowledgeRetriever:
    """
    知识检索器

    支持多种检索模式：
    1. vector: 纯向量检索
    2. keyword: 纯关键词检索
    3. hybrid: 混合检索（向量 + 关键词）

    混合检索的优势：
    - 向量检索捕捉语义相似性
    - 关键词检索精确匹配专有名词
    - 结合两者提高召回率
    """

    def __init__(
        self,
        vectorstore: Any,
        embedding_service: Any,
        keyword_searcher: Optional[KeywordSearcher] = None,
    ):
        """
        初始化知识检索器

        Args:
            vectorstore: 向量存储
            embedding_service: 嵌入服务
            keyword_searcher: 关键词搜索器
        """
        self._vectorstore = vectorstore
        self._embedding_service = embedding_service
        self._keyword_searcher = keyword_searcher or KeywordSearcher()

    async def retrieve(
        self,
        knowledge_id: str,
        query: str,
        top_k: int = 5,
        method: str = "hybrid",
        vector_weight: float = 0.7,
        rerank: bool = False,
    ) -> List[RetrievedDocument]:
        """
        检索知识

        Args:
            knowledge_id: 知识库 ID
            query: 查询文本
            top_k: 返回数量
            method: 检索方法 ("vector" | "keyword" | "hybrid")
            vector_weight: 混合检索时向量检索的权重
            rerank: 是否重排序

        Returns:
            检索到的文档列表
        """
        if method == "vector":
            return await self._vector_search(knowledge_id, query, top_k)
        elif method == "keyword":
            return await self._keyword_search(knowledge_id, query, top_k)
        elif method == "hybrid":
            return await self._hybrid_search(
                knowledge_id, query, top_k, vector_weight
            )
        else:
            logger.warning(f"未知的检索方法: {method}")
            return await self._vector_search(knowledge_id, query, top_k)

    async def _vector_search(
        self,
        knowledge_id: str,
        query: str,
        top_k: int,
    ) -> List[RetrievedDocument]:
        """向量检索"""
        results = await self._vectorstore.search(
            knowledge_id=knowledge_id,
            query=query,
            embedding_service=self._embedding_service,
            k=top_k,
        )

        return [
            RetrievedDocument(
                content=result.document.content,
                score=result.score,
                metadata=result.document.metadata,
                retrieval_method="vector",
            )
            for result in results
        ]

    async def _keyword_search(
        self,
        knowledge_id: str,
        query: str,
        top_k: int,
    ) -> List[RetrievedDocument]:
        """关键词检索"""
        # 提取查询关键词
        query_keywords = self._keyword_searcher.extract_keywords(query)

        # 获取知识库所有文档（这里简化处理，实际应该优化）
        # 由于 LanceDB 不支持全表扫描，这里使用向量搜索获取更多结果
        initial_results = await self._vectorstore.search(
            knowledge_id=knowledge_id,
            query=query,
            embedding_service=self._embedding_service,
            k=top_k * 3,  # 获取更多结果用于重排序
        )

        # 计算关键词分数
        scored_results = []
        for result in initial_results:
            keyword_score = self._keyword_searcher.calculate_score(
                query_keywords, result.document.content
            )
            scored_results.append((result, keyword_score))

        # 按关键词分数排序
        scored_results.sort(key=lambda x: x[1], reverse=True)

        return [
            RetrievedDocument(
                content=result.document.content,
                score=score,
                metadata=result.document.metadata,
                retrieval_method="keyword",
            )
            for result, score in scored_results[:top_k]
        ]

    async def _hybrid_search(
        self,
        knowledge_id: str,
        query: str,
        top_k: int,
        vector_weight: float,
    ) -> List[RetrievedDocument]:
        """混合检索"""
        # 向量检索
        vector_results = await self._vectorstore.search(
            knowledge_id=knowledge_id,
            query=query,
            embedding_service=self._embedding_service,
            k=top_k * 2,
        )

        # 提取查询关键词
        query_keywords = self._keyword_searcher.extract_keywords(query)

        # 合并分数
        merged_results: Dict[str, Tuple[Any, float, float]] = {}

        for result in vector_results:
            doc_id = result.document.id
            vector_score = result.score
            keyword_score = self._keyword_searcher.calculate_score(
                query_keywords, result.document.content
            )
            merged_results[doc_id] = (result, vector_score, keyword_score)

        # 计算混合分数
        keyword_weight = 1 - vector_weight
        scored_results = []

        for doc_id, (result, v_score, k_score) in merged_results.items():
            hybrid_score = vector_weight * v_score + keyword_weight * k_score
            scored_results.append((result, hybrid_score))

        # 按混合分数排序
        scored_results.sort(key=lambda x: x[1], reverse=True)

        return [
            RetrievedDocument(
                content=result.document.content,
                score=score,
                metadata=result.document.metadata,
                retrieval_method="hybrid",
            )
            for result, score in scored_results[:top_k]
        ]

    async def retrieve_for_chat(
        self,
        knowledge_ids: List[str],
        query: str,
        top_k_per_knowledge: int = 3,
        total_top_k: int = 5,
    ) -> List[RetrievedDocument]:
        """
        为聊天检索知识

        从多个知识库检索，合并结果

        Args:
            knowledge_ids: 知识库 ID 列表
            query: 查询文本
            top_k_per_knowledge: 每个知识库返回数量
            total_top_k: 总返回数量

        Returns:
            检索到的文档列表
        """
        all_results = []

        for knowledge_id in knowledge_ids:
            try:
                results = await self.retrieve(
                    knowledge_id=knowledge_id,
                    query=query,
                    top_k=top_k_per_knowledge,
                    method="hybrid",
                )
                all_results.extend(results)
            except Exception as e:
                logger.warning(f"检索知识库失败: {knowledge_id}, 错误: {e}")
                continue

        # 按分数排序并取 top_k
        all_results.sort(key=lambda x: x.score, reverse=True)

        return all_results[:total_top_k]

    def format_context(
        self,
        documents: List[RetrievedDocument],
        max_length: int = 4000,
    ) -> str:
        """
        格式化检索结果为上下文

        Args:
            documents: 检索到的文档
            max_length: 最大长度

        Returns:
            格式化的上下文字符串
        """
        if not documents:
            return ""

        context_parts = []
        current_length = 0

        for i, doc in enumerate(documents):
            # 格式化单个文档
            source = doc.metadata.get("file_name", "未知来源")
            part = f"[{i + 1}] 来源: {source}\n{doc.content}\n"

            # 检查长度
            if current_length + len(part) > max_length:
                break

            context_parts.append(part)
            current_length += len(part)

        return "\n".join(context_parts)
