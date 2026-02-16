"""
Skill 注册中心

管理所有可用技能，提供：
1. 技能注册和注销
2. 技能查询和获取
3. 技能执行接口
4. OpenAI Tool 格式转换

使用示例：
    registry = SkillRegistry()

    # 注册技能
    skill = WebSearchSkill()
    registry.register(skill)

    # 获取技能
    skill = registry.get_skill("web_search")

    # 执行技能
    result = await registry.execute_skill("web_search", query="Python 教程")

    # 获取 OpenAI Tool 格式
    tools = registry.get_openai_tools()
"""

from typing import Any, Dict, List, Optional
import logging
import asyncio

from .base import (
    BaseSkill,
    SkillTrigger,
    SkillType,
)

logger = logging.getLogger(__name__)


class SkillRegistry:
    """
    技能注册中心

    管理所有可用技能的中心化注册表。

    职责：
    1. 注册和管理技能实例
    2. 根据名称获取技能
    3. 根据触发方式查找技能
    4. 执行技能
    5. 生成 OpenAI Tool 格式

    线程安全：
    - 使用字典存储技能，Python 的 GIL 保证了基本的线程安全
    - 如需更高并发安全，可以考虑添加锁

    示例：
        registry = SkillRegistry()

        # 注册技能
        registry.register(my_skill)

        # 列出所有技能
        skills = registry.list_skills()

        # 获取特定技能
        skill = registry.get_skill("web_search")

        # 执行技能
        result = await registry.execute_skill("web_search", query="test")

        # 获取 OpenAI 格式工具列表
        tools = registry.get_openai_tools()
    """

    def __init__(self):
        """初始化技能注册中心"""
        # 技能存储：{技能名称: 技能实例}
        self._skills: Dict[str, BaseSkill] = {}

        # 按触发方式索引：{触发方式: [技能名称列表]}
        self._trigger_index: Dict[SkillTrigger, List[str]] = {
            trigger: [] for trigger in SkillTrigger
        }

        logger.info("技能注册中心已初始化")

    def register(self, skill: BaseSkill) -> None:
        """
        注册技能

        Args:
            skill: 技能实例

        Raises:
            ValueError: 如果技能名称已存在或配置无效
        """
        # 验证技能
        if not skill.validate():
            raise ValueError(f"技能配置无效: {skill.name}")

        # 检查是否已存在
        if skill.name in self._skills:
            raise ValueError(f"技能 '{skill.name}' 已存在")

        # 注册技能
        self._skills[skill.name] = skill

        # 更新触发索引
        trigger = skill.config.trigger
        if skill.name not in self._trigger_index[trigger]:
            self._trigger_index[trigger].append(skill.name)

        logger.info(f"已注册技能: {skill.name} (类型: {skill.config.type.value}, 触发: {trigger.value})")

    def unregister(self, name: str) -> bool:
        """
        注销技能

        Args:
            name: 技能名称

        Returns:
            是否成功注销
        """
        if name not in self._skills:
            logger.warning(f"技能 '{name}' 不存在，无法注销")
            return False

        skill = self._skills[name]

        # 从触发索引中移除
        trigger = skill.config.trigger
        if name in self._trigger_index[trigger]:
            self._trigger_index[trigger].remove(name)

        # 从技能字典中移除
        del self._skills[name]

        logger.info(f"已注销技能: {name}")
        return True

    def get_skill(self, name: str) -> Optional[BaseSkill]:
        """
        获取技能

        Args:
            name: 技能名称

        Returns:
            技能实例，不存在则返回 None
        """
        return self._skills.get(name)

    def list_skills(self, enabled_only: bool = True) -> List[BaseSkill]:
        """
        列出所有技能

        Args:
            enabled_only: 是否只返回启用的技能

        Returns:
            技能实例列表
        """
        skills = list(self._skills.values())
        if enabled_only:
            skills = [s for s in skills if s.enabled]
        return skills

    def list_skill_names(self, enabled_only: bool = True) -> List[str]:
        """
        列出所有技能名称

        Args:
            enabled_only: 是否只返回启用的技能名称

        Returns:
            技能名称列表
        """
        return [s.name for s in self.list_skills(enabled_only)]

    def get_skills_by_type(self, skill_type: SkillType) -> List[BaseSkill]:
        """
        按类型获取技能

        Args:
            skill_type: 技能类型

        Returns:
            该类型的技能列表
        """
        return [
            s for s in self._skills.values()
            if s.config.type == skill_type and s.enabled
        ]

    def get_skills_by_trigger(self, trigger: SkillTrigger) -> List[BaseSkill]:
        """
        按触发方式获取技能

        Args:
            trigger: 触发方式

        Returns:
            该触发方式的技能列表
        """
        names = self._trigger_index.get(trigger, [])
        return [self._skills[n] for n in names if n in self._skills and self._skills[n].enabled]

    def find_triggered_skills(self, user_input: str) -> List[BaseSkill]:
        """
        查找应该被触发的技能

        根据用户输入，检查哪些技能应该被自动触发。
        主要用于关键词触发类型的技能。

        Args:
            user_input: 用户输入

        Returns:
            应该触发的技能列表
        """
        triggered = []

        for skill in self._skills.values():
            if skill.enabled and skill.should_trigger(user_input):
                triggered.append(skill)

        return triggered

    async def execute_skill(self, name: str, **kwargs) -> str:
        """
        执行技能

        Args:
            name: 技能名称
            **kwargs: 技能参数

        Returns:
            执行结果

        Raises:
            ValueError: 技能不存在或未启用
        """
        skill = self.get_skill(name)
        if not skill:
            raise ValueError(f"技能 '{name}' 不存在")

        if not skill.enabled:
            raise ValueError(f"技能 '{name}' 未启用")

        logger.info(f"执行技能: {name}, 参数: {kwargs}")

        try:
            result = await skill.execute(**kwargs)
            logger.info(f"技能 {name} 执行成功")
            return result

        except Exception as e:
            logger.error(f"技能 {name} 执行失败: {e}")
            return f"技能执行失败: {str(e)}"

    def get_openai_tools(self, enabled_only: bool = True) -> List[Dict[str, Any]]:
        """
        获取所有技能的 OpenAI Tool 格式

        用于传递给 LLM 进行 Function Calling。

        Args:
            enabled_only: 是否只返回启用的技能

        Returns:
            OpenAI Tool 格式的列表
        """
        skills = self.list_skills(enabled_only)
        return [skill.get_openai_tool() for skill in skills]

    def get_skills_prompt(self) -> str:
        """
        获取所有技能的文本描述

        用于在 Prompt 中告诉 LLM 有哪些技能可用。

        Returns:
            所有技能的文本描述
        """
        prompts = ["可用技能列表：\n"]

        for skill in self.list_skills():
            prompt = f"- {skill.name}: {skill.description}\n"

            # 添加参数说明
            if skill.config.parameters:
                prompt += "  参数:\n"
                for param_name, param_config in skill.config.parameters.items():
                    param_desc = param_config.get("description", "")
                    required = "（必填）" if param_config.get("required") else ""
                    prompt += f"    - {param_name}: {param_desc}{required}\n"

            # 添加示例
            if skill.config.examples:
                prompt += "  示例:\n"
                for example in skill.config.examples[:2]:
                    prompt += f"    - {example}\n"

            prompts.append(prompt)

        return "\n".join(prompts)

    def enable_skill(self, name: str) -> bool:
        """
        启用技能

        Args:
            name: 技能名称

        Returns:
            是否成功
        """
        skill = self.get_skill(name)
        if skill:
            skill.enable()
            logger.info(f"已启用技能: {name}")
            return True
        return False

    def disable_skill(self, name: str) -> bool:
        """
        禁用技能

        Args:
            name: 技能名称

        Returns:
            是否成功
        """
        skill = self.get_skill(name)
        if skill:
            skill.disable()
            logger.info(f"已禁用技能: {name}")
            return True
        return False

    def clear(self):
        """
        清空所有技能

        主要用于重新加载配置时清空旧数据。
        """
        self._skills.clear()
        for trigger in self._trigger_index:
            self._trigger_index[trigger].clear()
        logger.info("已清空所有技能")

    def __len__(self) -> int:
        """返回注册的技能数量"""
        return len(self._skills)

    def __contains__(self, name: str) -> bool:
        """检查技能是否存在"""
        return name in self._skills


# ==================== 全局技能注册中心 ====================

# 创建全局技能注册中心实例
global_skill_registry = SkillRegistry()


def init_default_skills():
    """
    初始化默认技能

    在应用启动时调用，注册所有内置技能。
    """
    global global_skill_registry

    # 这里注册内置技能
    # 后续会添加具体的内置技能

    logger.info(f"已注册 {len(global_skill_registry)} 个默认技能")
