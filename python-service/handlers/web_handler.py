"""
网页采集处理器

处理网页采集相关的消息。
"""
import time
import logging
from typing import Any, Dict, Optional, Callable, Awaitable

from .base_handler import BaseHandler

logger = logging.getLogger(__name__)


class WebHandler(BaseHandler):
    """
    网页采集处理器

    处理以下消息类型：
    - web_crawl: 网页采集并存储到知识库
    - web_fetch: 仅获取网页内容
    """

    async def handle(self, message: dict) -> Optional[dict]:
        """处理网页采集消息"""
        msg_type = message.get("type")

        if msg_type == "web_crawl":
            return await self._handle_web_crawl(message)
        elif msg_type == "web_fetch":
            return await self._handle_web_fetch(message)
        else:
            return self.error_response(f"未知的网页采集消息类型: {msg_type}", message.get("id"))

    async def _handle_web_crawl(self, message: dict) -> dict:
        """
        处理网页采集请求

        抓取网页内容并添加到知识库。
        """
        url = message.get("url")
        knowledge_id = message.get("knowledgeId")
        title = message.get("title")
        chunk_size = message.get("chunkSize", 500)

        if not url:
            return {
                "type": "web_crawl_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少 URL",
            }

        if not knowledge_id:
            return {
                "type": "web_crawl_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少知识库 ID",
            }

        try:
            from agent.web_crawler import get_web_crawler

            logger.info(f"[WebCrawl] 开始采集: {url} -> {knowledge_id}")

            crawler = get_web_crawler()
            result = await crawler.crawl_and_store(
                url=url,
                knowledge_id=knowledge_id,
                title=title,
                chunk_size=chunk_size,
            )

            if result.get("success"):
                logger.info(f"[WebCrawl] 采集成功: {result.get('title')}")
                return {
                    "type": "web_crawl_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": True,
                    "url": result.get("url"),
                    "title": result.get("title"),
                    "chunks": result.get("chunks"),
                    "knowledgeId": result.get("knowledge_id"),
                    "documentCount": result.get("document_count"),
                }
            else:
                return {
                    "type": "web_crawl_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": result.get("error", "采集失败"),
                }

        except Exception as e:
            logger.error(f"[WebCrawl] 采集错误: {e}")
            return {
                "type": "web_crawl_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_web_fetch(self, message: dict) -> dict:
        """
        处理网页内容获取请求

        仅获取网页内容，不入库。
        """
        url = message.get("url")
        max_length = message.get("maxLength", 5000)

        if not url:
            return {
                "type": "web_fetch_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少 URL",
            }

        try:
            from agent.web_crawler import get_web_crawler

            logger.info(f"[WebFetch] 获取内容: {url}")

            crawler = get_web_crawler()
            crawler._max_length = max_length

            content = await crawler.fetch(url)

            logger.info(f"[WebFetch] 获取成功: {content.title}")

            return {
                "type": "web_fetch_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "url": content.url,
                "title": content.title,
                "content": content.content,
            }

        except Exception as e:
            logger.error(f"[WebFetch] 获取错误: {e}")
            return {
                "type": "web_fetch_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }
