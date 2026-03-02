"""
Notes 笔记工具

提供 AI Agent 搜索笔记内容的能力。

工具列表：
1. SearchNotesTool - 语义搜索笔记内容
"""

from typing import Optional, List
from pydantic import Field
import logging
import asyncio

from .tools import BaseTool, ToolSchema, global_tool_registry

logger = logging.getLogger(__name__)


class SearchNotesTool(BaseTool):
    """
    语义搜索笔记工具

    通过自然语言语义搜索笔记内容，适合用户用自然语言提问的场景。
    """

    name = "search_notes"
    description = """通过自然语言语义搜索用户笔记内容。

【使用场景】
- 用户问"我之前写的关于架构设计的笔记"
- 用户问"React Hooks 怎么使用"
- 用户问"有没有关于项目部署的文档"
- 用户问"我记录的学习笔记里有什么"

【返回格式】
返回匹配的笔记片段，按相关度排序，包含文件路径、标题、内容片段等信息。

【注意】
此工具通过语义相似度匹配，可能不完全准确。如果用户想打开特定文件，请告知用户文件路径。
"""

    class ArgsSchema(ToolSchema):
        query: str = Field(
            description="搜索查询，如'React Hooks 用法'、'架构设计'、'项目部署流程'"
        )
        file_path_filter: Optional[str] = Field(
            default=None,
            description="文件路径过滤，只搜索指定文件"
        )
        limit: int = Field(
            default=5,
            description="返回数量限制，默认 5 条"
        )

    args_schema = ArgsSchema

    def _run(
        self,
        query: str,
        file_path_filter: Optional[str] = None,
        limit: int = 5,
    ) -> str:
        """语义搜索笔记"""
        try:
            from api.direct_api import direct_search_notes

            # 尝试在现有事件循环中运行
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # 创建新线程运行异步代码
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(
                            asyncio.run,
                            direct_search_notes(query, k=limit, file_path_filter=file_path_filter)
                        )
                        results = future.result(timeout=30)
                else:
                    results = loop.run_until_complete(
                        direct_search_notes(query, k=limit, file_path_filter=file_path_filter)
                    )
            except RuntimeError:
                results = asyncio.run(
                    direct_search_notes(query, k=limit, file_path_filter=file_path_filter)
                )

            if not results:
                return f"没有找到与「{query}」相关的笔记内容。"

            # 格式化结果
            lines = [f"📝 找到 {len(results)} 条与「{query}」相关的笔记：", ""]

            for note in results:
                score_str = f"(相关度: {note.get('score', 0):.2f})"
                
                lines.append(f"📄 **{note.get('file_name', '未知文件')}** {score_str}")
                
                if note.get('heading'):
                    lines.append(f"   章节：{note['heading']}")
                
                # 显示内容片段（截取前 200 字符）
                content = note.get('content', '')
                if len(content) > 200:
                    content = content[:200] + "..."
                lines.append(f"   内容：{content}")
                
                # 添加文件路径（可点击）
                lines.append(f"   路径：`{note.get('file_path', '')}`")
                lines.append("")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"语义搜索笔记失败: {e}")
            return f"❌ 搜索失败：{str(e)}"

    async def _call_async(
        self,
        query: str,
        file_path_filter: Optional[str] = None,
        limit: int = 5,
    ) -> str:
        """异步执行语义搜索（Deep Agent 会调用此方法）"""
        try:
            from api.direct_api import direct_search_notes

            results = await direct_search_notes(query, k=limit, file_path_filter=file_path_filter)

            if not results:
                return f"没有找到与「{query}」相关的笔记内容。"

            # 格式化结果
            lines = [f"📝 找到 {len(results)} 条与「{query}」相关的笔记：", ""]

            for note in results:
                score_str = f"(相关度: {note.get('score', 0):.2f})"
                
                lines.append(f"📄 **{note.get('file_name', '未知文件')}** {score_str}")
                
                if note.get('heading'):
                    lines.append(f"   章节：{note['heading']}")
                
                # 显示内容片段（截取前 200 字符）
                content = note.get('content', '')
                if len(content) > 200:
                    content = content[:200] + "..."
                lines.append(f"   内容：{content}")
                
                # 添加文件路径
                lines.append(f"   路径：`{note.get('file_path', '')}`")
                lines.append("")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"语义搜索笔记失败: {e}")
            return f"❌ 搜索失败：{str(e)}"


def register_notes_tools():
    """
    注册所有 Notes 工具到全局注册中心
    """
    tools = [
        SearchNotesTool(),
    ]

    for tool in tools:
        global_tool_registry.register(tool)
        logger.info(f"已注册 Notes 工具: {tool.name}")

    return len(tools)
