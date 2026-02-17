"""
Skill 热加载器

提供技能的动态加载和热重载能力：

1. 从 YAML 文件加载技能配置
2. 从目录批量加载技能
3. 监听文件变化实现热重载
4. 技能验证和错误处理

使用示例：
    loader = SkillLoader(tool_registry=global_tool_registry)

    # 加载单个技能
    skill = loader.load_from_yaml("skills/web_search.yaml")

    # 加载目录下所有技能
    skills = loader.load_from_directory("skills")

    # 热重载技能
    loader.reload_skill("web_search")

    # 启用文件监听（热重载）
    loader.watch_directory("skills")
"""

import os
import json
import logging
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

# watchdog 是可选依赖，用于文件监听和热重载
# 如果不存在，热重载功能将被禁用
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileSystemEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    Observer = None  # type: ignore
    FileSystemEventHandler = object  # type: ignore
    FileSystemEvent = None  # type: ignore
    WATCHDOG_AVAILABLE = False

from .base import (
    BaseSkill,
    YamlSkill,
    SkillConfig,
    SkillType,
)
from .registry import SkillRegistry

logger = logging.getLogger(__name__)


class SkillLoadError(Exception):
    """技能加载错误"""
    pass


class SkillLoader:
    """
    技能加载器

    负责从文件系统加载技能配置，支持：
    1. YAML 格式配置文件
    2. JSON 格式配置文件
    3. 目录批量加载
    4. 文件变化监听和热重载

    支持的文件格式：
    - .yaml / .yml: YAML 格式配置
    - .json: JSON 格式配置

    配置文件结构：
    ```yaml
    metadata:
      name: skill_name
      display_name: 技能显示名称
      description: 技能描述
      tags: [tag1, tag2]

    type: custom
    trigger: intent

    tools:
      - tool_name: calculator
        parameter_mapping:
          expression: $query
        output_key: result

    prompt_template: |
      处理用户请求: {query}

    parameters:
      query:
        type: string
        description: 用户输入
        required: true
    ```
    """

    def __init__(
        self,
        tool_registry: Optional[Any] = None,
        skill_registry: Optional[SkillRegistry] = None
    ):
        """
        初始化技能加载器

        Args:
            tool_registry: 工具注册中心（用于执行工具）
            skill_registry: 技能注册中心（用于自动注册）
        """
        self._tool_registry = tool_registry
        self._skill_registry = skill_registry

        # 文件监听器（需要 watchdog 库）
        self._observer: Optional[Any] = None

        # 已加载的技能文件映射：{技能名称: 文件路径}
        self._skill_files: Dict[str, str] = {}

        if WATCHDOG_AVAILABLE:
            logger.info("技能加载器已初始化（支持热重载）")
        else:
            logger.info("技能加载器已初始化（热重载功能已禁用）")

    def set_tool_registry(self, tool_registry: Any):
        """设置工具注册中心"""
        self._tool_registry = tool_registry

    def set_skill_registry(self, skill_registry: SkillRegistry):
        """设置技能注册中心"""
        self._skill_registry = skill_registry

    def load_from_yaml(self, yaml_path: str) -> BaseSkill:
        """
        从 YAML 文件加载技能

        Args:
            yaml_path: YAML 文件路径

        Returns:
            技能实例

        Raises:
            SkillLoadError: 加载失败
        """
        try:
            skill = YamlSkill.from_yaml(yaml_path, self._tool_registry)

            # 记录文件映射
            self._skill_files[skill.name] = yaml_path

            logger.info(f"从 YAML 加载技能成功: {skill.name} ({yaml_path})")
            return skill

        except Exception as e:
            logger.error(f"加载 YAML 技能失败: {yaml_path}, 错误: {e}")
            raise SkillLoadError(f"加载技能失败: {yaml_path}, 错误: {e}")

    def load_from_json(self, json_path: str) -> BaseSkill:
        """
        从 JSON 文件加载技能

        Args:
            json_path: JSON 文件路径

        Returns:
            技能实例

        Raises:
            SkillLoadError: 加载失败
        """
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            skill = YamlSkill.from_dict(data, self._tool_registry)

            # 记录文件映射
            self._skill_files[skill.name] = json_path

            logger.info(f"从 JSON 加载技能成功: {skill.name} ({json_path})")
            return skill

        except Exception as e:
            logger.error(f"加载 JSON 技能失败: {json_path}, 错误: {e}")
            raise SkillLoadError(f"加载技能失败: {json_path}, 错误: {e}")

    def load_from_file(self, file_path: str) -> BaseSkill:
        """
        从文件加载技能（自动识别格式）

        Args:
            file_path: 文件路径

        Returns:
            技能实例

        Raises:
            SkillLoadError: 不支持的格式或加载失败
        """
        path = Path(file_path)
        suffix = path.suffix.lower()

        if suffix in [".yaml", ".yml"]:
            return self.load_from_yaml(file_path)
        elif suffix == ".json":
            return self.load_from_json(file_path)
        else:
            raise SkillLoadError(f"不支持的文件格式: {suffix}")

    def load_from_directory(
        self,
        directory: str,
        recursive: bool = False
    ) -> List[BaseSkill]:
        """
        从目录加载所有技能

        Args:
            directory: 目录路径
            recursive: 是否递归加载子目录

        Returns:
            加载的技能列表
        """
        skills = []
        dir_path = Path(directory)

        if not dir_path.exists():
            logger.warning(f"目录不存在: {directory}")
            return skills

        # 支持的文件扩展名
        extensions = [".yaml", ".yml", ".json"]

        # 获取文件列表
        if recursive:
            files = []
            for ext in extensions:
                files.extend(dir_path.rglob(f"*{ext}"))
        else:
            files = []
            for ext in extensions:
                files.extend(dir_path.glob(f"*{ext}"))

        # 加载每个文件
        for file_path in files:
            try:
                skill = self.load_from_file(str(file_path))

                # 自动注册到技能注册中心
                if self._skill_registry:
                    try:
                        self._skill_registry.register(skill)
                    except ValueError as e:
                        logger.warning(f"技能 {skill.name} 注册失败: {e}")
                        continue

                skills.append(skill)

            except SkillLoadError as e:
                logger.warning(f"跳过文件 {file_path}: {e}")
                continue

        logger.info(f"从目录 {directory} 加载了 {len(skills)} 个技能")
        return skills

    def reload_skill(self, skill_name: str) -> Optional[BaseSkill]:
        """
        重新加载技能

        Args:
            skill_name: 技能名称

        Returns:
            重新加载的技能实例，失败返回 None
        """
        if skill_name not in self._skill_files:
            logger.warning(f"技能 {skill_name} 未找到对应文件，无法重载")
            return None

        file_path = self._skill_files[skill_name]

        try:
            # 先从注册中心移除
            if self._skill_registry:
                self._skill_registry.unregister(skill_name)

            # 重新加载
            skill = self.load_from_file(file_path)

            # 重新注册
            if self._skill_registry:
                self._skill_registry.register(skill)

            logger.info(f"技能 {skill_name} 重载成功")
            return skill

        except Exception as e:
            logger.error(f"技能 {skill_name} 重载失败: {e}")
            return None

    def watch_directory(
        self,
        directory: str,
        on_created: Optional[Callable[[BaseSkill], None]] = None,
        on_modified: Optional[Callable[[BaseSkill], None]] = None,
        on_deleted: Optional[Callable[[str], None]] = None
    ) -> None:
        """
        监听目录变化（热重载）

        当目录中的技能文件发生变化时，自动重新加载。

        Args:
            directory: 要监听的目录
            on_created: 新建文件回调
            on_modified: 修改文件回调
            on_deleted: 删除文件回调

        Note:
            此功能需要安装 watchdog 库。如果未安装，将输出警告日志。
        """
        # 检查 watchdog 是否可用
        if not WATCHDOG_AVAILABLE:
            logger.warning(
                "watchdog 库未安装，热重载功能已禁用。"
                "如需启用，请运行: pip install watchdog"
            )
            return

        if self._observer:
            self.stop_watching()

        # 创建事件处理器
        class SkillFileHandler(FileSystemEventHandler):  # type: ignore
            def __init__(self, loader: SkillLoader):
                self.loader = loader
                self.extensions = [".yaml", ".yml", ".json"]

            def on_created(self, event):  # type: ignore
                if event.is_directory:
                    return

                path = Path(event.src_path)
                if path.suffix.lower() in self.extensions:
                    logger.info(f"检测到新技能文件: {event.src_path}")
                    try:
                        skill = self.loader.load_from_file(event.src_path)
                        if self.loader._skill_registry:
                            self.loader._skill_registry.register(skill)
                        if on_created:
                            on_created(skill)
                    except Exception as e:
                        logger.error(f"加载新技能失败: {e}")

            def on_modified(self, event):  # type: ignore
                if event.is_directory:
                    return

                path = Path(event.src_path)
                if path.suffix.lower() in self.extensions:
                    logger.info(f"检测到技能文件修改: {event.src_path}")
                    try:
                        skill = self.loader.load_from_file(event.src_path)
                        if self.loader._skill_registry:
                            # 先移除旧的
                            old_name = None
                            for name, fpath in self.loader._skill_files.items():
                                if fpath == event.src_path:
                                    old_name = name
                                    break
                            if old_name:
                                self.loader._skill_registry.unregister(old_name)
                            # 注册新的
                            self.loader._skill_registry.register(skill)
                        if on_modified:
                            on_modified(skill)
                    except Exception as e:
                        logger.error(f"重载技能失败: {e}")

            def on_deleted(self, event):  # type: ignore
                if event.is_directory:
                    return

                path = Path(event.src_path)
                if path.suffix.lower() in self.extensions:
                    logger.info(f"检测到技能文件删除: {event.src_path}")
                    # 查找对应的技能名称
                    skill_name = None
                    for name, fpath in self.loader._skill_files.items():
                        if fpath == event.src_path:
                            skill_name = name
                            break
                    if skill_name:
                        if self.loader._skill_registry:
                            self.loader._skill_registry.unregister(skill_name)
                        del self.loader._skill_files[skill_name]
                        if on_deleted:
                            on_deleted(skill_name)

        # 创建监听器
        self._observer = Observer()  # type: ignore
        self._observer.schedule(
            SkillFileHandler(self),
            directory,
            recursive=True
        )
        self._observer.start()

        logger.info(f"开始监听技能目录: {directory}")

    def stop_watching(self):
        """停止文件监听"""
        if self._observer:
            self._observer.stop()
            self._observer.join()
            self._observer = None
            logger.info("已停止技能目录监听")

    def get_skill_file(self, skill_name: str) -> Optional[str]:
        """
        获取技能对应的文件路径

        Args:
            skill_name: 技能名称

        Returns:
            文件路径，不存在返回 None
        """
        return self._skill_files.get(skill_name)

    def list_loaded_files(self) -> Dict[str, str]:
        """
        列出所有已加载的技能文件

        Returns:
            {技能名称: 文件路径} 字典
        """
        return self._skill_files.copy()


# ==================== 便捷函数 ====================

def load_skills_from_directory(
    directory: str,
    skill_registry: SkillRegistry,
    tool_registry: Optional[Any] = None
) -> List[BaseSkill]:
    """
    从目录加载所有技能并注册

    这是一个便捷函数，用于快速加载和注册技能。

    Args:
        directory: 目录路径
        skill_registry: 技能注册中心
        tool_registry: 工具注册中心

    Returns:
        加载的技能列表
    """
    loader = SkillLoader(tool_registry, skill_registry)
    return loader.load_from_directory(directory)

