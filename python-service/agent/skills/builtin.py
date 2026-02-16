"""
内置技能示例

展示如何创建代码级别的内置技能。

内置技能特点：
1. 代码实现，性能更好
2. 可以实现复杂的逻辑
3. 随应用发布，无需额外配置

创建内置技能的步骤：
1. 继承 BuiltinSkill 类
2. 在 __init__ 中定义 SkillConfig
3. 实现 execute 方法
4. 在 init_builtin_skills 中注册
"""

from typing import Any, Dict
from datetime import datetime
import logging

from .base import (
    BuiltinSkill,
    SkillConfig,
    SkillMetadata,
    SkillType,
    SkillTrigger,
)

logger = logging.getLogger(__name__)


class CalculatorSkill(BuiltinSkill):
    """
    计算器技能

    执行数学表达式计算，是对 calculator 工具的封装。

    特点：
    - 支持基本数学运算
    - 支持常用数学函数
    - 有安全的表达式执行

    使用示例：
        skill = CalculatorSkill()
        result = await skill.execute(expression="2 + 2 * 3")
        # result: "计算结果: 8"
    """

    def __init__(self):
        """初始化计算器技能"""
        config = SkillConfig(
            metadata=SkillMetadata(
                name="calculator_skill",
                display_name="数学计算",
                description="执行数学表达式计算，支持加减乘除、幂运算、三角函数等",
                author="system",
                version="1.0.0",
                tags=["数学", "计算", "calculator"],
                icon="🧮",
            ),
            type=SkillType.BUILTIN,
            trigger=SkillTrigger.INTENT,
            parameters={
                "expression": {
                    "type": "string",
                    "description": "要计算的数学表达式，如 '2+2'、'sqrt(16)'、'sin(pi/2)'",
                    "required": True,
                }
            },
            examples=[
                "帮我算一下 123 * 456",
                "计算 sqrt(144) + 10",
                "2 的 10 次方是多少？",
            ],
            timeout=10,
        )
        super().__init__(config)

    async def execute(self, expression: str) -> str:
        """
        执行数学计算

        Args:
            expression: 数学表达式

        Returns:
            计算结果
        """
        import math

        # 安全检查：只允许数字、运算符和常用数学函数
        allowed_names = {
            "abs": abs, "round": round, "min": min, "max": max,
            "sqrt": math.sqrt, "pow": math.pow, "sin": math.sin,
            "cos": math.cos, "tan": math.tan, "log": math.log,
            "log10": math.log10, "exp": math.exp, "pi": math.pi, "e": math.e,
        }

        # 简单的安全检查
        expression = expression.strip()
        allowed_chars = set("0123456789+-*/.() %^")
        allowed_chars.update(c.lower() for c in "sqrtabscoundminmaxrtpwelg10xp")

        for char in expression:
            if char.lower() not in allowed_chars and not char.isalpha():
                continue

        try:
            # 使用受限的命名空间执行
            result = eval(expression, {"__builtins__": {}}, allowed_names)
            return f"计算结果: {result}"
        except Exception as e:
            return f"计算错误: {str(e)}"


class DateTimeSkill(BuiltinSkill):
    """
    日期时间技能

    获取和处理日期时间信息。

    特点：
    - 获取当前时间
    - 时区转换
    - 日期计算

    使用示例：
        skill = DateTimeSkill()
        result = await skill.execute(query="现在几点了")
        # result: "现在是 2024-01-01 12:00:00"
    """

    def __init__(self):
        """初始化日期时间技能"""
        config = SkillConfig(
            metadata=SkillMetadata(
                name="datetime_skill",
                display_name="日期时间",
                description="获取当前日期时间、进行日期计算等",
                author="system",
                version="1.0.0",
                tags=["日期", "时间", "datetime"],
                icon="🕐",
            ),
            type=SkillType.BUILTIN,
            trigger=SkillTrigger.KEYWORD,
            trigger_keywords=["时间", "日期", "几点", "几号", "今天", "明天", "昨天"],
            parameters={
                "query": {
                    "type": "string",
                    "description": "时间相关的查询，如 '现在几点'、'今天几号'",
                    "required": True,
                }
            },
            examples=[
                "现在几点了？",
                "今天几号？",
                "明天是星期几？",
            ],
            timeout=5,
        )
        super().__init__(config)

    async def execute(self, query: str) -> str:
        """
        执行日期时间查询

        Args:
            query: 查询字符串

        Returns:
            查询结果
        """
        now = datetime.now()
        query_lower = query.lower()

        # 判断查询类型
        if "几点" in query or "时间" in query:
            return f"现在是 {now.strftime('%H:%M:%S')}"

        elif "几号" in query or "日期" in query or "今天" in query:
            weekdays = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
            weekday = weekdays[now.weekday()]
            return f"今天是 {now.strftime('%Y年%m月%d日')} {weekday}"

        elif "明天" in query:
            tomorrow = datetime(now.year, now.month, now.day) + __import__("datetime").timedelta(days=1)
            weekdays = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
            weekday = weekdays[tomorrow.weekday()]
            return f"明天是 {tomorrow.strftime('%Y年%m月%d日')} {weekday}"

        elif "昨天" in query:
            yesterday = datetime(now.year, now.month, now.day) - __import__("datetime").timedelta(days=1)
            weekdays = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
            weekday = weekdays[yesterday.weekday()]
            return f"昨天是 {yesterday.strftime('%Y年%m月%d日')} {weekday}"

        else:
            return f"当前时间: {now.strftime('%Y-%m-%d %H:%M:%S')}"


class TextProcessSkill(BuiltinSkill):
    """
    文本处理技能

    提供常用的文本处理功能。

    支持的操作：
    - 字数统计
    - 大小写转换
    - 文本反转
    """

    def __init__(self):
        """初始化文本处理技能"""
        config = SkillConfig(
            metadata=SkillMetadata(
                name="text_process",
                display_name="文本处理",
                description="文本处理工具，支持字数统计、大小写转换等",
                author="system",
                version="1.0.0",
                tags=["文本", "处理", "统计"],
                icon="📝",
            ),
            type=SkillType.BUILTIN,
            trigger=SkillTrigger.INTENT,
            parameters={
                "text": {
                    "type": "string",
                    "description": "要处理的文本",
                    "required": True,
                },
                "operation": {
                    "type": "string",
                    "description": "操作类型：count（统计）、upper（大写）、lower（小写）、reverse（反转）",
                    "required": True,
                }
            },
            examples=[
                "统计这段文字有多少字",
                "把这段文字转成大写",
            ],
            timeout=10,
        )
        super().__init__(config)

    async def execute(self, text: str, operation: str = "count") -> str:
        """
        执行文本处理

        Args:
            text: 要处理的文本
            operation: 操作类型

        Returns:
            处理结果
        """
        if operation == "count":
            char_count = len(text)
            word_count = len(text.split())
            chinese_count = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
            return f"文本统计：字符数 {char_count}，词数 {word_count}，中文 {chinese_count} 字"

        elif operation == "upper":
            return text.upper()

        elif operation == "lower":
            return text.lower()

        elif operation == "reverse":
            return text[::-1]

        else:
            return f"未知操作: {operation}"


# ==================== 技能注册函数 ====================

def init_builtin_skills(skill_registry: Any) -> None:
    """
    初始化内置技能

    在应用启动时调用，注册所有内置技能。

    Args:
        skill_registry: 技能注册中心实例
    """
    # 创建内置技能实例
    builtin_skills = [
        CalculatorSkill(),
        DateTimeSkill(),
        TextProcessSkill(),
    ]

    # 注册到技能注册中心
    for skill in builtin_skills:
        try:
            skill_registry.register(skill)
            logger.info(f"已注册内置技能: {skill.name}")
        except ValueError as e:
            logger.warning(f"注册内置技能失败: {e}")

    logger.info(f"已注册 {len(builtin_skills)} 个内置技能")
