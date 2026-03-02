"""
Todo 向量存储模块

为待办事项提供语义搜索能力：
1. 将待办标题、描述向量化存储
2. 支持语义相似度搜索
3. 支持按时间、状态等元数据过滤

使用示例：
    from rag.todo_vectorstore import TodoVectorStore
    
    # 初始化
    store = TodoVectorStore()
    
    # 添加待办
    await store.add_todo({
        "id": 1,
        "title": "完成项目报告",
        "description": "需要在周五前完成",
        "priority": "high",
        "status": "pending"
    })
    
    # 语义搜索
    results = await store.search("今天要做什么")
"""

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from .vectorstore import LanceDBVectorStore, Document, get_vectorstore
from .embeddings import get_embedding_service

logger = logging.getLogger(__name__)

# Todo 向量集合名称
TODO_COLLECTION_ID = "__todos__"


@dataclass
class TodoDocument:
    """待办文档结构"""
    id: int
    title: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    due_date: Optional[int] = None
    tags: List[str] = field(default_factory=list)

    def to_search_text(self) -> str:
        """
        生成用于搜索的文本

        将待办的各种信息组合成一段完整的文本，
        便于语义搜索时匹配相关内容。
        """
        parts = [f"待办：{self.title}"]

        if self.description:
            parts.append(f"描述：{self.description}")

        if self.category_name:
            parts.append(f"分类：{self.category_name}")

        priority_names = {
            "low": "低优先级",
            "medium": "中等优先级",
            "high": "高优先级",
            "urgent": "紧急"
        }
        parts.append(f"优先级：{priority_names.get(self.priority, self.priority)}")

        status_names = {
            "pending": "待处理",
            "in_progress": "进行中",
            "completed": "已完成",
            "cancelled": "已取消"
        }
        parts.append(f"状态：{status_names.get(self.status, self.status)}")

        if self.due_date:
            dt = datetime.fromtimestamp(self.due_date / 1000)
            parts.append(f"截止时间：{dt.strftime('%Y年%m月%d日 %H:%M')}")

        if self.tags:
            parts.append(f"标签：{', '.join(self.tags)}")

        return "\n".join(parts)

    def to_document(self) -> Document:
        """转换为向量存储文档"""
        return Document(
            id=str(self.id),
            content=self.to_search_text(),
            metadata={
                "todo_id": self.id,
                "title": self.title,
                "description": self.description,
                "category_id": self.category_id,
                "category_name": self.category_name,
                "priority": self.priority,
                "status": self.status,
                "due_date": self.due_date,
                "tags": self.tags,
            }
        )


class TodoVectorStore:
    """
    待办向量存储

    提供待办事项的语义搜索能力。
    """

    def __init__(self):
        """初始化待办向量存储"""
        self._vectorstore = get_vectorstore()
        self._embedding_service = get_embedding_service()
        self._initialized = False

    async def _ensure_collection(self):
        """确保集合已创建"""
        if self._initialized:
            return

        if not self._vectorstore.collection_exists(TODO_COLLECTION_ID):
            self._vectorstore.create_collection(
                TODO_COLLECTION_ID,
                vector_dim=self._embedding_service.dimension
            )
            logger.info(f"[TodoVectorStore] 创建待办向量集合: {TODO_COLLECTION_ID}")

        self._initialized = True

    async def add_todo(self, todo: Dict[str, Any], category_name: Optional[str] = None) -> bool:
        """
        添加待讲到向量存储

        Args:
            todo: 待办数据
            category_name: 分类名称（可选，用于搜索文本）

        Returns:
            是否添加成功
        """
        try:
            await self._ensure_collection()

            # 解析标签
            tags = todo.get("tags", [])
            if isinstance(tags, str):
                try:
                    tags = json.loads(tags)
                except:
                    tags = []

            todo_doc = TodoDocument(
                id=todo["id"],
                title=todo["title"],
                description=todo.get("description"),
                category_id=todo.get("category_id"),
                category_name=category_name,
                priority=todo.get("priority", "medium"),
                status=todo.get("status", "pending"),
                due_date=todo.get("due_date"),
                tags=tags,
            )

            document = todo_doc.to_document()

            # 先删除旧记录（如果存在）
            self._vectorstore.delete_document(
                TODO_COLLECTION_ID, str(todo["id"]))

            # 添加新记录
            count = await self._vectorstore.add_document(
                TODO_COLLECTION_ID,
                document,
                self._embedding_service
            )

            if count > 0:
                logger.debug(
                    f"[TodoVectorStore] 添加待办: {todo['id']} - {todo['title']}")
                return True
            return False

        except Exception as e:
            logger.error(f"[TodoVectorStore] 添加待办失败: {e}")
            return False

    async def add_todos(self, todos: List[Dict[str, Any]], categories: Optional[Dict[int, str]] = None) -> int:
        """
        批量添加待办

        Args:
            todos: 待办列表
            categories: 分类 ID 到名称的映射

        Returns:
            添加成功的数量
        """
        if not todos:
            return 0

        categories = categories or {}
        count = 0

        for todo in todos:
            category_name = categories.get(todo.get("category_id"))
            if await self.add_todo(todo, category_name):
                count += 1

        return count

    def delete_todo(self, todo_id: int) -> bool:
        """
        删除待办

        Args:
            todo_id: 待办 ID

        Returns:
            是否删除成功
        """
        try:
            self._vectorstore.delete_document(TODO_COLLECTION_ID, str(todo_id))
            logger.debug(f"[TodoVectorStore] 删除待办: {todo_id}")
            return True
        except Exception as e:
            logger.error(f"[TodoVectorStore] 删除待办失败: {e}")
            return False

    async def search(
        self,
        query: str,
        k: int = 10,
        status_filter: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        语义搜索待办

        Args:
            query: 搜索查询（如"今天要做什么"、"紧急任务"）
            k: 返回数量
            status_filter: 状态过滤（如 ["pending", "in_progress"]）

        Returns:
            匹配的待办列表，包含相似度分数
        """
        try:
            await self._ensure_collection()

            # 执行向量搜索
            results = await self._vectorstore.search(
                TODO_COLLECTION_ID,
                query,
                self._embedding_service,
                k=k * 2  # 多取一些，后面还要过滤
            )

            # 转换结果
            todos = []
            for result in results:
                metadata = result.document.metadata

                # 状态过滤
                if status_filter and metadata.get("status") not in status_filter:
                    continue

                todo = {
                    "id": metadata.get("todo_id"),
                    "title": metadata.get("title"),
                    "description": metadata.get("description"),
                    "category_id": metadata.get("category_id"),
                    "category_name": metadata.get("category_name"),
                    "priority": metadata.get("priority"),
                    "status": metadata.get("status"),
                    "due_date": metadata.get("due_date"),
                    "tags": metadata.get("tags", []),
                    "score": result.score,  # 相似度分数
                }
                todos.append(todo)

            # 截断到 k 条
            return todos[:k]

        except Exception as e:
            logger.error(f"[TodoVectorStore] 搜索失败: {e}")
            return []

    async def get_upcoming_todos(self, days: int = 7) -> List[Dict[str, Any]]:
        """
        获取即将到期的待办

        Args:
            days: 未来几天

        Returns:
            即将到期的待办列表
        """
        now = datetime.now()
        end_time = int((now.timestamp() + days * 86400) * 1000)

        # 搜索即将到期的待办
        results = await self.search(
            f"未来{days}天内到期的待办",
            k=20,
            status_filter=["pending", "in_progress"]
        )

        # 过滤时间范围
        upcoming = []
        for todo in results:
            due_date = todo.get("due_date")
            if due_date and due_date <= end_time:
                upcoming.append(todo)

        return upcoming

    def get_stats(self) -> Dict[str, Any]:
        """获取向量存储统计信息"""
        count = self._vectorstore.get_document_count(TODO_COLLECTION_ID)
        return {
            "collection_id": TODO_COLLECTION_ID,
            "document_count": count,
        }


# 全局待办向量存储实例
_global_todo_vectorstore: Optional[TodoVectorStore] = None


def get_todo_vectorstore() -> TodoVectorStore:
    """获取全局待办向量存储实例"""
    global _global_todo_vectorstore

    if _global_todo_vectorstore is None:
        _global_todo_vectorstore = TodoVectorStore()

    return _global_todo_vectorstore
