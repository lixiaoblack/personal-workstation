"""
Todo 待办工具

提供 AI Agent 创建和管理待办事项的能力。

工具列表：
1. CreateTodoTool - 创建待办事项
2. ListCategoriesTool - 列出所有分类
3. ListTodosTool - 列出待办事项
4. CompleteTodoTool - 完成待办事项
5. AskCategoryTool - 使用 Ask 模块让用户选择分类
"""

from typing import Optional, List, Dict, Any
from pydantic import Field
import logging
import asyncio

from .tools import BaseTool, ToolSchema, global_tool_registry
from api.direct_api import (
    direct_create_todo,
    direct_list_todo_categories,
    direct_list_todos,
    direct_get_today_todos,
    direct_update_todo_status,
)

logger = logging.getLogger(__name__)

# 全局 AskHandler 引用，由 MessageHandler 设置
_ask_handler = None


def set_ask_handler(handler):
    """设置全局 AskHandler 引用"""
    global _ask_handler
    _ask_handler = handler
    logger.info("[TodoTool] 已设置 AskHandler 引用")


def get_ask_handler():
    """获取全局 AskHandler 引用"""
    return _ask_handler


class CreateTodoTool(BaseTool):
    """
    创建待办工具

    AI 可以通过自然语言创建待办事项。
    支持设置标题、描述、分类、优先级、截止时间等。

    使用场景：
    - 用户说"提醒我明天下午3点开会"
    - 用户说"添加一个高优先级任务：完成项目报告"
    - 用户说"创建一个待办：买牛奶，明天之前"
    """

    name = "create_todo"
    description = """创建待办事项。

【重要】创建待办前必须先确认分类：
1. 如果用户没有指定分类，调用 ask_todo_category 工具弹出 UI 让用户选择
2. ask_todo_category 会返回选中的分类 ID 或 "none"（不指定分类）
3. 根据返回结果设置 category_id 参数

支持的参数：
- 标题（必填）
- 描述/详情
- 分类 ID（通过 ask_todo_category 获取）
- 优先级：low（低）、medium（中）、high（高）、urgent（紧急）
- 截止时间：支持自然语言如"明天下午3点"、"下周一"
- 重复类型：none（不重复）、daily（每天）、weekly（每周）、monthly（每月）

示例流程：
用户: "帮我添加一个待办，明天下午3点开会"
AI: 调用 ask_todo_category(title="明天下午3点开会")
工具返回: "selected:1"
AI: 调用 create_todo(title="明天下午3点开会", category_id=1, due_date="明天下午3点")
"""

    class ArgsSchema(ToolSchema):
        title: str = Field(description="待办标题（必填），简洁描述任务内容")
        description: Optional[str] = Field(
            default=None,
            description="待办详情/描述"
        )
        category_id: Optional[int] = Field(
            default=None,
            description="分类 ID（整数），可以通过 list_todo_categories 获取"
        )
        priority: str = Field(
            default="medium",
            description="优先级：low（低）、medium（中，默认）、high（高）、urgent（紧急）"
        )
        due_date: Optional[str] = Field(
            default=None,
            description="截止时间，支持自然语言如'明天下午3点'、'下周一'、'2024-01-15 18:00'"
        )
        reminder_time: Optional[str] = Field(
            default=None,
            description="提醒时间，格式同 due_date"
        )
        repeat_type: str = Field(
            default="none",
            description="重复类型：none（不重复，默认）、daily（每天）、weekly（每周）、monthly（每月）"
        )
        tags: Optional[str] = Field(
            default=None,
            description="标签，多个用逗号分隔，如'工作,重要'"
        )

    args_schema = ArgsSchema

    def _run(
        self,
        title: str,
        description: Optional[str] = None,
        category_id: Optional[int] = None,
        priority: str = "medium",
        due_date: Optional[str] = None,
        reminder_time: Optional[str] = None,
        repeat_type: str = "none",
        tags: Optional[str] = None,
    ) -> str:
        """创建待办事项"""
        try:
            # 解析截止时间
            due_date_ts = None
            if due_date:
                due_date_ts = self._parse_datetime(due_date)

            # 解析提醒时间
            reminder_ts = None
            if reminder_time:
                reminder_ts = self._parse_datetime(reminder_time)

            # 解析标签
            tags_list = None
            if tags:
                tags_list = [t.strip() for t in tags.split(",") if t.strip()]

            # 验证优先级
            valid_priorities = ["low", "medium", "high", "urgent"]
            if priority not in valid_priorities:
                priority = "medium"

            # 验证重复类型
            valid_repeats = ["none", "daily", "weekly", "monthly", "yearly"]
            if repeat_type not in valid_repeats:
                repeat_type = "none"

            # 创建待办
            result = direct_create_todo(
                title=title,
                description=description,
                category_id=category_id,
                priority=priority,
                due_date=due_date_ts,
                reminder_time=reminder_ts,
                repeat_type=repeat_type,
                tags=tags_list,
            )

            if result:
                # 格式化返回信息
                info_parts = [f"✅ 已创建待办：{result['title']}"]
                if result.get('priority'):
                    priority_names = {
                        "low": "低", "medium": "中", "high": "高", "urgent": "紧急"}
                    info_parts.append(
                        f"   优先级：{priority_names.get(result['priority'], result['priority'])}")
                if result.get('due_date'):
                    from datetime import datetime
                    dt = datetime.fromtimestamp(result['due_date'] / 1000)
                    info_parts.append(
                        f"   截止时间：{dt.strftime('%Y-%m-%d %H:%M')}")
                if result.get('repeat_type') and result['repeat_type'] != 'none':
                    repeat_names = {"daily": "每天", "weekly": "每周",
                                    "monthly": "每月", "yearly": "每年"}
                    info_parts.append(
                        f"   重复：{repeat_names.get(result['repeat_type'], result['repeat_type'])}")

                return "\n".join(info_parts)
            else:
                return "❌ 创建待办失败"

        except Exception as e:
            logger.error(f"创建待办失败: {e}")
            return f"❌ 创建待办失败：{str(e)}"

    def _parse_datetime(self, datetime_str: str) -> Optional[int]:
        """
        解析自然语言时间

        支持：
        - 相对时间：明天、后天、下周一
        - 时间点：下午3点、18:00
        - 组合：明天下午3点
        - 具体日期：2024-01-15、2024/01/15
        """
        from datetime import datetime, timedelta
        import re

        now = datetime.now()
        result = None

        datetime_str = datetime_str.strip().lower()

        # 解析日期部分
        date_part = now

        if "明天" in datetime_str:
            date_part = now + timedelta(days=1)
            datetime_str = datetime_str.replace("明天", "")
        elif "后天" in datetime_str:
            date_part = now + timedelta(days=2)
            datetime_str = datetime_str.replace("后天", "")
        elif "下周" in datetime_str:
            # 计算下周几
            weekdays = ["一", "二", "三", "四", "五", "六", "日"]
            for i, day in enumerate(weekdays):
                if day in datetime_str:
                    days_ahead = 7 - now.weekday() + i
                    date_part = now + timedelta(days=days_ahead)
                    datetime_str = datetime_str.replace(f"下周{day}", "")
                    break

        # 解析时间部分
        time_part = None

        # 匹配 HH:MM 格式
        time_match = re.search(r"(\d{1,2}):(\d{2})", datetime_str)
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            time_part = (hour, minute)
        else:
            # 匹配 上午/下午 X 点 格式
            am_match = re.search(r"上午\s*(\d{1,2})\s*点?", datetime_str)
            pm_match = re.search(r"下午\s*(\d{1,2})\s*点?", datetime_str)

            if am_match:
                hour = int(am_match.group(1))
                time_part = (hour, 0)
            elif pm_match:
                hour = int(pm_match.group(1))
                # 下午的时间需要加12
                if hour < 12:
                    hour += 12
                time_part = (hour, 0)
            else:
                # 只有一个数字
                num_match = re.search(r"(\d{1,2})\s*点", datetime_str)
                if num_match:
                    hour = int(num_match.group(1))
                    # 默认当作下午处理
                    if hour < 12:
                        hour += 12
                    time_part = (hour, 0)

        # 组合日期和时间
        if time_part:
            result = date_part.replace(
                hour=time_part[0], minute=time_part[1], second=0, microsecond=0)
        else:
            # 没有时间部分，默认设置为当天的 18:00
            result = date_part.replace(
                hour=18, minute=0, second=0, microsecond=0)

        # 转换为毫秒时间戳
        return int(result.timestamp() * 1000)


class ListTodoCategoriesTool(BaseTool):
    """
    列出待办分类工具

    获取所有待办分类，用于创建待办时选择分类。
    """

    name = "list_todo_categories"
    description = """获取所有待办分类列表。

【使用场景】
- 用户创建待办时，需要让用户选择分类
- 用户想查看有哪些分类

【返回格式】
返回分类列表，包含 ID 和名称，便于用户选择。

【调用时机】
在调用 create_todo 之前，如果没有指定分类，必须先调用此工具获取分类列表让用户选择。
"""

    class ArgsSchema(ToolSchema):
        pass

    args_schema = ArgsSchema

    def _run(self) -> str:
        """列出所有分类"""
        try:
            categories = direct_list_todo_categories()

            if not categories:
                return """暂无待办分类。

您可以：
1. 直接创建待办（不指定分类）
2. 在待办页面创建新分类

请问要直接创建待办吗？"""

            # 优化返回格式，便于 AI 理解和用户选择
            lines = ["📋 您有以下待办分类：", ""]
            for i, cat in enumerate(categories, 1):
                desc = f" - {cat['description']}" if cat.get(
                    'description') else ""
                lines.append(f"{i}. {cat['name']}{desc} (ID: {cat['id']})")

            lines.append("")
            lines.append('请选择一个分类，或者说"不需要分类"直接创建待办。')
            lines.append("")
            lines.append("【分类数据】")
            for cat in categories:
                lines.append(f"ID: {cat['id']}, 名称: {cat['name']}")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"获取分类列表失败: {e}")
            return f"❌ 获取分类列表失败：{str(e)}"


class ListTodosTool(BaseTool):
    """
    列出待办事项工具

    获取待办事项列表，可以按分类、状态、优先级过滤。
    """

    name = "list_todos"
    description = "获取待办事项列表。可以按分类、状态、优先级过滤。"

    class ArgsSchema(ToolSchema):
        category_id: Optional[int] = Field(
            default=None,
            description="分类 ID 过滤"
        )
        status: Optional[str] = Field(
            default=None,
            description="状态过滤：pending（待处理）、in_progress（进行中）、completed（已完成）、cancelled（已取消）"
        )
        priority: Optional[str] = Field(
            default=None,
            description="优先级过滤：low、medium、high、urgent"
        )
        limit: int = Field(
            default=10,
            description="返回数量限制，默认 10 条"
        )

    args_schema = ArgsSchema

    def _run(
        self,
        category_id: Optional[int] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 10,
    ) -> str:
        """列出待办事项"""
        try:
            todos = direct_list_todos(
                category_id=category_id,
                status=status,
                priority=priority,
                limit=limit,
            )

            if not todos:
                return "暂无待办事项。"

            # 状态和优先级映射
            status_names = {
                "pending": "待处理",
                "in_progress": "进行中",
                "completed": "已完成",
                "cancelled": "已取消",
            }
            priority_names = {
                "low": "低",
                "medium": "中",
                "high": "高",
                "urgent": "紧急",
            }

            lines = ["📋 待办事项列表："]
            for todo in todos:
                status_icon = "✅" if todo['status'] == 'completed' else "⏳"
                priority_str = priority_names.get(todo.get('priority'), '中')
                status_str = status_names.get(todo.get('status'), '未知')

                lines.append(f"  {status_icon} [{todo['id']}] {todo['title']}")
                lines.append(f"      状态: {status_str} | 优先级: {priority_str}")

                if todo.get('due_date'):
                    from datetime import datetime
                    dt = datetime.fromtimestamp(todo['due_date'] / 1000)
                    is_overdue = dt < datetime.now(
                    ) and todo['status'] != 'completed'
                    due_str = dt.strftime('%Y-%m-%d %H:%M')
                    if is_overdue:
                        lines.append(f"      ⚠️ 截止: {due_str} (已逾期)")
                    else:
                        lines.append(f"      截止: {due_str}")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"获取待办列表失败: {e}")
            return f"❌ 获取待办列表失败：{str(e)}"


class CompleteTodoTool(BaseTool):
    """
    完成待办工具

    将指定的待办事项标记为已完成。
    """

    name = "complete_todo"
    description = "将待办事项标记为已完成。需要提供待办 ID。"

    class ArgsSchema(ToolSchema):
        todo_id: int = Field(description="待办事项 ID")

    args_schema = ArgsSchema

    def _run(self, todo_id: int) -> str:
        """完成待办"""
        try:
            result = direct_update_todo_status(todo_id, "completed")

            if result:
                return f"✅ 已完成待办：{result['title']}"
            else:
                return f"❌ 未找到 ID 为 {todo_id} 的待办事项"

        except Exception as e:
            logger.error(f"完成待办失败: {e}")
            return f"❌ 完成待办失败：{str(e)}"


class GetTodayTodosTool(BaseTool):
    """
    获取今日待办工具

    获取今日截止和逾期的未完成待办。
    """

    name = "get_today_todos"
    description = "获取今日待办事项（包括今日截止和逾期的未完成待办）。"

    class ArgsSchema(ToolSchema):
        pass

    args_schema = ArgsSchema

    def _run(self) -> str:
        """获取今日待办"""
        try:
            from datetime import datetime

            todos = direct_get_today_todos()

            if not todos:
                return "🎉 今日暂无待办事项！"

            priority_names = {
                "low": "低",
                "medium": "中",
                "high": "高",
                "urgent": "紧急",
            }

            now = datetime.now()
            lines = [f"📅 今日待办（共 {len(todos)} 项）："]

            for todo in todos:
                priority_str = priority_names.get(todo.get('priority'), '中')
                due_str = ""
                if todo.get('due_date'):
                    dt = datetime.fromtimestamp(todo['due_date'] / 1000)
                    is_overdue = dt < now
                    if is_overdue:
                        due_str = f" ⚠️逾期"
                    else:
                        due_str = f" 截止:{dt.strftime('%H:%M')}"

                lines.append(f"  ⏳ [{todo['id']}] {todo['title']}{due_str}")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"获取今日待办失败: {e}")
            return f"❌ 获取今日待办失败：{str(e)}"


def register_todo_tools():
    """
    注册所有 Todo 工具到全局注册中心
    """
    tools = [
        CreateTodoTool(),
        ListTodoCategoriesTool(),
        ListTodosTool(),
        CompleteTodoTool(),
        GetTodayTodosTool(),
        AskCategoryTool(),
    ]

    for tool in tools:
        global_tool_registry.register(tool)
        logger.info(f"已注册 Todo 工具: {tool.name}")

    return len(tools)


class AskCategoryTool(BaseTool):
    """
    分类选择工具

    使用 Ask 模块让用户通过 UI 界面选择待办分类。
    """

    name = "ask_todo_category"
    description = """弹出 UI 让用户选择待办分类。

【使用场景】
- 用户创建待办但没有指定分类时，使用此工具让用户选择

【返回值】
- 如果用户选择了分类：返回分类 ID
- 如果用户取消：返回 "cancelled"
- 如果超时：返回 "timeout"

【调用时机】
在 create_todo 之前，如果用户没有指定分类，调用此工具让用户选择。
"""

    class ArgsSchema(ToolSchema):
        title: Optional[str] = Field(
            default=None,
            description="待办标题，用于显示在询问界面"
        )

    args_schema = ArgsSchema

    def _run(self, title: Optional[str] = None) -> str:
        """同步执行（作为降级方案，不推荐）"""
        # 获取 AskHandler
        ask_handler = get_ask_handler()
        if not ask_handler:
            # 如果没有 AskHandler，返回分类列表让 AI 处理
            categories = direct_list_todo_categories()
            if not categories:
                return "no_categories:暂无分类，可以直接创建待办（不指定分类）"
            return self._format_categories_for_ai(categories)

        # 尝试在现有事件循环中运行
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # 如果事件循环正在运行，我们不能在同步方法中等待异步结果
                # 返回提示让用户直接选择
                logger.warning("[AskCategoryTool] 事件循环正在运行，无法同步等待异步结果")
                categories = direct_list_todo_categories()
                return self._format_categories_for_ai(categories)
            else:
                return loop.run_until_complete(self._call_async(title))
        except RuntimeError:
            # 没有事件循环
            return asyncio.run(self._call_async(title))

    async def _call_async(self, title: Optional[str] = None) -> str:
        """异步执行询问（Deep Agent 会调用此方法）"""
        try:
            # 获取分类列表
            categories = direct_list_todo_categories()

            if not categories:
                return "no_categories:暂无分类，可以直接创建待办（不指定分类）"

            # 获取 AskHandler
            ask_handler = get_ask_handler()
            if not ask_handler:
                # 如果没有 AskHandler，返回分类列表让 AI 处理
                logger.warning("[AskCategoryTool] AskHandler 未设置，返回分类列表")
                return self._format_categories_for_ai(categories)

            # 构建 Ask 选项
            from ask.types import AskOption, AskType

            options = []
            for cat in categories:
                options.append(AskOption(
                    id=str(cat['id']),
                    label=cat['name'],
                    description=cat.get('description'),
                    metadata={"category_id": cat['id']}
                ))

            # 添加"不需要分类"选项
            options.append(AskOption(
                id="none",
                label="不需要分类",
                description="直接创建待办，不指定分类"
            ))

            # 执行异步询问
            ask_title = "选择待办分类"
            if title:
                ask_title = f"「{title}」放到哪个分类？"

            logger.info(f"[AskCategoryTool] 发起异步询问: {ask_title}")

            response = await ask_handler.ask_and_wait(
                ask_type=AskType.SELECT,
                title=ask_title,
                description='请选择一个分类，或选择"不需要分类"直接创建',
                options=options,
                timeout=60000,  # 60秒超时
            )

            logger.info(f"[AskCategoryTool] 收到响应: {response}")

            if response is None:
                return "timeout:用户未响应，已超时"

            action = response.action
            value = response.value

            if action == "cancel":
                return "cancelled:用户取消了选择"
            elif action == "timeout":
                return "timeout:用户未响应，已超时"
            elif action == "submit":
                if value == "none":
                    return "none:用户选择不指定分类"
                else:
                    # 返回分类 ID
                    return f"selected:{value}"
            else:
                return f"unknown:未知操作 {action}"

        except Exception as e:
            logger.error(f"[AskCategoryTool] 执行失败: {e}")
            return f"error:{str(e)}"

    def _format_categories_for_ai(self, categories: List[Dict]) -> str:
        """格式化分类列表供 AI 处理（当 Ask 模块不可用时）"""
        lines = ["fallback:Ask 模块不可用，请用以下格式询问用户：", ""]
        lines.append("您有以下待办分类：")
        for i, cat in enumerate(categories, 1):
            desc = f" - {cat['description']}" if cat.get('description') else ""
            lines.append(f"{i}. {cat['name']}{desc} (ID: {cat['id']})")
        lines.append("")
        lines.append('请问要放到哪个分类？或说"不需要分类"。')
        return "\n".join(lines)
