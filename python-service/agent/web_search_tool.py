"""
网页搜索工具

提供网页搜索能力，让 Agent 和普通 LLM 可以获取实时网络信息。

支持的搜索类型：
1. 普通搜索：获取网页结果
2. 新闻搜索：获取最新新闻
3. 图片搜索：获取图片结果

使用 DuckDuckGo 作为搜索引擎（无需 API 密钥）。
"""

import logging
from typing import Optional, List, Dict, Any
from pydantic import Field

from agent.tools import BaseTool, ToolSchema

logger = logging.getLogger(__name__)


class WebSearchSchema(ToolSchema):
    """网页搜索参数 Schema"""

    query: str = Field(
        description="搜索关键词，如 'Python 教程' 或 '今日新闻'"
    )
    max_results: int = Field(
        default=5,
        ge=1,
        le=10,
        description="返回结果数量，默认 5 个，最多 10 个"
    )
    region: str = Field(
        default="cn-zh",
        description="搜索区域，如 'cn-zh'（中国）、'us-en'（美国）"
    )


class WebSearchTool(BaseTool):
    """
    网页搜索工具

    使用 DuckDuckGo 搜索引擎获取网页信息。
    无需 API 密钥，支持多语言搜索。

    功能：
    - 搜索网页内容
    - 获取网页标题、链接、摘要
    - 支持指定搜索区域和结果数量

    使用示例：
    - 用户问："今天有什么新闻？"
    - Agent 调用 web_search(query="今日新闻", max_results=5)
    - 返回搜索结果供 Agent 分析
    """

    name = "web_search"
    description = (
        "搜索互联网获取实时信息。"
        "当用户询问时事新闻、最新动态、实时数据、或你不确定的信息时，使用此工具。"
        "例如：'今天的天气'、'最新的 AI 新闻'、'Python 最新版本'等。"
    )
    args_schema = WebSearchSchema

    def _run(
        self,
        query: str,
        max_results: int = 5,
        region: str = "cn-zh"
    ) -> str:
        """
        执行网页搜索

        Args:
            query: 搜索关键词
            max_results: 最大结果数
            region: 搜索区域

        Returns:
            搜索结果的格式化字符串
        """
        try:
            # 新版 duckduckgo_search 已重命名为 ddgs
            try:
                from ddgs import DDGS
            except ImportError:
                from duckduckgo_search import DDGS
        except ImportError:
            return "错误：未安装 ddgs 库，请运行 pip install ddgs"

        try:
            logger.info(
                f"[WebSearch] 搜索: {query}, 区域: {region}, 数量: {max_results}")

            results = []
            with DDGS() as ddgs:
                # 执行搜索 - 新版 ddgs 使用 query 参数
                search_results = list(ddgs.text(
                    query=query,
                    region=region,
                    max_results=max_results
                ))

            if not search_results:
                return f"未找到关于 '{query}' 的搜索结果"

            # 格式化结果
            formatted_results = []
            for i, result in enumerate(search_results, 1):
                title = result.get("title", "无标题")
                href = result.get("href", "无链接")
                body = result.get("body", "无摘要")

                formatted_results.append(
                    f"【{i}】{title}\n"
                    f"   链接: {href}\n"
                    f"   摘要: {body[:200]}{'...' if len(body) > 200 else ''}"
                )

            return f"搜索 '{query}' 找到 {len(search_results)} 个结果：\n\n" + "\n\n".join(formatted_results)

        except Exception as e:
            error_msg = f"搜索失败: {str(e)}"
            logger.error(f"[WebSearch] {error_msg}")
            return error_msg


class NewsSearchSchema(ToolSchema):
    """新闻搜索参数 Schema"""

    query: str = Field(
        description="新闻搜索关键词"
    )
    max_results: int = Field(
        default=5,
        ge=1,
        le=10,
        description="返回新闻数量"
    )


class NewsSearchTool(BaseTool):
    """
    新闻搜索工具

    专门用于搜索最新新闻，结果更加聚焦于新闻报道。
    """

    name = "news_search"
    description = (
        "搜索最新新闻。"
        "当用户想了解最新发生的新闻事件时使用。"
        "例如：'今天的科技新闻'、'最新的财经动态'等。"
    )
    args_schema = NewsSearchSchema

    def _run(self, query: str, max_results: int = 5) -> str:
        """执行新闻搜索"""
        try:
            # 新版 duckduckgo_search 已重命名为 ddgs
            try:
                from ddgs import DDGS
            except ImportError:
                from duckduckgo_search import DDGS
        except ImportError:
            return "错误：未安装 ddgs 库"

        try:
            logger.info(f"[NewsSearch] 搜索新闻: {query}")

            results = []
            with DDGS() as ddgs:
                # 使用新闻搜索 - 新版 ddgs 使用 query 参数
                news_results = list(ddgs.news(
                    query=query,
                    max_results=max_results
                ))

            if not news_results:
                return f"未找到关于 '{query}' 的新闻"

            # 格式化结果
            formatted_results = []
            for i, result in enumerate(news_results, 1):
                title = result.get("title", "无标题")
                url = result.get("url", "无链接")
                body = result.get("body", "无摘要")
                source = result.get("source", "未知来源")
                date = result.get("date", "未知日期")

                formatted_results.append(
                    f"【{i}】{title}\n"
                    f"   来源: {source} | 日期: {date}\n"
                    f"   链接: {url}\n"
                    f"   摘要: {body[:150]}{'...' if len(body) > 150 else ''}"
                )

            return f"新闻搜索 '{query}' 找到 {len(news_results)} 条新闻：\n\n" + "\n\n".join(formatted_results)

        except Exception as e:
            error_msg = f"新闻搜索失败: {str(e)}"
            logger.error(f"[NewsSearch] {error_msg}")
            return error_msg


# 注册工具的辅助函数
def register_web_search_tools(registry):
    """
    注册网页搜索相关工具到工具注册中心

    Args:
        registry: ToolRegistry 实例
    """
    registry.register(WebSearchTool())
    registry.register(NewsSearchTool())
    logger.info("已注册网页搜索工具: web_search, news_search")
