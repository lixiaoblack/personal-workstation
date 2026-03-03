"""
知识库处理器

处理知识库相关的消息。
"""
import time
import logging
import os
import uuid
import json
from typing import Any, Dict, Optional, Callable, Awaitable

from .base_handler import BaseHandler

logger = logging.getLogger(__name__)


class KnowledgeHandler(BaseHandler):
    """
    知识库处理器

    处理以下消息类型：
    - knowledge_create: 创建知识库（LanceDB 集合）
    - knowledge_delete: 删除知识库
    - knowledge_list: 获取知识库列表
    - knowledge_get: 获取知识库详情
    - knowledge_add_document: 添加文档
    - knowledge_remove_document: 删除文档
    - knowledge_search: 搜索知识库
    - knowledge_list_documents: 列出知识库文档

    注意：知识库的创建/删除/列表现在统一由前端通过 FrontendBridge 处理
    Python 端只保留 LanceDB 向量操作和搜索功能
    """

    async def handle(self, message: dict) -> Optional[dict]:
        """处理知识库消息"""
        msg_type = message.get("type")

        if msg_type == "knowledge_create":
            return await self._handle_knowledge_create(message)
        elif msg_type == "knowledge_delete":
            return await self._handle_knowledge_delete(message)
        elif msg_type in ("knowledge_list", "knowledge_get"):
            return await self._handle_knowledge_list(message)
        elif msg_type == "knowledge_add_document":
            return await self._handle_knowledge_add_document(message)
        elif msg_type in ("knowledge_remove_document", "knowledge_list_documents"):
            return await self._handle_knowledge_list_documents(message)
        elif msg_type == "knowledge_search":
            return await self._handle_knowledge_search(message)
        else:
            return self.error_response(f"未知的知识库消息类型: {msg_type}", message.get("id"))

    async def _handle_knowledge_create(self, message: dict) -> dict:
        """
        处理创建 LanceDB 集合请求（仅向量存储）

        此接口仅供前端调用，用于创建 LanceDB 向量存储集合。
        完整的知识库创建流程（SQLite + LanceDB）由前端统一处理。
        """
        knowledge_id = message.get("knowledgeId")
        embedding_model = message.get("embeddingModel", "ollama")
        embedding_model_name = message.get(
            "embeddingModelName", "nomic-embed-text")
        dimension = message.get("dimension")  # 前端传递的向量维度

        if not knowledge_id:
            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "知识库 ID 不能为空",
            }

        if not dimension:
            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "向量维度 (dimension) 未提供，请确保嵌入模型已配置维度",
            }

        try:
            from rag.vectorstore import get_vectorstore
            from rag.embeddings import EmbeddingService, EmbeddingModelType

            # 创建向量存储
            vectorstore = get_vectorstore()

            # 确定嵌入模型类型
            model_type = EmbeddingModelType.OLLAMA if embedding_model == "ollama" else EmbeddingModelType.OPENAI

            # 创建嵌入服务（使用前端传递的 dimension）
            embedding_service = EmbeddingService(
                model_type=model_type,
                model_name=embedding_model_name,
                dimension=dimension,
            )

            # 创建集合
            success = vectorstore.create_collection(
                knowledge_id, embedding_service.dimension)

            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": success,
                "knowledgeId": knowledge_id,
            }

        except Exception as e:
            logger.error(f"创建 LanceDB 集合错误: {e}")
            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_knowledge_delete(self, message: dict) -> dict:
        """
        处理删除 LanceDB 集合请求（仅向量存储）

        此接口仅供前端调用，用于删除 LanceDB 向量存储集合。
        完整的知识库删除流程（SQLite + LanceDB）由前端统一处理。
        """
        knowledge_id = message.get("knowledgeId")

        if not knowledge_id:
            return {
                "type": "knowledge_delete_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "知识库 ID 不能为空",
            }

        try:
            from rag.vectorstore import get_vectorstore

            vectorstore = get_vectorstore()
            success = vectorstore.delete_collection(knowledge_id)

            return {
                "type": "knowledge_delete_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": success,
                "knowledgeId": knowledge_id,
            }

        except Exception as e:
            logger.error(f"删除 LanceDB 集合错误: {e}")
            return {
                "type": "knowledge_delete_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "knowledgeId": knowledge_id,
                "error": str(e),
            }

    async def _handle_knowledge_list(self, message: dict) -> dict:
        """
        处理获取 LanceDB 集合列表请求

        注意：此接口返回的是 LanceDB 中的集合信息，不包含 SQLite 中的元数据。
        完整的知识库列表请通过 FrontendBridge 调用 knowledgeService.listKnowledge()
        """
        try:
            from rag.vectorstore import get_vectorstore

            vectorstore = get_vectorstore()
            stats = vectorstore.get_stats()

            # 将集合信息转换为知识库格式
            knowledge_list = []
            for collection in stats.get("collections", []):
                knowledge_list.append({
                    "id": collection["id"],
                    "name": collection["id"],  # 使用集合 ID 作为名称
                    "documentCount": collection["document_count"],
                    "totalChunks": 0,
                    "embeddingModel": "ollama",
                    "embeddingModelName": "nomic-embed-text",
                    "createdAt": int(time.time() * 1000),
                    "updatedAt": int(time.time() * 1000),
                })

            return {
                "type": "knowledge_list_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "knowledge": knowledge_list,
                "count": len(knowledge_list),
                "note": "此为 LanceDB 集合列表，完整知识库列表请通过 FrontendBridge 获取",
            }

        except Exception as e:
            logger.error(f"获取 LanceDB 集合列表错误: {e}")
            return {
                "type": "knowledge_list_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "knowledge": [],
                "count": 0,
                "error": str(e),
            }

    async def _handle_knowledge_add_document(self, message: dict) -> dict:
        """处理添加文档请求"""
        knowledge_id = message.get("knowledgeId")
        file_path = message.get("filePath")
        original_file_name = message.get("originalFileName")  # 原始文件名

        if not knowledge_id or not file_path:
            return {
                "type": "knowledge_add_document_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "知识库 ID 和文件路径不能为空",
            }

        try:
            from rag.vectorstore import get_vectorstore, Document
            from rag.document_processor import DocumentProcessor
            from rag.text_splitter import SmartTextSplitter
            from rag.embeddings import get_embedding_service

            # 检查文件是否存在
            if not os.path.exists(file_path):
                return {
                    "type": "knowledge_add_document_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": f"文件不存在: {file_path}",
                }

            # 获取文件扩展名
            file_ext = os.path.splitext(file_path)[1].lower()
            image_extensions = ['.jpg', '.jpeg',
                                '.png', '.gif', '.webp', '.bmp']
            ocr_text = None
            ocr_blocks = None  # OCR 边界框信息

            # 处理图片文件：执行 OCR 识别
            if file_ext in image_extensions:
                try:
                    from ocr_service import ocr_recognize_image
                    logger.info(f"[Knowledge] 对图片执行 OCR: {file_path}")
                    ocr_result = ocr_recognize_image(file_path)
                    if ocr_result and ocr_result.get('success'):
                        ocr_text = ocr_result.get('text', '')
                        # 保存完整的 blocks 信息（包含边界框和识别率）
                        if ocr_result.get('blocks'):
                            ocr_blocks = json.dumps(
                                ocr_result.get('blocks'), ensure_ascii=False)
                        logger.info(
                            f"[Knowledge] OCR 识别成功，文字长度: {len(ocr_text)}, blocks: {len(ocr_result.get('blocks', []))}")
                except Exception as ocr_error:
                    logger.warning(f"[Knowledge] OCR 识别失败: {ocr_error}")

            # 处理文档
            processor = DocumentProcessor()
            documents = processor.process_file(file_path)

            # 如果是图片且没有文档内容，但有 OCR 结果，使用 OCR 内容
            if not documents and ocr_text:
                from rag.document_processor import DocumentChunk
                documents = [DocumentChunk(
                    content=ocr_text,
                    metadata={
                        'source': os.path.basename(file_path),
                        'file_type': 'image',
                        'ocr': True
                    }
                )]
                logger.info(f"[Knowledge] 使用 OCR 内容作为文档")

            if not documents:
                return {
                    "type": "knowledge_add_document_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": "文档解析失败或文件格式不支持",
                }

            # 分块
            splitter = SmartTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = splitter.split_documents(documents)

            # 转换为向量存储文档
            vectorstore = get_vectorstore()
            embedding_service = get_embedding_service()

            docs_to_add = []
            for chunk in chunks:
                doc = Document(
                    id=str(uuid.uuid4()),
                    content=chunk.content,
                    metadata=chunk.metadata,
                )
                docs_to_add.append(doc)

            # 添加到向量存储
            count = await vectorstore.add_documents(
                knowledge_id=knowledge_id,
                documents=docs_to_add,
                embedding_service=embedding_service,
            )

            # 检查是否添加成功
            if count == 0:
                return {
                    "type": "knowledge_add_document_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": "添加文档到向量存储失败，请检查知识库是否存在",
                }

            # 使用原始文件名（如果提供），否则使用文件路径中的文件名
            file_name = original_file_name or os.path.basename(file_path)

            return {
                "type": "knowledge_add_document_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "document": {
                    "id": str(uuid.uuid4()),
                    "knowledgeId": knowledge_id,
                    "fileName": file_name,
                    "filePath": file_path,
                    "fileType": file_ext,
                    "fileSize": os.path.getsize(file_path),
                    "chunkCount": count,
                    "ocrText": ocr_text,
                    "ocrBlocks": ocr_blocks,
                    "createdAt": int(time.time() * 1000),
                },
            }

        except Exception as e:
            logger.error(f"添加文档错误: {e}")
            return {
                "type": "knowledge_add_document_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_knowledge_search(self, message: dict) -> dict:
        """处理知识库搜索请求"""
        knowledge_id = message.get("knowledgeId")
        query = message.get("query", "")
        top_k = message.get("topK", 5)
        method = message.get("method", "hybrid")

        if not knowledge_id or not query:
            return {
                "type": "knowledge_search_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "results": [],
                "count": 0,
                "error": "知识库 ID 和查询内容不能为空",
            }

        try:
            from rag.retriever import KnowledgeRetriever
            from rag.vectorstore import get_vectorstore
            from rag.embeddings import get_embedding_service

            vectorstore = get_vectorstore()
            embedding_service = get_embedding_service()

            retriever = KnowledgeRetriever(vectorstore, embedding_service)

            results = await retriever.retrieve(
                knowledge_id=knowledge_id,
                query=query,
                top_k=top_k,
                method=method,
            )

            # 转换结果格式
            search_results = []
            for result in results:
                search_results.append({
                    "content": result.content,
                    "score": result.score,
                    "metadata": result.metadata,
                    "retrievalMethod": result.retrieval_method,
                })

            return {
                "type": "knowledge_search_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "results": search_results,
                "count": len(search_results),
            }

        except Exception as e:
            logger.error(f"搜索知识库错误: {e}")
            return {
                "type": "knowledge_search_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "results": [],
                "count": 0,
                "error": str(e),
            }

    async def _handle_knowledge_list_documents(self, message: dict) -> dict:
        """处理列出知识库文档请求"""
        # 这个方法主要依赖 Electron 端的数据库，这里返回空列表
        knowledge_id = message.get("knowledgeId")

        return {
            "type": "knowledge_list_documents_response",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            "success": True,
            "documents": [],
            "count": 0,
        }
