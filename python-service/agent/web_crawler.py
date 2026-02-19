"""
网页爬取服务

提供 URL 内容抓取、解析、分块、入库的完整流程。
"""

import json
import logging
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)


@dataclass
class CrawledContent:
    """抓取的网页内容"""
    url: str
    title: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "title": self.title,
            "content": self.content,
            "metadata": self.metadata,
        }


@dataclass
class TextChunk:
    """文本分块"""
    id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "metadata": self.metadata,
        }


class WebCrawlerService:
    """
    网页爬取服务

    功能：
    1. 抓取网页内容
    2. 解析 HTML 提取正文
    3. 文本分块
    4. 向量化入库

    使用示例：
        crawler = WebCrawlerService()
        content = await crawler.fetch("https://example.com")
        chunks = crawler.chunk(content)
        await crawler.store(chunks, "knowledge_id")
    """

    # 请求超时设置
    TIMEOUT = 30.0

    # 请求头
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }

    # 内容选择器优先级（用于提取正文）
    CONTENT_SELECTORS = [
        "article",
        "[role='main']",
        "main",
        "#content",
        "#main",
        ".content",
        ".main",
        ".article",
        ".post",
        ".entry-content",
    ]

    # 需要排除的标签
    EXCLUDE_TAGS = [
        "nav", "header", "footer", "aside", "script", "style",
        "iframe", "form", "button", "input", "select", "textarea",
        "noscript", "svg", "path", "meta", "link",
    ]

    def __init__(self, max_length: int = 50000):
        """
        初始化爬取服务

        Args:
            max_length: 最大抓取字符数
        """
        self._max_length = max_length

    def validate_url(self, url: str) -> bool:
        """
        验证 URL 格式

        Args:
            url: URL 字符串

        Returns:
            是否有效
        """
        try:
            result = urlparse(url)
            return all([result.scheme in ("http", "https"), result.netloc])
        except Exception:
            return False

    async def fetch(self, url: str) -> CrawledContent:
        """
        抓取网页内容

        Args:
            url: 网页地址

        Returns:
            抓取的内容

        Raises:
            ValueError: URL 无效
            httpx.HTTPError: 请求失败
        """
        # 验证 URL
        if not self.validate_url(url):
            raise ValueError(f"无效的 URL: {url}")

        logger.info(f"[WebCrawler] 开始抓取: {url}")

        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            response = await client.get(url, headers=self.HEADERS, follow_redirects=True)
            response.raise_for_status()

            # 检查内容类型
            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                raise ValueError(f"不支持的内容类型: {content_type}")

            # 解析 HTML
            html_content = response.text
            parsed = self._parse_html(url, html_content)

            logger.info(f"[WebCrawler] 抓取成功: {parsed.title}, 内容长度: {len(parsed.content)}")

            return parsed

    def _parse_html(self, url: str, html: str) -> CrawledContent:
        """
        解析 HTML，提取标题和正文

        Args:
            url: 原始 URL
            html: HTML 内容

        Returns:
            解析后的内容
        """
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")

        # 提取标题
        title = ""
        if soup.title:
            title = soup.title.get_text(strip=True)

        # 移除不需要的标签
        for tag in soup.find_all(self.EXCLUDE_TAGS):
            tag.decompose()

        # 尝试提取正文
        content = ""
        for selector in self.CONTENT_SELECTORS:
            element = soup.select_one(selector)
            if element:
                content = element.get_text(separator="\n", strip=True)
                if len(content) > 200:  # 确保有足够的内容
                    break

        # 如果没有找到正文，提取所有段落
        if not content:
            paragraphs = soup.find_all("p")
            content = "\n\n".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))

        # 如果还是没有内容，提取 body
        if not content and soup.body:
            content = soup.body.get_text(separator="\n", strip=True)

        # 清理内容
        content = self._clean_text(content)

        # 截断过长内容
        if len(content) > self._max_length:
            content = content[:self._max_length]
            logger.info(f"[WebCrawler] 内容已截断至 {self._max_length} 字符")

        # 提取元数据
        metadata = self._extract_metadata(url, soup, html)

        return CrawledContent(
            url=url,
            title=title,
            content=content,
            metadata=metadata,
        )

    def _clean_text(self, text: str) -> str:
        """
        清理文本

        Args:
            text: 原始文本

        Returns:
            清理后的文本
        """
        # 移除多余空白
        text = re.sub(r"[ \t]+", " ", text)
        # 移除多余换行
        text = re.sub(r"\n{3,}", "\n\n", text)
        # 移除行首行尾空白
        lines = [line.strip() for line in text.split("\n")]
        text = "\n".join(lines)
        return text.strip()

    def _extract_metadata(
        self,
        url: str,
        soup: "BeautifulSoup",
        html: str
    ) -> Dict[str, Any]:
        """
        提取网页元数据

        Args:
            url: 原始 URL
            soup: BeautifulSoup 对象
            html: 原始 HTML

        Returns:
            元数据字典
        """
        metadata = {
            "source_url": url,
            "source_type": "web",
            "crawled_at": datetime.now().isoformat(),
        }

        # 提取 description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            metadata["description"] = meta_desc["content"]

        # 提取 keywords
        meta_keywords = soup.find("meta", attrs={"name": "keywords"})
        if meta_keywords and meta_keywords.get("content"):
            metadata["keywords"] = meta_keywords["content"]

        # 提取作者
        meta_author = soup.find("meta", attrs={"name": "author"})
        if meta_author and meta_author.get("content"):
            metadata["author"] = meta_author["content"]

        # 提取发布时间
        for attr in ["article:published_time", "publishdate", "date"]:
            meta_date = soup.find("meta", attrs={"property": attr}) or \
                soup.find("meta", attrs={"name": attr})
            if meta_date and meta_date.get("content"):
                metadata["published_at"] = meta_date["content"]
                break

        # 提取站点名称
        meta_site = soup.find("meta", attrs={"property": "og:site_name"})
        if meta_site and meta_site.get("content"):
            metadata["site_name"] = meta_site["content"]

        return metadata

    def chunk(
        self,
        content: CrawledContent,
        chunk_size: int = 500,
        overlap: int = 50,
    ) -> List[TextChunk]:
        """
        文本分块

        Args:
            content: 抓取的内容
            chunk_size: 分块大小（字符数）
            overlap: 重叠字符数

        Returns:
            分块列表
        """
        text = content.content
        if not text:
            return []

        # 按段落分割
        paragraphs = re.split(r"\n\n+", text)

        chunks = []
        current_chunk = ""
        chunk_index = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # 如果当前段落太长，需要拆分
            if len(para) > chunk_size:
                # 先保存当前块
                if current_chunk:
                    chunks.append(self._create_chunk(
                        content, current_chunk.strip(), chunk_index
                    ))
                    chunk_index += 1
                    current_chunk = ""

                # 拆分段落
                for i in range(0, len(para), chunk_size - overlap):
                    chunk_text = para[i:i + chunk_size]
                    if len(chunk_text) > overlap:  # 过小的块跳过
                        chunks.append(self._create_chunk(
                            content, chunk_text, chunk_index
                        ))
                        chunk_index += 1

            # 如果加入这个段落不超过限制，加入
            elif len(current_chunk) + len(para) + 2 <= chunk_size:
                current_chunk += "\n\n" + para if current_chunk else para

            # 否则保存当前块，开始新块
            else:
                if current_chunk:
                    chunks.append(self._create_chunk(
                        content, current_chunk.strip(), chunk_index
                    ))
                    chunk_index += 1
                current_chunk = para

        # 保存最后一个块
        if current_chunk:
            chunks.append(self._create_chunk(
                content, current_chunk.strip(), chunk_index
            ))

        logger.info(f"[WebCrawler] 分块完成: {len(chunks)} 个块")
        return chunks

    def _create_chunk(
        self,
        content: CrawledContent,
        text: str,
        index: int,
    ) -> TextChunk:
        """
        创建文本分块

        Args:
            content: 原始内容
            text: 分块文本
            index: 分块索引

        Returns:
            文本分块
        """
        chunk_id = f"web_{uuid.uuid4().hex[:8]}_{index}"

        metadata = {
            **content.metadata,
            "chunk_index": index,
            "chunk_length": len(text),
            "title": content.title,
        }

        return TextChunk(
            id=chunk_id,
            content=text,
            metadata=metadata,
        )

    async def store(
        self,
        chunks: List[TextChunk],
        knowledge_id: str,
    ) -> Dict[str, Any]:
        """
        存储分块到知识库

        Args:
            chunks: 分块列表
            knowledge_id: 知识库 ID

        Returns:
            存储结果
        """
        if not chunks:
            return {"success": False, "error": "没有内容需要存储"}

        try:
            from rag.vectorstore import get_vectorstore, Document
            from rag.embeddings import get_embedding_service

            vectorstore = get_vectorstore()
            embedding_service = get_embedding_service()

            # 确保知识库存在
            if not vectorstore.collection_exists(knowledge_id):
                vectorstore.create_collection(
                    knowledge_id,
                    vector_dim=embedding_service.dimension
                )

            # 转换为 Document 格式
            documents = [
                Document(
                    id=chunk.id,
                    content=chunk.content,
                    metadata=chunk.metadata,
                )
                for chunk in chunks
            ]

            # 添加到向量库
            count = await vectorstore.add_documents(
                knowledge_id=knowledge_id,
                documents=documents,
                embedding_service=embedding_service,
            )

            return {
                "success": True,
                "document_count": count,
                "knowledge_id": knowledge_id,
            }

        except Exception as e:
            logger.error(f"[WebCrawler] 存储失败: {e}")
            return {"success": False, "error": str(e)}

    async def crawl_and_store(
        self,
        url: str,
        knowledge_id: str,
        title: Optional[str] = None,
        chunk_size: int = 500,
    ) -> Dict[str, Any]:
        """
        完整的爬取入库流程

        Args:
            url: 网页地址
            knowledge_id: 知识库 ID
            title: 自定义标题（可选）
            chunk_size: 分块大小

        Returns:
            处理结果
        """
        try:
            # 1. 抓取内容
            content = await self.fetch(url)

            # 使用自定义标题
            if title:
                content.title = title

            # 2. 分块
            chunks = self.chunk(content, chunk_size=chunk_size)

            # 3. 入库
            result = await self.store(chunks, knowledge_id)

            if result["success"]:
                return {
                    "success": True,
                    "url": url,
                    "title": content.title,
                    "chunks": len(chunks),
                    "knowledge_id": knowledge_id,
                    "document_count": result["document_count"],
                }
            else:
                return result

        except Exception as e:
            logger.error(f"[WebCrawler] 爬取入库失败: {e}")
            return {"success": False, "error": str(e)}


# 全局服务实例
_web_crawler: Optional[WebCrawlerService] = None


def get_web_crawler() -> WebCrawlerService:
    """获取全局爬虫服务实例"""
    global _web_crawler
    if _web_crawler is None:
        _web_crawler = WebCrawlerService()
    return _web_crawler


# ==================== 工具定义 ====================

from agent.tools import BaseTool, ToolSchema, global_tool_registry
from pydantic import Field


class WebCrawlSchema(ToolSchema):
    """网页采集工具参数"""

    url: str = Field(
        description="要抓取的网页地址"
    )
    knowledge_id: str = Field(
        description="目标知识库 ID"
    )
    title: Optional[str] = Field(
        default=None,
        description="自定义标题（可选）"
    )
    chunk_size: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="分块大小（字符数），默认 500"
    )


class WebCrawlTool(BaseTool):
    """
    网页采集工具

    抓取网页内容并添加到知识库。

    功能：
    - 抓取网页 HTML 内容
    - 提取标题和正文
    - 自动分块处理
    - 向量化入库

    使用场景：
    - 用户想保存网页内容到知识库
    - 需要采集在线文档
    - 收集技术博客或文章

    示例：
    用户: "帮我把这篇文章保存到知识库：https://example.com/article"
    Agent: 调用 web_crawl(url="https://...", knowledge_id="xxx")
    工具: 返回入库结果
    """

    name = "web_crawl"
    description = (
        "抓取网页内容并添加到知识库。"
        "当用户想要保存网页、文章或在线文档时使用此工具。"
        "例如：'帮我把这个网页保存到知识库'、'收藏这篇文章'等。"
    )
    args_schema = WebCrawlSchema

    def _run(
        self,
        url: str,
        knowledge_id: str,
        title: Optional[str] = None,
        chunk_size: int = 500,
    ) -> str:
        """
        执行网页采集

        Args:
            url: 网页地址
            knowledge_id: 知识库 ID
            title: 自定义标题
            chunk_size: 分块大小

        Returns:
            执行结果
        """
        import asyncio

        try:
            crawler = get_web_crawler()

            # 执行爬取入库
            result = asyncio.run(crawler.crawl_and_store(
                url=url,
                knowledge_id=knowledge_id,
                title=title,
                chunk_size=chunk_size,
            ))

            if result.get("success"):
                return (
                    f"网页采集成功！\n"
                    f"标题: {result.get('title', '未知')}\n"
                    f"来源: {result.get('url')}\n"
                    f"分块数: {result.get('chunks', 0)}\n"
                    f"已保存到知识库: {result.get('knowledge_id')}"
                )
            else:
                return f"采集失败: {result.get('error', '未知错误')}"

        except Exception as e:
            error_msg = f"网页采集失败: {str(e)}"
            logger.error(f"[WebCrawlTool] {error_msg}")
            return error_msg


class WebFetchSchema(ToolSchema):
    """网页内容获取工具参数"""

    url: str = Field(
        description="要获取的网页地址"
    )
    max_length: int = Field(
        default=5000,
        ge=500,
        le=50000,
        description="最大获取字符数，默认 5000"
    )


class WebFetchTool(BaseTool):
    """
    网页内容获取工具

    仅获取网页内容，不入库。用于快速查看网页内容。

    使用场景：
    - 查看网页内容
    - 提取网页信息
    - 阅读在线文章
    """

    name = "web_fetch"
    description = (
        "获取网页内容。"
        "当需要查看网页内容但不需要保存到知识库时使用。"
        "例如：'帮我看看这个网页说了什么'、'阅读这篇文章并总结'等。"
    )
    args_schema = WebFetchSchema

    def _run(self, url: str, max_length: int = 5000) -> str:
        """获取网页内容"""
        import asyncio

        try:
            crawler = get_web_crawler()
            crawler._max_length = max_length

            content = asyncio.run(crawler.fetch(url))

            return (
                f"标题: {content.title}\n"
                f"来源: {content.url}\n\n"
                f"{content.content}"
            )

        except Exception as e:
            return f"获取网页失败: {str(e)}"


def register_web_crawl_tools(registry=None):
    """
    注册网页采集相关工具

    Args:
        registry: 工具注册中心（可选，默认使用全局注册中心）
    """
    if registry is None:
        registry = global_tool_registry

    # 注册网页采集工具
    web_crawl_tool = WebCrawlTool()
    if web_crawl_tool.name not in registry.list_tools():
        registry.register(web_crawl_tool)
        logger.info("已注册网页采集工具: web_crawl")

    # 注册网页获取工具
    web_fetch_tool = WebFetchTool()
    if web_fetch_tool.name not in registry.list_tools():
        registry.register(web_fetch_tool)
        logger.info("已注册网页获取工具: web_fetch")
