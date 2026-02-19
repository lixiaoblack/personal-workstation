"""
知识库检索工具

提供 Agent 检索知识库的能力，让 Agent 可以基于知识库内容回答问题。
支持智能匹配：自动搜索所有知识库或根据关键词匹配。
"""

import logging
from typing import Optional, Dict, Any, List
from pydantic import Field

from agent.tools import BaseTool, ToolSchema, global_tool_registry

logger = logging.getLogger(__name__)


class KnowledgeSearchSchema(ToolSchema):
    """知识库检索工具参数"""

    query: str = Field(
        description="要搜索的查询内容，应该是具体的问题或关键词"
    )
    knowledge_id: Optional[str] = Field(
        default=None,
        description="可选的知识库 ID，如果不指定则自动搜索所有知识库"
    )
    top_k: Optional[int] = Field(
        default=5,
        description="返回结果数量，默认 5 条"
    )


class KnowledgeRetrieverTool(BaseTool):
    """
    知识库检索工具

    让 Agent 可以从知识库中检索相关信息来回答用户问题。

    智能匹配功能：
    - 如果指定了 knowledge_id，只搜索该知识库
    - 如果没有指定，自动搜索所有知识库并合并结果
    - 结果按相关度排序

    使用场景：
    - 用户询问与知识库相关的问题
    - 需要查阅文档获取准确信息
    - 基于已有知识进行回答

    示例：
    用户: "腾讯云服务器地址是什么？"
    Agent: 调用 knowledge_search(query="腾讯云服务器地址")
    工具: 自动搜索所有知识库，返回相关文档片段
    Agent: 基于检索结果回答用户
    """

    name = "knowledge_search"
    description = (
        "从知识库中搜索相关信息。"
        "当用户询问与已上传文档相关的问题时使用此工具。"
        "可以搜索技术文档、项目资料、规范标准等内容。"
        "如果不指定知识库，会自动搜索所有知识库。"
    )

    args_schema = KnowledgeSearchSchema

    # 默认知识库 ID（可通过 set_default_knowledge 设置）
    _default_knowledge_id: Optional[str] = None
    # 缓存的知识库元数据（从 SQLite 获取）
    _knowledge_metadata: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def set_default_knowledge(cls, knowledge_id: Optional[str]):
        """设置默认知识库 ID"""
        cls._default_knowledge_id = knowledge_id
        logger.info(f"设置默认知识库: {knowledge_id}")

    @classmethod
    def get_default_knowledge(cls) -> Optional[str]:
        """获取默认知识库 ID"""
        return cls._default_knowledge_id

    @classmethod
    def set_knowledge_metadata(cls, metadata: Dict[str, Dict[str, Any]]):
        """设置知识库元数据（用于智能匹配）"""
        cls._knowledge_metadata = metadata

    def _run(
        self,
        query: str,
        knowledge_id: Optional[str] = None,
        top_k: int = 5
    ) -> str:
        """
        执行知识库检索

        Args:
            query: 搜索查询
            knowledge_id: 知识库 ID（可选，不指定则搜索所有知识库）
            top_k: 返回结果数量

        Returns:
            检索结果（格式化的文本）
        """
        import asyncio

        # 使用传入的知识库 ID 或默认值
        actual_knowledge_id = knowledge_id or self._default_knowledge_id

        try:
            if actual_knowledge_id:
                # 指定了知识库，只搜索该知识库
                results = asyncio.run(self._search_single_knowledge(
                    actual_knowledge_id, query, top_k
                ))
            else:
                # 没有指定知识库，智能搜索所有知识库
                results = asyncio.run(self._search_all_knowledge(query, top_k))

            if not results:
                return f"在知识库中未找到与 '{query}' 相关的内容。"

            # 格式化结果
            formatted = self._format_results(results)
            return formatted

        except Exception as e:
            logger.error(f"知识库检索失败: {e}")
            return f"检索失败: {str(e)}"

    async def _search_single_knowledge(
        self,
        knowledge_id: str,
        query: str,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """搜索单个知识库"""
        from rag.vectorstore import get_vectorstore
        from rag.embeddings import get_embedding_service

        vectorstore = get_vectorstore()
        embedding_service = get_embedding_service()

        # 检查知识库是否存在
        if not vectorstore.collection_exists(knowledge_id):
            return []

        # 检索
        results = await vectorstore.search(
            knowledge_id=knowledge_id,
            query=query,
            embedding_service=embedding_service,
            k=top_k
        )

        # 转换 SearchResult 为字典列表
        return [
            {
                "content": r.document.content,
                "score": r.score,
                "metadata": r.document.metadata,
                "knowledge_id": knowledge_id,
            }
            for r in results
        ]

    async def _search_all_knowledge(
        self,
        query: str,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """搜索所有知识库，智能合并结果"""
        from rag.vectorstore import get_vectorstore

        vectorstore = get_vectorstore()

        # 获取所有知识库
        all_collections = vectorstore.list_collections()

        if not all_collections:
            return []

        # 尝试根据查询关键词匹配知识库名称/描述
        matched_collections = self._match_knowledge_by_query(
            query, all_collections)

        # 如果有匹配的知识库，优先搜索这些
        search_collections = matched_collections if matched_collections else all_collections

        logger.info(f"搜索知识库: {search_collections} (匹配: {matched_collections})")

        # 搜索所有（或匹配的）知识库
        all_results = []
        per_knowledge_k = max(
            3, top_k // len(search_collections)) if len(search_collections) > 1 else top_k

        for knowledge_id in search_collections:
            try:
                results = await self._search_single_knowledge(
                    knowledge_id, query, per_knowledge_k
                )
                all_results.extend(results)
            except Exception as e:
                logger.warning(f"搜索知识库 {knowledge_id} 失败: {e}")
                continue

        # 按相关度排序，取前 top_k 个
        all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return all_results[:top_k]

    def _match_knowledge_by_query(
        self,
        query: str,
        collections: List[str]
    ) -> List[str]:
        """
        根据查询关键词匹配知识库

        Args:
            query: 查询文本
            collections: 所有知识库 ID 列表

        Returns:
            匹配的知识库 ID 列表
        """
        query_lower = query.lower()
        matched = []

        # 关键词映射：查询关键词 -> 可能的知识库名称关键词
        keyword_mappings = {
            "服务器": ["服务器", "server", "部署", "运维"],
            "腾讯": ["腾讯", "tencent", "云"],
            "阿里": ["阿里", "alibaba", "云"],
            "aws": ["aws", "amazon", "云"],
            "数据库": ["数据库", "database", "mysql", "postgres", "sql"],
            "api": ["api", "接口", "文档"],
            "文档": ["文档", "doc", "说明"],
            "配置": ["配置", "config", "设置"],
            "项目": ["项目", "project"],
        }

        # 检查查询中的关键词
        relevant_keywords = set()
        for key, keywords in keyword_mappings.items():
            if key in query_lower:
                relevant_keywords.update(keywords)
            for kw in keywords:
                if kw in query_lower:
                    relevant_keywords.add(key)
                    relevant_keywords.update(keywords)

        # 如果没有匹配的关键词，返回空（会搜索所有知识库）
        if not relevant_keywords:
            return []

        # 匹配知识库元数据
        for knowledge_id in collections:
            metadata = self._knowledge_metadata.get(knowledge_id, {})
            name = metadata.get("name", knowledge_id).lower()
            description = metadata.get("description", "").lower()

            # 检查知识库名称或描述是否包含相关关键词
            combined = f"{name} {description}"
            for keyword in relevant_keywords:
                if keyword in combined:
                    matched.append(knowledge_id)
                    break

        return matched

    def _format_results(self, results: List[Dict[str, Any]]) -> str:
        """格式化检索结果"""
        lines = ["从知识库中找到以下相关信息：\n"]

        for i, result in enumerate(results, 1):
            content = result.get("content", "")
            score = result.get("score", 0)
            metadata = result.get("metadata", {})
            knowledge_id = result.get("knowledge_id", "未知")

            # 截断过长的内容
            if len(content) > 500:
                content = content[:500] + "..."

            file_name = metadata.get("file_name", "未知来源")

            lines.append(f"【{i}】相关度: {score:.2%}")
            lines.append(f"来源: {file_name} (知识库: {knowledge_id})")
            lines.append(f"内容: {content}")
            lines.append("")

        lines.append("请基于以上信息回答用户问题，并注明信息来源。")
        return "\n".join(lines)


class KnowledgeListSchema(ToolSchema):
    """知识库列表参数"""

    pass


class KnowledgeListTool(BaseTool):
    """
    知识库列表工具

    列出所有可用的知识库，帮助用户了解有哪些知识库可以查询。
    通过 FrontendBridge 调用前端 knowledgeService 获取完整的知识库信息。
    """

    name = "knowledge_list"
    description = "列出所有可用的知识库。使用此工具了解有哪些知识库可以查询。"

    args_schema = None

    def _run(self) -> str:
        """获取知识库列表"""
        try:
            import asyncio
            knowledge_list = asyncio.run(self._list_via_bridge())

            if not knowledge_list:
                return "当前没有可用的知识库。请先创建知识库并上传文档。"

            lines = ["可用的知识库：\n"]
            for kb in knowledge_list:
                name = kb.get('name', '未命名')
                kb_id = kb.get('id', '未知')
                doc_count = kb.get('documentCount', 0)
                description = kb.get('description', '')

                lines.append(f"- {name} (ID: {kb_id})")
                lines.append(f"  文档数: {doc_count}")
                if description:
                    lines.append(f"  描述: {description}")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"获取知识库列表失败: {e}")
            return f"获取失败: {str(e)}"

    async def _list_via_bridge(self) -> List[Dict[str, Any]]:
        """通过 FrontendBridge 获取知识库列表"""
        import asyncio
        import time
        from agent.frontend_bridge_tool import (
            _global_ws_send_callback,
            _pending_bridge_requests
        )

        if not _global_ws_send_callback:
            logger.warning("[KnowledgeListTool] WebSocket 未连接，使用本地缓存")
            return await self._list_local()

        # 生成请求 ID
        request_id = f"kb_list_{int(time.time() * 1000)}"

        # 创建 Future 等待响应 - 使用 get_running_loop 而不是 get_event_loop
        loop = asyncio.get_running_loop()
        future = loop.create_future()
        _pending_bridge_requests[request_id] = future

        # 构建请求消息
        message = {
            "type": "frontend_bridge_request",
            "id": request_id,
            "timestamp": int(time.time() * 1000),
            "service": "knowledgeService",
            "method": "listKnowledge",
            "params": {},
            "requestId": request_id,
        }

        try:
            # 发送请求
            await _global_ws_send_callback(message)
            logger.info(
                f"[KnowledgeListTool] 发送 FrontendBridge 请求: {request_id}")

            # 等待响应（超时 10 秒）
            response = await asyncio.wait_for(future, timeout=10.0)

            if response.get("success"):
                result = response.get("result", [])
                logger.info(f"[KnowledgeListTool] 获取到 {len(result)} 个知识库")
                return result
            else:
                logger.error(
                    f"[KnowledgeListTool] 调用失败: {response.get('error')}")
                return await self._list_local()

        except asyncio.TimeoutError:
            _pending_bridge_requests.pop(request_id, None)
            logger.warning(
                f"[KnowledgeListTool] FrontendBridge 超时: {request_id}")
            logger.debug(
                f"[KnowledgeListTool] 待处理请求: {list(_pending_bridge_requests.keys())}")
            return await self._list_local()
        except Exception as e:
            _pending_bridge_requests.pop(request_id, None)
            logger.error(f"[KnowledgeListTool] 异常: {e}")
            return await self._list_local()

    async def _list_local(self) -> List[Dict[str, Any]]:
        """本地备份方法：从 LanceDB 获取知识库列表"""
        from rag.vectorstore import get_vectorstore

        vectorstore = get_vectorstore()
        stats = vectorstore.get_stats()
        collections = stats.get("collections", [])

        result = []
        for col in collections:
            kb_id = col.get("id", "")
            metadata = KnowledgeRetrieverTool._knowledge_metadata.get(
                kb_id, {})
            name = metadata.get("name") or f"知识库 {kb_id[-6:]}"

            result.append({
                "id": kb_id,
                "name": name,
                "description": metadata.get("description", ""),
                "documentCount": col.get("document_count", 0),
            })

        return result


class KnowledgeCreateSchema(ToolSchema):
    """知识库创建工具参数"""

    name: str = Field(
        description="知识库的名称，如 '前端技术栈'、'服务器配置'"
    )
    description: Optional[str] = Field(
        default=None,
        description="知识库的描述信息"
    )
    embedding_model: Optional[str] = Field(
        default="ollama",
        description="嵌入模型类型：'ollama' 或 'openai'"
    )
    embedding_model_name: Optional[str] = Field(
        default="nomic-embed-text",
        description="嵌入模型名称，如 'nomic-embed-text'、'text-embedding-3-small'"
    )


class KnowledgeCreateTool(BaseTool):
    """
    知识库创建工具

    创建一个新的知识库。
    通过 FrontendBridge 调用前端 knowledgeService 统一创建 SQLite 记录和 LanceDB 集合。

    使用场景：
    - 用户想要创建新的知识库来存储文档
    - 在采集网页内容前需要先创建目标知识库
    """

    name = "knowledge_create"
    description = (
        "创建一个新的知识库。"
        "当用户想要新建知识库来存储文档或网页内容时使用此工具。"
        "创建后可以使用 web_crawl 工具将网页内容添加到知识库。"
    )

    args_schema = KnowledgeCreateSchema

    def _run(
        self,
        name: str,
        description: Optional[str] = None,
        embedding_model: str = "ollama",
        embedding_model_name: str = "nomic-embed-text"
    ) -> str:
        """创建知识库"""
        import asyncio

        try:
            result = asyncio.run(self._create_via_bridge(
                name=name,
                description=description,
                embedding_model=embedding_model,
                embedding_model_name=embedding_model_name
            ))

            if result.get("success"):
                kb = result.get("knowledge", {})
                return (
                    f"知识库创建成功！\n"
                    f"名称: {kb.get('name')}\n"
                    f"ID: {kb.get('id')}\n"
                    f"嵌入模型: {kb.get('embeddingModelName')}\n"
                    f"现在可以使用 web_crawl 工具添加内容。"
                )
            else:
                return f"创建失败: {result.get('error', '未知错误')}"

        except Exception as e:
            logger.error(f"[KnowledgeCreateTool] 创建失败: {e}")
            return f"创建失败: {str(e)}"

    async def _create_via_bridge(
        self,
        name: str,
        description: Optional[str],
        embedding_model: str,
        embedding_model_name: str
    ) -> Dict[str, Any]:
        """通过 FrontendBridge 创建知识库"""
        import asyncio
        import time
        from agent.frontend_bridge_tool import (
            _global_ws_send_callback,
            _pending_bridge_requests
        )

        if not _global_ws_send_callback:
            return {"success": False, "error": "WebSocket 未连接，无法创建知识库"}

        # 生成请求 ID
        request_id = f"kb_create_{int(time.time() * 1000)}"

        # 创建 Future 等待响应
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        _pending_bridge_requests[request_id] = future

        # 构建请求消息
        message = {
            "type": "frontend_bridge_request",
            "id": request_id,
            "timestamp": int(time.time() * 1000),
            "service": "knowledgeService",
            "method": "createKnowledge",
            "params": {
                "name": name,
                "description": description,
                "embeddingModel": embedding_model,
                "embeddingModelName": embedding_model_name,
            },
            "requestId": request_id,
        }

        try:
            # 发送请求
            await _global_ws_send_callback(message)
            logger.info(f"[KnowledgeCreateTool] 发送 FrontendBridge 请求: {name}")

            # 等待响应（超时 15 秒）
            response = await asyncio.wait_for(future, timeout=15.0)

            if response.get("success"):
                result = response.get("result", {})
                logger.info(f"[KnowledgeCreateTool] 创建成功: {result.get('id')}")
                return {
                    "success": True,
                    "knowledge": result,
                }
            else:
                error = response.get("error", "未知错误")
                logger.error(f"[KnowledgeCreateTool] 创建失败: {error}")
                return {"success": False, "error": error}

        except asyncio.TimeoutError:
            _pending_bridge_requests.pop(request_id, None)
            return {"success": False, "error": "请求超时，前端服务未响应"}
        except Exception as e:
            _pending_bridge_requests.pop(request_id, None)
            logger.error(f"[KnowledgeCreateTool] 异常: {e}")
            return {"success": False, "error": str(e)}


def register_knowledge_tools():
    """注册知识库相关工具"""
    global global_tool_registry

    # 注册知识库检索工具
    knowledge_search_tool = KnowledgeRetrieverTool()
    if knowledge_search_tool.name not in global_tool_registry.list_tools():
        global_tool_registry.register(knowledge_search_tool)
        logger.info("已注册知识库检索工具: knowledge_search")

    # 注册知识库列表工具
    knowledge_list_tool = KnowledgeListTool()
    if knowledge_list_tool.name not in global_tool_registry.list_tools():
        global_tool_registry.register(knowledge_list_tool)
        logger.info("已注册知识库列表工具: knowledge_list")

    # 注册知识库创建工具
    knowledge_create_tool = KnowledgeCreateTool()
    if knowledge_create_tool.name not in global_tool_registry.list_tools():
        global_tool_registry.register(knowledge_create_tool)
        logger.info("已注册知识库创建工具: knowledge_create")

    logger.info(f"当前已注册工具: {global_tool_registry.list_tools()}")


# 自动注册
register_knowledge_tools()
