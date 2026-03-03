"""
Skills 技能处理器

处理技能相关的消息。
"""
import time
import logging
import os
from typing import Any, Dict, Optional, Callable, Awaitable

from .base_handler import BaseHandler

logger = logging.getLogger(__name__)


class SkillHandler(BaseHandler):
    """
    Skills 技能处理器

    处理以下消息类型：
    - skill_list: 获取技能列表
    - skill_execute: 执行技能
    - skill_reload: 重载技能
    """

    async def handle(self, message: dict) -> Optional[dict]:
        """处理技能消息"""
        msg_type = message.get("type")

        if msg_type == "skill_list":
            return await self._handle_skill_list(message)
        elif msg_type == "skill_execute":
            return await self._handle_skill_execute(message)
        elif msg_type == "skill_reload":
            return await self._handle_skill_reload(message)
        else:
            return self.error_response(f"未知的技能消息类型: {msg_type}", message.get("id"))

    async def _handle_skill_list(self, message: dict) -> dict:
        """
        处理技能列表查询

        返回所有已注册的技能信息。
        """
        try:
            from agent.skills import global_skill_registry

            skills = global_skill_registry.list_skills(enabled_only=False)
            skill_list = []

            for skill in skills:
                skill_list.append({
                    "name": skill.name,
                    "displayName": skill.config.metadata.display_name,
                    "description": skill.description,
                    "type": skill.config.type.value,
                    "trigger": skill.config.trigger.value,
                    "enabled": skill.enabled,
                    "tags": skill.config.metadata.tags,
                    "icon": skill.config.metadata.icon,
                    "version": skill.config.metadata.version,
                    "author": skill.config.metadata.author,
                })

            return {
                "type": "skill_list_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "skills": skill_list,
                "count": len(skill_list),
            }

        except Exception as e:
            logger.error(f"获取技能列表失败: {e}")
            return {
                "type": "skill_list_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
                "skills": [],
                "count": 0,
            }

    async def _handle_skill_execute(self, message: dict) -> dict:
        """
        处理技能执行请求

        执行指定的技能并返回结果。
        """
        skill_name = message.get("skillName")
        parameters = message.get("parameters", {})

        if not skill_name:
            return {
                "type": "skill_execute_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少技能名称",
            }

        try:
            from agent.skills import global_skill_registry

            # 执行技能
            result = await global_skill_registry.execute_skill(skill_name, **parameters)

            return {
                "type": "skill_execute_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "skillName": skill_name,
                "result": result,
            }

        except ValueError as e:
            logger.warning(f"技能执行失败: {e}")
            return {
                "type": "skill_execute_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "skillName": skill_name,
                "error": str(e),
            }
        except Exception as e:
            logger.error(f"技能执行错误: {e}")
            return {
                "type": "skill_execute_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "skillName": skill_name,
                "error": str(e),
            }

    async def _handle_skill_reload(self, message: dict) -> dict:
        """
        处理技能重载请求

        重新加载指定的技能或所有技能。
        """
        skill_name = message.get("skillName")  # 如果为空，重载所有技能

        try:
            from agent.skills import global_skill_registry, SkillLoader
            from agent.tools import global_tool_registry

            if skill_name:
                # 重载指定技能
                loader = SkillLoader(
                    tool_registry=global_tool_registry,
                    skill_registry=global_skill_registry
                )
                skill = loader.reload_skill(skill_name)

                if skill:
                    return {
                        "type": "skill_reload_response",
                        "id": message.get("id"),
                        "timestamp": int(time.time() * 1000),
                        "success": True,
                        "skillName": skill_name,
                        "message": f"技能 {skill_name} 重载成功",
                    }
                else:
                    return {
                        "type": "skill_reload_response",
                        "id": message.get("id"),
                        "timestamp": int(time.time() * 1000),
                        "success": False,
                        "skillName": skill_name,
                        "error": f"技能 {skill_name} 重载失败",
                    }
            else:
                # 重载所有技能
                skills_dir = os.path.join(
                    os.path.dirname(__file__), "..", "skills")

                if not os.path.exists(skills_dir):
                    return {
                        "type": "skill_reload_response",
                        "id": message.get("id"),
                        "timestamp": int(time.time() * 1000),
                        "success": True,
                        "message": "技能目录不存在，无需重载",
                    }

                # 清空现有自定义技能
                global_skill_registry.clear()

                # 重新注册内置技能
                from agent.skills import init_builtin_skills
                init_builtin_skills(global_skill_registry)

                # 重新加载自定义技能
                loader = SkillLoader(
                    tool_registry=global_tool_registry,
                    skill_registry=global_skill_registry
                )
                skills = loader.load_from_directory(skills_dir)

                return {
                    "type": "skill_reload_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": True,
                    "message": f"重载完成，共 {len(global_skill_registry)} 个技能",
                    "count": len(global_skill_registry),
                }

        except Exception as e:
            logger.error(f"重载技能失败: {e}")
            return {
                "type": "skill_reload_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }
