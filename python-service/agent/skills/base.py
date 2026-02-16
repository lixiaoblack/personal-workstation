"""
Skill 基类和类型定义

定义技能系统的核心类型：

1. SkillType: 技能类型枚举
   - builtin: 内置技能（代码定义）
   - custom: 自定义技能（配置文件定义）
   - composite: 组合技能（组合多个技能）

2. SkillTrigger: 触发方式
   - manual: 手动调用
   - keyword: 关键词触发
   - intent: 意图识别触发

3. SkillMetadata: 技能元数据
   - 包含技能的基本信息（名称、描述、作者等）

4. SkillToolBinding: 技能与工具的绑定
   - 定义技能使用哪些工具
   - 参数映射关系

5. SkillConfig: 技能配置
   - 完整的技能配置定义

6. BaseSkill: 技能基类
   - 所有技能的抽象基类

7. YamlSkill: YAML 配置技能
   - 从 YAML 文件加载的技能

8. BuiltinSkill: 内置技能
   - 代码定义的内置技能
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, Callable
from pydantic import BaseModel, Field
import logging
import json

logger = logging.getLogger(__name__)


# ==================== 枚举类型 ====================

class SkillType(str, Enum):
    """
    技能类型枚举

    定义技能的来源和实现方式：
    - builtin: 内置技能，由代码实现，随应用发布
    - custom: 自定义技能，由用户通过配置文件定义
    - composite: 组合技能，组合多个技能形成复杂工作流
    """
    BUILTIN = "builtin"      # 内置技能（代码定义）
    CUSTOM = "custom"        # 自定义技能（配置文件定义）
    COMPOSITE = "composite"  # 组合技能（组合多个技能）


class SkillTrigger(str, Enum):
    """
    技能触发方式枚举

    定义技能如何被触发：
    - manual: 手动调用，用户显式选择使用
    - keyword: 关键词触发，用户输入包含特定关键词时自动触发
    - intent: 意图识别，LLM 识别用户意图后自动调用
    """
    MANUAL = "manual"      # 手动调用
    KEYWORD = "keyword"    # 关键词触发
    INTENT = "intent"      # 意图识别触发


# ==================== 数据模型 ====================

class SkillMetadata(BaseModel):
    """
    技能元数据

    包含技能的基本信息，用于：
    1. 在 UI 中展示技能信息
    2. 技能搜索和过滤
    3. 版本管理

    示例：
        metadata = SkillMetadata(
            name="web_search",
            display_name="网络搜索",
            description="搜索互联网获取信息",
            author="system",
            version="1.0.0",
            tags=["search", "web", "internet"]
        )
    """
    # 技能唯一标识（英文，用于代码调用）
    name: str = Field(..., description="技能唯一标识，如 'web_search'")

    # 显示名称（中文，用于 UI 展示）
    display_name: str = Field(..., description="显示名称，如 '网络搜索'")

    # 技能描述
    description: str = Field(..., description="技能功能描述")

    # 作者
    author: str = Field(default="unknown", description="技能作者")

    # 版本号
    version: str = Field(default="1.0.0", description="技能版本号")

    # 标签（用于搜索和分类）
    tags: List[str] = Field(default_factory=list, description="技能标签")

    # 图标（可选，用于 UI 展示）
    icon: Optional[str] = Field(default=None, description="技能图标")

    # 是否启用
    enabled: bool = Field(default=True, description="是否启用")


class SkillToolBinding(BaseModel):
    """
    技能与工具的绑定关系

    定义技能如何使用工具：
    1. 指定使用的工具
    2. 定义参数映射
    3. 设置执行顺序

    示例：
        binding = SkillToolBinding(
            tool_name="calculator",
            parameter_mapping={
                "expression": "$query"  # $query 表示技能的输入参数
            },
            output_key="calc_result"
        )
    """
    # 工具名称
    tool_name: str = Field(..., description="要使用的工具名称")

    # 参数映射
    # key 是工具参数名，value 是技能参数的引用
    # 使用 $前缀表示引用技能参数，如 $query
    # 使用 $前缀.result 表示引用前一个工具的结果，如 $calc_result
    parameter_mapping: Dict[str, str] = Field(
        default_factory=dict,
        description="参数映射关系"
    )

    # 输出键名（用于后续工具引用）
    output_key: Optional[str] = Field(
        default=None,
        description="输出结果的键名，用于后续工具引用"
    )

    # 条件执行（可选）
    # 当条件满足时才执行此工具
    condition: Optional[str] = Field(
        default=None,
        description="执行条件，如 '$query.contains(\"计算\")'"
    )


class SkillConfig(BaseModel):
    """
    技能完整配置

    这是技能的完整定义，包含：
    1. 元数据（名称、描述等）
    2. 类型和触发方式
    3. 绑定的工具列表
    4. 提示词模板
    5. 参数定义

    示例 YAML 配置：
    ```yaml
    metadata:
      name: web_search
      display_name: 网络搜索
      description: 搜索互联网获取信息
      tags: [search, web]

    type: custom
    trigger: intent

    tools:
      - tool_name: web_search_api
        parameter_mapping:
          query: $query
        output_key: search_results

    prompt_template: |
      用户想要搜索：{query}
      请根据搜索结果回答用户问题。

    parameters:
      query:
        type: string
        description: 搜索关键词
        required: true
    ```
    """
    # 元数据
    metadata: SkillMetadata = Field(..., description="技能元数据")

    # 技能类型
    type: SkillType = Field(default=SkillType.CUSTOM, description="技能类型")

    # 触发方式
    trigger: SkillTrigger = Field(default=SkillTrigger.MANUAL, description="触发方式")

    # 触发关键词（当 trigger=keyword 时使用）
    trigger_keywords: List[str] = Field(
        default_factory=list,
        description="触发关键词列表"
    )

    # 绑定的工具
    tools: List[SkillToolBinding] = Field(
        default_factory=list,
        description="技能使用的工具列表"
    )

    # 提示词模板
    # 支持 {param} 格式的参数插值
    prompt_template: Optional[str] = Field(
        default=None,
        description="技能的提示词模板"
    )

    # 参数定义
    # key 是参数名，value 是参数配置
    parameters: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict,
        description="技能参数定义"
    )

    # 示例（用于 UI 展示和提示）
    examples: List[str] = Field(
        default_factory=list,
        description="使用示例"
    )

    # 执行超时（秒）
    timeout: int = Field(default=60, description="执行超时时间（秒）")


# ==================== 技能基类 ====================

class BaseSkill(ABC):
    """
    技能基类

    所有技能都需要继承这个基类。

    技能的生命周期：
    1. 创建：从配置或代码创建技能实例
    2. 验证：检查配置是否有效
    3. 执行：调用 execute 方法执行技能
    4. 返回：返回执行结果

    创建新技能的方式：
    1. 继承 BaseSkill 实现代码技能（内置技能）
    2. 使用 YamlSkill 从配置文件加载（自定义技能）

    示例：
        class WebSearchSkill(BaseSkill):
            def __init__(self):
                self.config = SkillConfig(
                    metadata=SkillMetadata(
                        name="web_search",
                        display_name="网络搜索",
                        description="搜索互联网"
                    ),
                    type=SkillType.BUILTIN
                )

            async def execute(self, **kwargs) -> str:
                # 实现搜索逻辑
                return "搜索结果..."
    """

    def __init__(self, config: Optional[SkillConfig] = None):
        """
        初始化技能

        Args:
            config: 技能配置（可选，子类可以不传）
        """
        self._config = config
        self._enabled = True

    @property
    def config(self) -> SkillConfig:
        """获取技能配置"""
        return self._config

    @property
    def name(self) -> str:
        """获取技能名称"""
        return self._config.metadata.name

    @property
    def description(self) -> str:
        """获取技能描述"""
        return self._config.metadata.description

    @property
    def enabled(self) -> bool:
        """是否启用"""
        return self._enabled and self._config.metadata.enabled

    def enable(self):
        """启用技能"""
        self._enabled = True

    def disable(self):
        """禁用技能"""
        self._enabled = False

    def validate(self) -> bool:
        """
        验证技能配置是否有效

        Returns:
            配置是否有效
        """
        if not self._config:
            return False

        if not self._config.metadata.name:
            logger.error("技能名称不能为空")
            return False

        return True

    def get_openai_tool(self) -> Dict[str, Any]:
        """
        转换为 OpenAI Tool 格式

        让 LLM 可以识别和调用这个技能。

        Returns:
            OpenAI Tool 格式的字典
        """
        # 构建 parameters schema
        properties = {}
        required = []

        for param_name, param_config in self._config.parameters.items():
            properties[param_name] = {
                "type": param_config.get("type", "string"),
                "description": param_config.get("description", ""),
            }
            if param_config.get("required", False):
                required.append(param_name)

        return {
            "type": "function",
            "function": {
                "name": self._config.metadata.name,
                "description": self._config.metadata.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                }
            }
        }

    def should_trigger(self, user_input: str) -> bool:
        """
        检查是否应该触发此技能

        Args:
            user_input: 用户输入

        Returns:
            是否应该触发
        """
        if not self.enabled:
            return False

        if self._config.trigger == SkillTrigger.MANUAL:
            # 手动触发，不自动触发
            return False

        if self._config.trigger == SkillTrigger.KEYWORD:
            # 关键词触发
            for keyword in self._config.trigger_keywords:
                if keyword.lower() in user_input.lower():
                    return True
            return False

        if self._config.trigger == SkillTrigger.INTENT:
            # 意图触发需要 LLM 判断，这里返回 False
            # 实际判断在 Agent 层面进行
            return False

        return False

    @abstractmethod
    async def execute(self, **kwargs) -> str:
        """
        执行技能

        子类必须实现这个方法。

        Args:
            **kwargs: 技能参数

        Returns:
            执行结果
        """
        pass

    def render_prompt(self, **kwargs) -> str:
        """
        渲染提示词模板

        Args:
            **kwargs: 模板参数

        Returns:
            渲染后的提示词
        """
        if not self._config.prompt_template:
            return ""

        try:
            return self._config.prompt_template.format(**kwargs)
        except KeyError as e:
            logger.error(f"提示词模板缺少参数: {e}")
            return self._config.prompt_template


class YamlSkill(BaseSkill):
    """
    YAML 配置技能

    从 YAML 配置文件加载的技能。

    配置文件示例：
    ```yaml
    metadata:
      name: code_review
      display_name: 代码审查
      description: 审查代码并提供改进建议
      tags: [code, review]

    type: custom
    trigger: intent

    tools:
      - tool_name: code_analyzer
        parameter_mapping:
          code: $code
        output_key: analysis

    prompt_template: |
      请审查以下代码并提供改进建议：
      {code}

    parameters:
      code:
        type: string
        description: 要审查的代码
        required: true
    ```

    使用方式：
        skill = YamlSkill.from_yaml("skills/code_review.yaml")
        result = await skill.execute(code="def hello(): pass")
    """

    def __init__(self, config: SkillConfig, tool_registry: Optional[Any] = None):
        """
        初始化 YAML 技能

        Args:
            config: 技能配置
            tool_registry: 工具注册中心（用于执行工具）
        """
        super().__init__(config)
        self._tool_registry = tool_registry

    @classmethod
    def from_dict(cls, data: Dict[str, Any], tool_registry: Optional[Any] = None) -> "YamlSkill":
        """
        从字典创建技能

        Args:
            data: 配置字典
            tool_registry: 工具注册中心

        Returns:
            YamlSkill 实例
        """
        config = SkillConfig(**data)
        return cls(config, tool_registry)

    @classmethod
    def from_yaml(cls, yaml_path: str, tool_registry: Optional[Any] = None) -> "YamlSkill":
        """
        从 YAML 文件加载技能

        Args:
            yaml_path: YAML 文件路径
            tool_registry: 工具注册中心

        Returns:
            YamlSkill 实例
        """
        import yaml

        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        return cls.from_dict(data, tool_registry)

    def set_tool_registry(self, tool_registry: Any):
        """
        设置工具注册中心

        Args:
            tool_registry: 工具注册中心实例
        """
        self._tool_registry = tool_registry

    async def execute(self, **kwargs) -> str:
        """
        执行技能

        YamlSkill 的执行流程：
        1. 验证参数
        2. 按顺序执行绑定的工具
        3. 收集结果并返回

        Args:
            **kwargs: 技能参数

        Returns:
            执行结果
        """
        if not self._tool_registry:
            return "错误：未设置工具注册中心"

        results = {}

        for tool_binding in self._config.tools:
            # 解析参数映射
            tool_args = {}
            for param_name, param_ref in tool_binding.parameter_mapping.items():
                if param_ref.startswith("$"):
                    # 引用参数
                    ref_key = param_ref[1:]
                    if ref_key in kwargs:
                        tool_args[param_name] = kwargs[ref_key]
                    elif ref_key in results:
                        tool_args[param_name] = results[ref_key]
                else:
                    # 字面值
                    tool_args[param_name] = param_ref

            # 执行工具
            try:
                result = self._tool_registry.execute_tool(
                    tool_binding.tool_name,
                    tool_args
                )

                # 保存结果
                if tool_binding.output_key:
                    results[tool_binding.output_key] = result

                logger.info(f"技能 {self.name} 执行工具 {tool_binding.tool_name} 成功")

            except Exception as e:
                logger.error(f"技能 {self.name} 执行工具 {tool_binding.tool_name} 失败: {e}")
                return f"工具执行失败: {str(e)}"

        # 如果只有一个工具，直接返回结果
        if len(self._config.tools) == 1:
            return list(results.values())[0] if results else ""

        # 多个工具时，返回所有结果
        return json.dumps(results, ensure_ascii=False, indent=2)


class BuiltinSkill(BaseSkill):
    """
    内置技能基类

    用于创建代码实现的内置技能。

    内置技能特点：
    1. 代码实现，性能更好
    2. 可以实现复杂的逻辑
    3. 随应用发布，无需额外配置

    示例：
        class CalculatorSkill(BuiltinSkill):
            def __init__(self):
                config = SkillConfig(
                    metadata=SkillMetadata(
                        name="calculator",
                        display_name="计算器",
                        description="执行数学计算"
                    ),
                    type=SkillType.BUILTIN,
                    trigger=SkillTrigger.INTENT,
                    parameters={
                        "expression": {
                            "type": "string",
                            "description": "数学表达式",
                            "required": True
                        }
                    }
                )
                super().__init__(config)

            async def execute(self, expression: str) -> str:
                try:
                    result = eval(expression)
                    return f"计算结果: {result}"
                except Exception as e:
                    return f"计算错误: {str(e)}"
    """

    def __init__(self, config: Optional[SkillConfig] = None):
        """
        初始化内置技能

        Args:
            config: 技能配置
        """
        super().__init__(config)

    def setup(self):
        """
        技能初始化钩子

        子类可以重写此方法进行初始化操作。
        """
        pass

    def teardown(self):
        """
        技能清理钩子

        子类可以重写此方法进行清理操作。
        """
        pass
