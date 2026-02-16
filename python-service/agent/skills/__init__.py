"""
Skills 技能系统

技能（Skill）是比工具（Tool）更高层次的抽象。

Skills vs Tools:
┌─────────────────────────────────────────────────────────────┐
│                      能力层级                                 │
├─────────────────────────────────────────────────────────────┤
│  Skills (技能层)                                             │
│  - 用户可自定义配置                                          │
│  - 支持热加载                                                │
│  - 可组合多个工具                                            │
│  - 有独立的提示词模板                                        │
├─────────────────────────────────────────────────────────────┤
│  Tools (工具层)                                              │
│  - 代码级别定义                                              │
│  - 启动时加载                                                │
│  - 单一功能                                                  │
│  - 固定参数 schema                                           │
└─────────────────────────────────────────────────────────────┘

使用示例：
    from agent.skills import SkillRegistry, SkillLoader

    # 加载技能
    loader = SkillLoader()
    registry = SkillRegistry()

    # 从目录加载技能配置
    skills = loader.load_from_directory("./skills")
    for skill in skills:
        registry.register(skill)

    # 获取技能
    skill = registry.get_skill("web_search")

    # 执行技能
    result = await skill.execute(query="Python 教程")
"""

from .base import (
    SkillConfig,
    SkillMetadata,
    SkillType,
    SkillTrigger,
    SkillToolBinding,
    BaseSkill,
    YamlSkill,
    BuiltinSkill,
)

from .registry import SkillRegistry, global_skill_registry
from .loader import SkillLoader
from .builtin import (
    CalculatorSkill,
    DateTimeSkill,
    TextProcessSkill,
    init_builtin_skills,
)

__all__ = [
    # 类型定义
    "SkillConfig",
    "SkillMetadata",
    "SkillType",
    "SkillTrigger",
    "SkillToolBinding",
    # 基类
    "BaseSkill",
    "YamlSkill",
    "BuiltinSkill",
    # 注册中心
    "SkillRegistry",
    "global_skill_registry",
    # 加载器
    "SkillLoader",
    # 内置技能
    "CalculatorSkill",
    "DateTimeSkill",
    "TextProcessSkill",
    "init_builtin_skills",
]
