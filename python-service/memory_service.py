#!/usr/bin/env python3
"""
记忆服务模块

提供多轮对话状态管理功能：
1. 对话摘要生成：每10条消息生成一次摘要
2. 记忆提取：从对话中提取用户偏好、项目上下文、任务进度
3. 记忆检索：根据当前对话检索相关历史
"""

import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MemoryType(str, Enum):
    """记忆类型"""
    PREFERENCE = "preference"      # 用户偏好
    PROJECT = "project"            # 项目上下文
    TASK = "task"                  # 任务进度
    FACT = "fact"                  # 事实信息
    CONTEXT = "context"            # 对话上下文


@dataclass
class ConversationSummary:
    """对话摘要"""
    id: Optional[int] = None
    conversation_id: int = 0
    start_message_id: int = 0
    end_message_id: int = 0
    summary: str = ""
    key_topics: List[str] = field(default_factory=list)
    message_count: int = 0
    created_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "conversationId": self.conversation_id,
            "startMessageId": self.start_message_id,
            "endMessageId": self.end_message_id,
            "summary": self.summary,
            "keyTopics": self.key_topics,
            "messageCount": self.message_count,
            "createdAt": self.created_at,
        }


@dataclass
class UserMemory:
    """用户记忆"""
    id: Optional[int] = None
    memory_type: MemoryType = MemoryType.FACT
    memory_key: str = ""
    memory_value: str = ""
    source_conversation_id: Optional[int] = None
    confidence: float = 1.0
    created_at: int = 0
    updated_at: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "memoryType": self.memory_type.value,
            "memoryKey": self.memory_key,
            "memoryValue": self.memory_value,
            "sourceConversationId": self.source_conversation_id,
            "confidence": self.confidence,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }


class MemoryService:
    """
    记忆服务

    提供摘要生成和记忆管理功能
    """

    # 摘要触发阈值（消息数量）
    SUMMARY_THRESHOLD = 10

    # 摘要生成提示模板
    SUMMARY_PROMPT = """请为以下对话生成简洁的摘要，包含：
1. 主要讨论话题
2. 关键结论或决定
3. 待处理事项（如有）

对话内容：
{conversation}

请以以下格式输出（JSON）：
{{
  "summary": "一句话概述对话内容",
  "key_topics": ["话题1", "话题2"],
  "pending_tasks": ["待处理事项1"]
}}
"""

    # 记忆提取提示模板
    MEMORY_EXTRACTION_PROMPT = """请从以下对话中提取用户的关键信息，包括：
1. 用户偏好（如语言偏好、技术栈偏好等）
2. 项目上下文（当前正在开发的项目、技术栈等）
3. 任务进度（正在进行的工作、已完成的里程碑）
4. 重要事实（用户提到的关键信息）

对话内容：
{conversation}

请以以下格式输出（JSON，只输出有把握提取的信息）：
{{
  "preferences": {{"key": "value"}},
  "projects": {{"project_name": "description"}},
  "tasks": {{"task_name": "status"}},
  "facts": {{"key": "value"}}
}}
"""

    def __init__(self):
        self._initialized = False

    async def generate_summary(
        self,
        messages: List[Dict[str, Any]],
        model_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        生成对话摘要

        Args:
            messages: 消息列表
            model_id: 模型 ID

        Returns:
            摘要结果
        """
        if len(messages) < self.SUMMARY_THRESHOLD:
            return {}

        try:
            # 导入模型路由器
            from model_router import model_router

            # 构建对话文本
            conversation_text = self._format_conversation(messages)

            # 构建提示
            prompt = self.SUMMARY_PROMPT.format(conversation=conversation_text)

            # 调用 LLM
            response = await model_router.chat_async(
                messages=[{"role": "user", "content": prompt}],
                model_id=model_id
            )

            # 解析结果
            result = self._parse_json_response(response)

            logger.info(f"生成摘要成功: {result.get('summary', '')[:50]}...")
            return result

        except Exception as e:
            logger.error(f"生成摘要失败: {e}")
            return {}

    async def extract_memory(
        self,
        messages: List[Dict[str, Any]],
        model_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        从对话中提取记忆

        Args:
            messages: 消息列表
            model_id: 模型 ID

        Returns:
            提取的记忆
        """
        try:
            # 导入模型路由器
            from model_router import model_router

            # 构建对话文本（只使用用户消息）
            user_messages = [m for m in messages if m.get("role") == "user"]
            conversation_text = self._format_conversation(user_messages)

            if not conversation_text.strip():
                return {}

            # 构建提示
            prompt = self.MEMORY_EXTRACTION_PROMPT.format(
                conversation=conversation_text)

            # 调用 LLM
            response = await model_router.chat_async(
                messages=[{"role": "user", "content": prompt}],
                model_id=model_id
            )

            # 解析结果
            result = self._parse_json_response(response)

            logger.info(f"提取记忆成功: {list(result.keys())}")
            return result

        except Exception as e:
            logger.error(f"提取记忆失败: {e}")
            return {}

    def _format_conversation(self, messages: List[Dict[str, Any]]) -> str:
        """格式化对话为文本"""
        lines = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            # 截断过长的内容
            if len(content) > 500:
                content = content[:500] + "..."
            role_label = "用户" if role == "user" else "助手"
            lines.append(f"{role_label}: {content}")
        return "\n".join(lines)

    def _parse_json_response(self, response: str) -> Dict[str, Any]:
        """解析 JSON 响应"""
        try:
            # 尝试直接解析
            return json.loads(response)
        except json.JSONDecodeError:
            # 尝试提取 JSON 块
            import re
            json_match = re.search(
                r'```(?:json)?\s*([\s\S]*?)\s*```', response)
            if json_match:
                try:
                    return json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    pass

            # 尝试查找 JSON 对象
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    pass

            logger.warning(f"无法解析 JSON 响应: {response[:100]}...")
            return {}

    def build_context_from_memory(
        self,
        memories: List[UserMemory],
        summaries: List[ConversationSummary]
    ) -> str:
        """
        构建上下文提示

        Args:
            memories: 用户记忆列表
            summaries: 对话摘要列表

        Returns:
            上下文提示文本
        """
        context_parts = []

        # 添加用户记忆
        if memories:
            memory_by_type: Dict[str, List[UserMemory]] = {}
            for m in memories:
                type_key = m.memory_type.value
                if type_key not in memory_by_type:
                    memory_by_type[type_key] = []
                memory_by_type[type_key].append(m)

            type_labels = {
                "preference": "用户偏好",
                "project": "项目信息",
                "task": "任务进度",
                "fact": "重要事实",
                "context": "上下文",
            }

            for mem_type, mems in memory_by_type.items():
                label = type_labels.get(mem_type, mem_type)
                items = [f"- {m.memory_key}: {m.memory_value}" for m in mems]
                context_parts.append(f"**{label}**\n" + "\n".join(items))

        # 添加历史摘要
        if summaries:
            summary_texts = []
            for s in summaries[-3:]:  # 最多取最近3个摘要
                summary_texts.append(f"- {s.summary}")
            context_parts.append("**历史对话摘要**\n" + "\n".join(summary_texts))

        if context_parts:
            return "\n\n".join(context_parts)
        return ""


# 全局记忆服务实例
memory_service = MemoryService()
