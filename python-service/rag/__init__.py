"""
RAG 知识库模块

提供检索增强生成（Retrieval-Augmented Generation）功能：
1. 嵌入模型（Embeddings）- 支持 Ollama 本地和 OpenAI 在线
2. 向量存储（VectorStore）- LanceDB 嵌入式向量数据库
3. 文档处理（DocumentProcessor）- 多格式文档解析
4. 文本分块（TextSplitter）- 智能分块策略
5. 检索器（Retriever）- 相似度检索

使用示例：
    from rag import EmbeddingService, LanceDBVectorStore, KnowledgeRetriever
    
    # 初始化嵌入服务
    embedding_service = EmbeddingService()
    
    # 初始化向量存储
    vectorstore = LanceDBVectorStore(db_path="~/.personal-workstation/knowledge")
    
    # 添加文档
    await vectorstore.add_documents(documents, embedding_service)
    
    # 检索
    results = await vectorstore.search(query, embedding_service, k=5)
"""

from .embeddings import EmbeddingService, EmbeddingModelType
from .vectorstore import LanceDBVectorStore, Document
from .document_processor import DocumentProcessor, ProcessedDocument
from .text_splitter import SmartTextSplitter
from .retriever import KnowledgeRetriever, RetrievedDocument

__all__ = [
    "EmbeddingService",
    "EmbeddingModelType",
    "LanceDBVectorStore",
    "Document",
    "DocumentProcessor",
    "ProcessedDocument",
    "SmartTextSplitter",
    "KnowledgeRetriever",
    "RetrievedDocument",
]
