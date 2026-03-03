"""
Todo 待办工具

提供 AI Agent 创建和管理待办事项的能力。

工具列表：
1. CreateTodoTool - 创建待办事项
2. ListCategoriesTool - 列出所有分类
3. ListTodosTool - 列出待办事项
4. CompleteTodoTool - 完成待办事项
5. GetTodayTodosTool - 获取今日待办
6. AskCategoryTool - 使用 Ask 模块让用户选择分类
7. SearchTodosTool - 语义搜索待办事项
"""

from typing import Optional, List, Dict, Any
from pydantic import Field
import logging
import asyncio

from .tools import BaseTool, ToolSchema, global_tool_registry
from api.direct_api import (
    direct_create_todo,
    direct_create_todo_category,
    direct_list_todo_categories,
    direct_list_todos,
    direct_get_today_todos,
    direct_update_todo_status,
    direct_sync_todo_to_vectorstore,
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

    【重要】创建待办前必须先确认分类：
    1. 如果用户没有指定分类，必须先调用 ask_todo_category 工具弹出 UI 让用户选择
    2. ask_todo_category 会返回选中的分类 ID 或 "none"（不指定分类）
    3. 根据返回结果设置 category_id 参数
    4. 如果用户选择"不需要分类"，category_id 设置为 None
    """

    name = "create_todo"
    description = """创建待办事项。

【🔴 区分两种场景】

**场景1：用户明确要求新建分类**
- 用户说"帮我新建一个分类叫XX"
- 用户说"添加一个分组为YY"
→ 先调用 create_todo_category(name="分类名") 创建分类
→ 然后使用返回的分类 ID 调用 create_todo

**场景2：用户没有指定分类或使用现有分类**
→ 先调用 ask_todo_category 让用户选择
→ 根据返回结果调用 create_todo

【🔴 ask_todo_category 返回结果处理】
- 返回 "selected:xxx" → category_id 设为 xxx
- 返回 "none:xxx" → 不传 category_id 参数
- 返回 "cancelled" → 用户取消，不要创建待办
- 返回 "timeout" → 可以询问用户是否继续创建

【🔴🔴🔴 重要：时间设置规则 🔴🔴🔴】

**必须为每个待办设置截止时间！**

1. **从文件提取任务时**：
   - 仔细分析文件内容，提取任务的时间信息
   - 如果文件中有明确时间（如"3月5日前完成"），使用该时间
   - 如果没有明确时间，根据任务性质设置合理的截止时间

2. **没有明确时间时的默认规则**：
   - 简单任务：设置为今天 18:00
   - 复杂任务：设置为明天 18:00
   - 紧急任务：设置为今天稍后时间

3. **提醒时间**：
   - 如果用户没有指定，自动设置为截止时间前 1 小时
   - 紧急任务可设置为截止时间前 30 分钟

【自然语言时间格式】
- 截止时间："今天18:00"、"明天下午3点"、"下周一"、"3月5日"、"2024-03-15 18:00"
- 提醒时间：格式同上

【其他参数】
- 标题（必填）
- 描述/详情
- 分类 ID（通过 ask_todo_category 或 create_todo_category 获取）
- 优先级：low（低）、medium（中）、high（高）、urgent（紧急）
- 重复类型：none（不重复）、daily（每天）、weekly（每周）、monthly（每月）
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
            # 调试日志：打印数据库路径和分类 ID
            from api.direct_api import direct_get_database_info
            db_info = direct_get_database_info()
            logger.info(f"[CreateTodoTool] 数据库信息: {db_info}")
            logger.info(
                f"[CreateTodoTool] 创建待办: title={title}, category_id={category_id}, priority={priority}, due_date={due_date}, reminder_time={reminder_time}")

            # 解析截止时间
            due_date_ts = None
            if due_date:
                due_date_ts = self._parse_datetime(due_date)
            else:
                # 🔴 如果没有指定截止时间，设置默认截止时间为今天 18:00
                from datetime import datetime, timedelta
                now = datetime.now()
                default_due = now.replace(hour=18, minute=0, second=0, microsecond=0)
                # 如果已经过了今天 18:00，设置为明天 18:00
                if now >= default_due:
                    default_due = default_due + timedelta(days=1)
                due_date_ts = int(default_due.timestamp() * 1000)
                logger.info(f"[CreateTodoTool] 未指定截止时间，自动设置为: {default_due.strftime('%Y-%m-%d %H:%M')}")

            # 解析提醒时间
            # 如果没有指定提醒时间但有截止时间，默认设置为截止时间前 1 小时
            reminder_ts = None
            if reminder_time:
                reminder_ts = self._parse_datetime(reminder_time)
            elif due_date_ts:
                # 自动设置提醒时间为截止时间前 1 小时
                reminder_ts = due_date_ts - 60 * 60 * 1000  # 1 小时 = 60分钟 * 60秒 * 1000毫秒
                logger.info(f"[CreateTodoTool] 自动设置提醒时间: 截止时间前 1 小时")

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
                # 发送 todo_created 事件通知前端刷新
                try:
                    ask_handler = get_ask_handler()
                    if ask_handler and hasattr(ask_handler, '_send_callback'):
                        import asyncio
                        callback = ask_handler._send_callback
                        if callback:
                            # 尝试发送事件通知
                            asyncio.create_task(callback({
                                "type": "todo_created",
                                "data": result
                            }))
                            logger.info(
                                f"[CreateTodoTool] 已发送 todo_created 事件")
                except Exception as e:
                    logger.warning(
                        f"[CreateTodoTool] 发送 todo_created 事件失败: {e}")

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
                if result.get('reminder_time'):
                    from datetime import datetime
                    rt = datetime.fromtimestamp(result['reminder_time'] / 1000)
                    info_parts.append(
                        f"   提醒时间：{rt.strftime('%Y-%m-%d %H:%M')}")
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

【重要】创建待办前仍需确认：
必须调用 ask_todo_category 工具让用户确认是否直接创建（不指定分类）。

用户可以选择：
1. 直接创建待办（不指定分类）
2. 取消创建，先去待办页面创建分类"""

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


class CreateTodoCategoryTool(BaseTool):
    """
    创建待办分类工具

    当用户明确要求创建新分类时使用此工具。
    """

    name = "create_todo_category"
    description = """创建待办分类。

【使用场景】
- 用户明确说要“新建分类”、“添加一个分组”
- 用户想创建一个新的待办分类来组织待办事项

【参数】
- name: 分类名称（必填）
- description: 分类描述（可选）
- color: 颜色（可选，十六进制如 #FF5733）
- icon: 图标名称（可选，见下方可用图标）

【可用图标】（Material Symbols）
- folder: 文件夹
- work: 工作
- favorite: 生活
- school: 学习
- fitness_center: 健身
- shopping_cart: 购物
- flight: 旅行
- celebration: 娱乐
- restaurant: 饮食
- medical_services: 医疗
- payments: 财务
- code: 开发

【返回】
创建成功后返回分类信息，包含 ID，可用于后续创建待办时指定分类。
"""

    class ArgsSchema(ToolSchema):
        name: str = Field(description="分类名称（必填）")
        description: Optional[str] = Field(
            default=None,
            description="分类描述"
        )
        color: Optional[str] = Field(
            default=None,
            description="颜色（十六进制如 #3B82F6, #F97316, #A855F7, #EF4444, #10B981）"
        )
        icon: Optional[str] = Field(
            default="folder",
            description="图标名称，可用值：folder, work, favorite, school, fitness_center, shopping_cart, flight, celebration, restaurant, medical_services, payments, code"
        )

    args_schema = ArgsSchema

    def _run(
        self,
        name: str,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
    ) -> str:
        """创建待办分类"""
        try:
            result = direct_create_todo_category(
                name=name,
                description=description,
                color=color,
                icon=icon,
            )

            if result:
                return f"✅ 已创建待办分类：{result['name']} (ID: {result['id']})"
            else:
                return "❌ 创建待办分类失败"

        except Exception as e:
            logger.error(f"创建待办分类失败: {e}")
            return f"❌ 创建待办分类失败：{str(e)}"


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
        CreateTodoCategoryTool(),
        ListTodoCategoriesTool(),
        ListTodosTool(),
        CompleteTodoTool(),
        GetTodayTodosTool(),
        AskCategoryTool(),
        SearchTodosTool(),
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
- 返回 "selected:xxx" → 用户选择了现有分类，xxx 为分类 ID
- 返回 "none:xxx" → 用户选择不指定分类
- 返回 "new_category:分类名" → 用户选择新建分类，需要调用 create_todo_category 创建
- 返回 "cancelled" → 用户取消操作
- 返回 "timeout" → 请求超时

【🔴 返回后必须立即调用相应工具】
- 返回 "selected:xxx" → create_todo(category_id=xxx, ...)
- 返回 "none:xxx" → create_todo(...) 不传 category_id
- 返回 "new_category:分类名" → 先调用 create_todo_category(name="分类名")，获取分类 ID 后再调用 create_todo
- 返回 "cancelled" → 告知用户已取消，不执行后续操作

【调用时机】
在 create_todo 之前，如果用户没有明确指定分类，调用此工具让用户选择。
用户可以选择现有分类、新建分类、不指定分类或取消。
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

            # 获取 AskHandler
            ask_handler = get_ask_handler()
            if not ask_handler:
                # 如果没有 AskHandler，返回分类列表让 AI 处理
                logger.warning("[AskCategoryTool] AskHandler 未设置，返回分类列表")
                if not categories:
                    return "no_categories:暂无分类，请询问用户是否直接创建待办（不指定分类）"
                return self._format_categories_for_ai(categories)

            # 构建 Ask 选项
            from ask.types import AskOption, AskType

            options = []

            if categories:
                # 有分类时，显示分类列表
                for cat in categories:
                    options.append(AskOption(
                        id=str(cat['id']),
                        label=cat['name'],
                        description=cat.get('description'),
                        metadata={"category_id": cat['id']}
                    ))
            else:
                # 没有分类时，显示提示信息
                options.append(AskOption(
                    id="info",
                    label="暂无分类",
                    description="当前没有待办分类，可以选择直接创建或不指定分类",
                    metadata={}
                ))

            # 添加"不需要分类"选项
            options.append(AskOption(
                id="none",
                label="不需要分类",
                description="直接创建待办，不指定分类"
            ))

            # 添加"新建分类"选项（带输入框）
            options.append(AskOption(
                id="new_category",
                label="➕ 新建分类",
                description="创建一个新的待办分类",
                metadata={"inputRequired": True, "inputPlaceholder": "请输入分类名称"}
            ))

            # 添加取消选项
            options.append(AskOption(
                id="cancel",
                label="取消",
                description="取消创建待办"
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
                elif value == "cancel":
                    return "cancelled:用户取消了创建待办"
                elif value == "info":
                    # 用户点击了“暂无分类”提示，应该选择其他选项
                    return "info:请选择其他选项，如“不需要分类”或“取消”"
                elif isinstance(value, dict) and value.get("id") == "new_category":
                    # 用户选择新建分类，并输入了分类名称
                    category_name = value.get("input", "").strip()
                    if category_name:
                        return f"new_category:{category_name}"
                    else:
                        return "error:未输入分类名称"
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


class SearchTodosTool(BaseTool):
    """
    语义搜索待办工具

    通过自然语言语义搜索待办事项，适合用户用自然语言提问的场景。
    """

    name = "search_todos"
    description = """通过自然语言语义搜索待办事项。

【使用场景】
- 用户问"我今天有什么要做的"
- 用户问"接下来有什么任务"
- 用户问"有没有关于XXX的待办"
- 用户问"紧急的事情有哪些"

【返回格式】
返回匹配的待办列表，按相关度排序，包含标题、状态、优先级、截止时间等信息。

【注意】
此工具通过语义相似度匹配，可能不完全准确。如果用户明确要查询今日待办，建议使用 get_today_todos 工具。
"""

    class ArgsSchema(ToolSchema):
        query: str = Field(
            description="搜索查询，如'今天要做什么'、'紧急任务'、'关于项目的待办'"
        )
        include_completed: bool = Field(
            default=False,
            description="是否包含已完成的待办"
        )
        limit: int = Field(
            default=10,
            description="返回数量限制，默认 10 条"
        )

    args_schema = ArgsSchema

    def _run(
        self,
        query: str,
        include_completed: bool = False,
        limit: int = 10,
    ) -> str:
        """语义搜索待办"""
        try:
            import asyncio
            from rag.todo_vectorstore import get_todo_vectorstore

            # 获取向量存储
            store = get_todo_vectorstore()

            # 确定状态过滤
            if include_completed:
                status_filter = None
            else:
                status_filter = ["pending", "in_progress"]

            # 尝试在现有事件循环中运行
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # 创建新线程运行异步代码
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(
                            asyncio.run,
                            store.search(query, k=limit,
                                         status_filter=status_filter)
                        )
                        results = future.result(timeout=30)
                else:
                    results = loop.run_until_complete(
                        store.search(query, k=limit,
                                     status_filter=status_filter)
                    )
            except RuntimeError:
                results = asyncio.run(
                    store.search(query, k=limit, status_filter=status_filter)
                )

            if not results:
                return f"没有找到与「{query}」相关的待办事项。"

            # 格式化结果
            priority_names = {
                "low": "低",
                "medium": "中",
                "high": "高",
                "urgent": "紧急",
            }
            status_names = {
                "pending": "待处理",
                "in_progress": "进行中",
                "completed": "已完成",
                "cancelled": "已取消",
            }

            lines = [f"🔍 找到 {len(results)} 条与「{query}」相关的待办：", ""]

            for todo in results:
                status_icon = "✅" if todo['status'] == 'completed' else "⏳"
                priority_str = priority_names.get(todo.get('priority'), '中')
                status_str = status_names.get(todo.get('status'), '未知')
                score_str = f"(相关度: {todo.get('score', 0):.2f})"

                lines.append(
                    f"  {status_icon} [{todo['id']}] {todo['title']} {score_str}")
                lines.append(f"      状态: {status_str} | 优先级: {priority_str}")

                if todo.get('category_name'):
                    lines.append(f"      分类: {todo['category_name']}")

                if todo.get('due_date'):
                    from datetime import datetime
                    dt = datetime.fromtimestamp(todo['due_date'] / 1000)
                    now = datetime.now()
                    is_overdue = dt < now and todo['status'] not in [
                        'completed', 'cancelled']
                    due_str = dt.strftime('%Y-%m-%d %H:%M')
                    if is_overdue:
                        lines.append(f"      ⚠️ 截止: {due_str} (已逾期)")
                    else:
                        lines.append(f"      截止: {due_str}")

                lines.append("")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"语义搜索待办失败: {e}")
            return f"❌ 搜索失败：{str(e)}"

    async def _call_async(
        self,
        query: str,
        include_completed: bool = False,
        limit: int = 10,
    ) -> str:
        """异步执行语义搜索（Deep Agent 会调用此方法）"""
        try:
            from rag.todo_vectorstore import get_todo_vectorstore

            store = get_todo_vectorstore()

            status_filter = None if include_completed else [
                "pending", "in_progress"]

            results = await store.search(query, k=limit, status_filter=status_filter)

            if not results:
                return f"没有找到与「{query}」相关的待办事项。"

            # 格式化结果
            priority_names = {
                "low": "低",
                "medium": "中",
                "high": "高",
                "urgent": "紧急",
            }
            status_names = {
                "pending": "待处理",
                "in_progress": "进行中",
                "completed": "已完成",
                "cancelled": "已取消",
            }

            lines = [f"🔍 找到 {len(results)} 条与「{query}」相关的待办：", ""]

            for todo in results:
                status_icon = "✅" if todo['status'] == 'completed' else "⏳"
                priority_str = priority_names.get(todo.get('priority'), '中')
                status_str = status_names.get(todo.get('status'), '未知')
                score_str = f"(相关度: {todo.get('score', 0):.2f})"

                lines.append(
                    f"  {status_icon} [{todo['id']}] {todo['title']} {score_str}")
                lines.append(f"      状态: {status_str} | 优先级: {priority_str}")

                if todo.get('category_name'):
                    lines.append(f"      分类: {todo['category_name']}")

                if todo.get('due_date'):
                    from datetime import datetime
                    dt = datetime.fromtimestamp(todo['due_date'] / 1000)
                    now = datetime.now()
                    is_overdue = dt < now and todo['status'] not in [
                        'completed', 'cancelled']
                    due_str = dt.strftime('%Y-%m-%d %H:%M')
                    if is_overdue:
                        lines.append(f"      ⚠️ 截止: {due_str} (已逾期)")
                    else:
                        lines.append(f"      截止: {due_str}")

                lines.append("")

            return "\n".join(lines)

        except Exception as e:
            logger.error(f"语义搜索待办失败: {e}")
            return f"❌ 搜索失败：{str(e)}"
