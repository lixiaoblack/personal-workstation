#!/usr/bin/env python3
"""
消息处理器
处理来自 Electron 的消息并返回响应
"""
import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional

from model_router import model_router, ModelConfig, ModelProvider
from ollama_client import check_ollama_status, get_ollama_models, get_ollama_client

logger = logging.getLogger(__name__)


class MessageHandler:
    """消息处理器"""

    def __init__(self, send_callback=None):
        """
        初始化消息处理器

        Args:
            send_callback: 发送消息的异步回调函数，用于流式消息
        """
        self.send_callback = send_callback
        self.handlers = {
            "ping": self._handle_ping,
            "chat_message": self._handle_chat_message,
            "agent_chat": self._handle_agent_chat,  # Agent 聊天模式
            "system_status": self._handle_system_status,
            "model_register": self._handle_model_register,
            "model_unregister": self._handle_model_unregister,
            "model_test": self._handle_model_test,
            "model_config_sync": self._handle_model_config_sync,
            "connection_ack": self._handle_connection_ack,
            # Ollama 相关
            "ollama_status": self._handle_ollama_status,
            "ollama_models": self._handle_ollama_models,
            "ollama_test": self._handle_ollama_test,
            # Skills 技能相关
            "skill_list": self._handle_skill_list,
            "skill_execute": self._handle_skill_execute,
            "skill_reload": self._handle_skill_reload,
            # Knowledge 知识库相关
            "knowledge_create": self._handle_knowledge_create,
            "knowledge_delete": self._handle_knowledge_delete,
            "knowledge_list": self._handle_knowledge_list,
            "knowledge_get": self._handle_knowledge_list,  # 复用 list 处理
            "knowledge_add_document": self._handle_knowledge_add_document,
            "knowledge_remove_document": self._handle_knowledge_list_documents,  # 复用
            "knowledge_search": self._handle_knowledge_search,
            "knowledge_list_documents": self._handle_knowledge_list_documents,
        }
        # 会话存储（后续可替换为持久化存储）
        self.conversations: Dict[str, list] = {}

    async def process(self, message: dict) -> Optional[dict]:
        """处理消息"""
        msg_type = message.get("type")

        if not msg_type:
            return self._error_response("无效的消息类型", message.get("id"))

        handler = self.handlers.get(msg_type)
        if not handler:
            logger.warning(f"未知的消息类型: {msg_type}")
            return self._error_response(f"未知的消息类型: {msg_type}", message.get("id"))

        try:
            return await handler(message)
        except Exception as e:
            logger.error(f"处理消息错误: {e}")
            return self._error_response(str(e), message.get("id"))

    async def _handle_ping(self, message: dict) -> dict:
        """处理心跳消息"""
        return {
            "type": "pong",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000)
        }

    async def _handle_connection_ack(self, message: dict) -> Optional[dict]:
        """处理连接确认消息"""
        logger.debug(f"收到连接确认: {message.get('clientId')}")
        return None  # 不需要响应

    async def _handle_chat_message(self, message: dict) -> dict:
        """处理聊天消息"""
        content = message.get("content", "")
        conversation_id = message.get("conversationId")
        model_id = message.get("modelId")  # 可选，指定模型
        stream = message.get("stream", False)  # 是否流式输出
        # 优先使用传入的历史记录（滑动窗口策略）
        incoming_history = message.get("history", [])

        logger.info(f"收到聊天消息: {content[:50]}...")

        # 如果没有传入历史记录，使用内存中的会话历史（兼容旧客户端）
        if not incoming_history and conversation_id:
            if conversation_id not in self.conversations:
                self.conversations[conversation_id] = []
            self.conversations[conversation_id].append({
                "role": "user",
                "content": content,
                "timestamp": int(time.time() * 1000)
            })

        # 使用模型路由器处理
        try:
            # 构建消息列表
            messages = []

            if incoming_history:
                # 使用传入的历史记录
                for msg in incoming_history:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
            elif conversation_id and conversation_id in self.conversations:
                # 兼容旧客户端：使用内存中的历史消息
                for msg in self.conversations[conversation_id][:-1]:  # 不包括刚添加的用户消息
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            # 添加当前用户消息
            messages.append({"role": "user", "content": content})

            # 调用模型
            if stream:
                # 流式响应通过 WebSocket 发送多个消息
                return await self._handle_stream_chat(message, messages, model_id)
            else:
                response_content = await model_router.chat_async(
                    messages=messages,
                    model_id=model_id
                )

                # 存储响应（仅在没有传入历史时使用内存存储）
                if not incoming_history and conversation_id:
                    self.conversations[conversation_id].append({
                        "role": "assistant",
                        "content": response_content,
                        "timestamp": int(time.time() * 1000)
                    })

                return {
                    "type": "chat_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "content": response_content,
                    "conversationId": conversation_id,
                    "success": True
                }

        except ValueError as e:
            # 模型未注册，回退到模拟响应
            logger.warning(f"模型未注册，使用模拟响应: {e}")
            response_content = await self._generate_mock_response(content)

            if not incoming_history and conversation_id:
                self.conversations[conversation_id].append({
                    "role": "assistant",
                    "content": response_content,
                    "timestamp": int(time.time() * 1000)
                })

            return {
                "type": "chat_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "content": response_content,
                "conversationId": conversation_id,
                "success": True,
                "fallback": True  # 标记为回退响应
            }
        except Exception as e:
            logger.error(f"处理聊天消息错误: {e}")
            return self._error_response(str(e), message.get("id"))

    async def _handle_stream_chat(
        self, message: dict, messages: list, model_id: Optional[int]
    ) -> dict:
        """处理流式聊天"""
        conversation_id = message.get("conversationId")
        msg_id = message.get("id")
        # 是否使用传入的历史记录
        incoming_history = message.get("history", [])

        # 发送流式开始消息
        if self.send_callback:
            await self.send_callback({
                "type": "chat_stream_start",
                "id": msg_id,
                "timestamp": int(time.time() * 1000),
                "conversationId": conversation_id,
                "modelId": model_id,
            })

        full_content = ""
        chunk_index = 0

        try:
            # 流式调用模型
            async for chunk in model_router.chat_stream_async(messages, model_id):
                full_content += chunk
                chunk_index += 1

                # 发送流式内容块
                if self.send_callback:
                    await self.send_callback({
                        "type": "chat_stream_chunk",
                        "id": f"{msg_id}_chunk_{chunk_index}",
                        "timestamp": int(time.time() * 1000),
                        "conversationId": conversation_id,
                        "content": chunk,
                        "chunkIndex": chunk_index,
                    })

            # 存储完整响应（仅在没有传入历史时使用内存存储）
            if not incoming_history and conversation_id:
                if conversation_id not in self.conversations:
                    self.conversations[conversation_id] = []
                self.conversations[conversation_id].append({
                    "role": "assistant",
                    "content": full_content,
                    "timestamp": int(time.time() * 1000)
                })

            # 发送流式结束消息
            if self.send_callback:
                await self.send_callback({
                    "type": "chat_stream_end",
                    "id": f"{msg_id}_end",
                    "timestamp": int(time.time() * 1000),
                    "conversationId": conversation_id,
                    "fullContent": full_content,
                })

            return None  # 不返回响应，已通过流式消息发送

        except Exception as e:
            logger.error(f"流式聊天错误: {e}")
            # 发送错误消息
            if self.send_callback:
                await self.send_callback({
                    "type": "chat_error",
                    "id": msg_id,
                    "timestamp": int(time.time() * 1000),
                    "error": str(e),
                    "conversationId": conversation_id,
                })
            return None

    async def _handle_agent_chat(self, message: dict) -> Optional[dict]:
        """
        处理 Agent 聊天消息

        Agent 模式使用 ReAct (Reasoning + Acting) 循环：
        1. 思考：分析用户问题，决定下一步行动
        2. 行动：调用工具或给出答案
        3. 观察：查看工具结果，继续思考

        每一步都会通过 WebSocket 发送 agent_step 消息给前端，
        让用户看到 Agent 的思考过程。
        """
        content = message.get("content", "")
        conversation_id = message.get("conversationId", "")
        model_id = message.get("modelId")  # 可选，指定模型
        incoming_history = message.get("history", [])  # 历史消息
        knowledge_id = message.get("knowledgeId")  # 知识库 ID（可选）
        knowledge_metadata = message.get("knowledgeMetadata")  # 知识库元数据
        msg_id = message.get("id")

        logger.info(f"[Agent] 收到消息: {content[:50]}...")
        logger.info(f"[Agent] 知识库元数据: {knowledge_metadata}")

        try:
            # 导入 Agent 模块
            from agent import ReActAgent
            from langchain_core.messages import HumanMessage
            from agent.knowledge_tool import KnowledgeRetrieverTool

            # 设置知识库元数据（用于智能匹配）
            if knowledge_metadata:
                KnowledgeRetrieverTool.set_knowledge_metadata(knowledge_metadata)
                logger.info(f"[Agent] 已设置知识库元数据: {list(knowledge_metadata.keys())}")

            # 如果指定了知识库，设置默认知识库
            if knowledge_id:
                KnowledgeRetrieverTool.set_default_knowledge(knowledge_id)
                logger.info(f"[Agent] 已设置默认知识库: {knowledge_id}")
            else:
                KnowledgeRetrieverTool.set_default_knowledge(None)

            # 发送流式开始消息（让前端知道 conversationId）
            if self.send_callback:
                await self.send_callback({
                    "type": "chat_stream_start",
                    "id": msg_id,
                    "timestamp": int(time.time() * 1000),
                    "conversationId": conversation_id,
                    "modelId": model_id,
                })

            # 创建 Agent 实例
            agent = ReActAgent(model_id=model_id)

            # 构建消息列表
            messages = []
            if incoming_history:
                for msg in incoming_history:
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    # 其他角色的消息可以后续添加

            # 执行 Agent（流式输出思考过程）
            sent_step_count = 0  # 已发送的步骤数量
            async for event in agent.astream(
                input_text=content,
                messages=messages if messages else None,
                conversation_id=conversation_id
            ):
                node_name = event.get("node", "")
                state_update = event.get("update", {})

                logger.info(
                    f"[Agent] 事件: node={node_name}, update keys={list(state_update.keys())}")

                # 发送 Agent 步骤消息
                if self.send_callback:
                    # 处理步骤更新 - 只发送新增的步骤
                    if "steps" in state_update:
                        all_steps = state_update["steps"]
                        new_steps = all_steps[sent_step_count:]  # 只取新增的步骤
                        sent_step_count = len(all_steps)  # 更新已发送数量

                        for step in new_steps:
                            step_data = {
                                "type": "agent_step",
                                "id": f"{msg_id}_step_{step.get('type', 'unknown')}_{sent_step_count}",
                                "timestamp": int(time.time() * 1000),
                                "conversationId": conversation_id,
                                "stepType": step.get("type", "thought"),
                                "content": step.get("content", ""),
                                "toolCall": step.get("tool_call"),
                                "iteration": state_update.get("iteration_count", 0),
                            }
                            logger.info(
                                f"[Agent] 发送步骤: {step_data['stepType']}, content={step_data['content'][:50] if step_data['content'] else 'empty'}")
                            await self.send_callback(step_data)

                    # 如果有最终输出，发送结束消息（流式输出）
                    if state_update.get("output") and state_update.get("should_finish"):
                        final_content = state_update["output"]

                        # 发送流式内容块（模拟流式效果）
                        chunk_size = 20  # 每块字符数
                        for i in range(0, len(final_content), chunk_size):
                            chunk = final_content[i:i + chunk_size]
                            await self.send_callback({
                                "type": "chat_stream_chunk",
                                "id": f"{msg_id}_chunk_{i}",
                                "timestamp": int(time.time() * 1000),
                                "conversationId": conversation_id,
                                "content": chunk,
                                "chunkIndex": i // chunk_size,
                            })
                            # 小延迟模拟流式效果
                            await asyncio.sleep(0.01)

                        # 发送结束消息
                        await self.send_callback({
                            "type": "chat_stream_end",
                            "id": f"{msg_id}_end",
                            "timestamp": int(time.time() * 1000),
                            "conversationId": conversation_id,
                            "fullContent": final_content,
                        })

            return None  # 通过流式消息发送，不返回响应

        except Exception as e:
            import traceback
            logger.error(f"[Agent] 处理消息错误: {e}")
            logger.error(f"[Agent] 错误堆栈: {traceback.format_exc()}")
            if self.send_callback:
                await self.send_callback({
                    "type": "chat_error",
                    "id": msg_id,
                    "timestamp": int(time.time() * 1000),
                    "error": str(e),
                    "conversationId": conversation_id,
                })
            return None

    async def _handle_system_status(self, message: dict) -> dict:
        """处理系统状态查询"""
        return {
            "type": "system_status",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            "status": "ready",
            "conversations": len(self.conversations),
            "registered_models": len(model_router._models)
        }

    async def _handle_model_register(self, message: dict) -> dict:
        """处理模型注册请求"""
        try:
            model_id = message.get("modelId")
            config_data = message.get("config", {})

            if not model_id:
                return self._error_response("缺少 modelId", message.get("id"))

            # 构建模型配置
            provider_str = config_data.get("provider", "openai")
            try:
                provider = ModelProvider(provider_str)
            except ValueError:
                return self._error_response(f"不支持的提供商: {provider_str}", message.get("id"))

            config = ModelConfig(
                provider=provider,
                model_id=config_data.get("modelId", ""),
                api_key=config_data.get("apiKey"),
                api_base_url=config_data.get("apiBaseUrl"),
                host=config_data.get("host"),
                max_tokens=config_data.get("maxTokens", 4096),
                temperature=config_data.get("temperature", 0.7),
                extra_params=config_data.get("extraParams"),
            )

            # 注册模型
            model_router.register_model(model_id, config)

            return {
                "type": "model_register_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "modelId": model_id,
                "provider": provider.value,
                "model": config.model_id
            }
        except Exception as e:
            logger.error(f"注册模型失败: {e}")
            return self._error_response(str(e), message.get("id"))

    async def _handle_model_unregister(self, message: dict) -> dict:
        """处理模型注销请求"""
        model_id = message.get("modelId")

        if not model_id:
            return self._error_response("缺少 modelId", message.get("id"))

        model_router.unregister_model(model_id)

        return {
            "type": "model_unregister_response",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            "success": True,
            "modelId": model_id
        }

    async def _handle_model_test(self, message: dict) -> dict:
        """处理模型连接测试请求"""
        model_id = message.get("modelId")

        if not model_id:
            return self._error_response("缺少 modelId", message.get("id"))

        result = await model_router.test_connection(model_id)

        return {
            "type": "model_test_response",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            **result
        }

    async def _handle_model_config_sync(self, message: dict) -> dict:
        """处理模型配置同步请求"""
        try:
            configs = message.get("configs", [])
            registered_count = 0
            errors = []

            for config_data in configs:
                try:
                    model_id = config_data.get("id")
                    if not model_id:
                        continue

                    # 构建模型配置
                    provider_str = config_data.get("provider", "openai")
                    try:
                        provider = ModelProvider(provider_str)
                    except ValueError:
                        errors.append(f"不支持的模型提供商: {provider_str}")
                        continue

                    config = ModelConfig(
                        id=model_id,
                        provider=provider,
                        model_id=config_data.get("modelId", ""),
                        api_key=config_data.get("apiKey"),
                        api_base_url=config_data.get("apiBaseUrl"),
                        host=config_data.get("host"),
                        max_tokens=config_data.get("maxTokens", 4096),
                        temperature=config_data.get("temperature", 0.7),
                    )

                    # 注册模型
                    model_router.register_model(model_id, config)
                    registered_count += 1
                    logger.info(
                        f"已注册模型: {config.model_id} (provider: {provider})")

                except Exception as e:
                    errors.append(f"注册模型 {config_data.get('id')} 失败: {str(e)}")
                    logger.error(f"注册模型失败: {e}")

            return {
                "type": "model_config_sync_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "registered_count": registered_count,
                "errors": errors if errors else None,
            }

        except Exception as e:
            logger.error(f"处理模型配置同步错误: {e}")
            return self._error_response(str(e), message.get("id"))

    async def _generate_mock_response(self, content: str) -> str:
        """生成模拟响应（后续替换为实际 AI 处理）"""
        # 模拟处理延迟
        await self._async_sleep(0.1)

        # 简单的响应逻辑
        responses = {
            "你好": "你好！我是 AI 助手，很高兴为您服务。",
            "hello": "Hello! I'm your AI assistant.",
            "帮助": "我可以帮助您：\n1. 回答问题\n2. 处理文本\n3. 提供建议\n\n请告诉我您需要什么帮助？",
            "help": "I can help you with:\n1. Answering questions\n2. Processing text\n3. Providing suggestions\n\nWhat do you need?",
        }

        # 检查是否有预设响应
        content_lower = content.lower().strip()
        for key, response in responses.items():
            if key.lower() in content_lower:
                return response

        # 默认响应
        return f"收到您的消息：\"{content}\"\n\n我是 AI 助手，目前处于测试模式。后续将接入实际的智能体进行处理。"

    async def _async_sleep(self, seconds: float):
        """异步睡眠"""
        import asyncio
        await asyncio.sleep(seconds)

    def _error_response(self, error: str, msg_id: Optional[str] = None) -> dict:
        """生成错误响应"""
        return {
            "type": "chat_error",
            "id": msg_id,
            "timestamp": int(time.time() * 1000),
            "error": error,
            "code": "PROCESSING_ERROR"
        }

    # ===== Ollama 相关处理器 =====

    async def _handle_ollama_status(self, message: dict) -> dict:
        """处理 Ollama 状态查询"""
        host = message.get("host", "http://127.0.0.1:11434")

        try:
            status = await check_ollama_status(host)
            return {
                "type": "ollama_status_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                **status.to_dict()
            }
        except Exception as e:
            logger.error(f"检查 Ollama 状态失败: {e}")
            return {
                "type": "ollama_status_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "running": False,
                "host": host,
                "error": str(e),
            }

    async def _handle_ollama_models(self, message: dict) -> dict:
        """处理 Ollama 模型列表查询"""
        host = message.get("host", "http://127.0.0.1:11434")

        try:
            models = await get_ollama_models(host)
            return {
                "type": "ollama_models_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "host": host,
                "models": [m.to_dict() for m in models],
                "count": len(models),
            }
        except Exception as e:
            logger.error(f"获取 Ollama 模型列表失败: {e}")
            return {
                "type": "ollama_models_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "host": host,
                "error": str(e),
                "models": [],
                "count": 0,
            }

    async def _handle_ollama_test(self, message: dict) -> dict:
        """处理 Ollama 连接测试"""
        host = message.get("host", "http://127.0.0.1:11434")

        try:
            client = get_ollama_client(host)
            result = await client.test_connection()
            return {
                "type": "ollama_test_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                **result
            }
        except Exception as e:
            logger.error(f"测试 Ollama 连接失败: {e}")
            return {
                "type": "ollama_test_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "host": host,
                "error": str(e),
            }

    # ==================== Skills 技能相关处理 ====================

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
                import os
                skills_dir = os.path.join(os.path.dirname(__file__), "skills")

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

    # ==================== Knowledge 知识库相关消息处理 ====================

    async def _handle_knowledge_create(self, message: dict) -> dict:
        """处理创建知识库请求"""
        name = message.get("name", "")
        description = message.get("description")
        embedding_model = message.get("embeddingModel", "ollama")
        embedding_model_name = message.get(
            "embeddingModelName", "nomic-embed-text")
        # 优先使用传入的 knowledgeId，否则生成新的
        knowledge_id = message.get("knowledgeId")

        if not name:
            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "知识库名称不能为空",
            }

        try:
            from rag.vectorstore import LanceDBVectorStore, get_vectorstore
            from rag.embeddings import EmbeddingService, EmbeddingModelType

            # 创建向量存储
            vectorstore = get_vectorstore()

            # 确定嵌入模型类型和维度
            model_type = EmbeddingModelType.OLLAMA if embedding_model == "ollama" else EmbeddingModelType.OPENAI
            embedding_service = EmbeddingService(
                model_type=model_type,
                model_name=embedding_model_name,
            )

            # 如果没有传入 ID，生成一个
            if not knowledge_id:
                knowledge_id = f"kb_{int(time.time() * 1000)}"

            # 创建集合
            success = vectorstore.create_collection(
                knowledge_id, embedding_service.dimension)

            if success:
                return {
                    "type": "knowledge_create_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": True,
                    "knowledge": {
                        "id": knowledge_id,
                        "name": name,
                        "description": description,
                        "embeddingModel": embedding_model,
                        "embeddingModelName": embedding_model_name,
                        "documentCount": 0,
                        "totalChunks": 0,
                        "createdAt": int(time.time() * 1000),
                        "updatedAt": int(time.time() * 1000),
                    },
                }
            else:
                return {
                    "type": "knowledge_create_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": "创建知识库失败",
                }

        except Exception as e:
            logger.error(f"创建知识库错误: {e}")
            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_knowledge_delete(self, message: dict) -> dict:
        """处理删除知识库请求"""
        knowledge_id = message.get("knowledgeId")

        if not knowledge_id:
            return {
                "type": "knowledge_delete_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "知识库 ID 不能为空",
            }

        try:
            from rag.vectorstore import get_vectorstore

            vectorstore = get_vectorstore()
            success = vectorstore.delete_collection(knowledge_id)

            return {
                "type": "knowledge_delete_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": success,
                "knowledgeId": knowledge_id,
            }

        except Exception as e:
            logger.error(f"删除知识库错误: {e}")
            return {
                "type": "knowledge_delete_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "knowledgeId": knowledge_id,
                "error": str(e),
            }

    async def _handle_knowledge_list(self, message: dict) -> dict:
        """处理知识库列表请求"""
        try:
            from rag.vectorstore import get_vectorstore

            vectorstore = get_vectorstore()
            stats = vectorstore.get_stats()

            # 将集合信息转换为知识库格式
            knowledge_list = []
            for collection in stats.get("collections", []):
                knowledge_list.append({
                    "id": collection["id"],
                    "name": collection["id"],  # 使用集合 ID 作为名称
                    "documentCount": collection["document_count"],
                    "totalChunks": 0,  # TODO: 从数据库获取
                    "embeddingModel": "ollama",
                    "embeddingModelName": "nomic-embed-text",
                    "createdAt": int(time.time() * 1000),
                    "updatedAt": int(time.time() * 1000),
                })

            return {
                "type": "knowledge_list_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "knowledge": knowledge_list,
                "count": len(knowledge_list),
            }

        except Exception as e:
            logger.error(f"获取知识库列表错误: {e}")
            return {
                "type": "knowledge_list_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "knowledge": [],
                "count": 0,
                "error": str(e),
            }

    async def _handle_knowledge_add_document(self, message: dict) -> dict:
        """处理添加文档请求"""
        knowledge_id = message.get("knowledgeId")
        file_path = message.get("filePath")

        if not knowledge_id or not file_path:
            return {
                "type": "knowledge_add_document_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "知识库 ID 和文件路径不能为空",
            }

        try:
            from rag.vectorstore import get_vectorstore, Document
            from rag.document_processor import DocumentProcessor
            from rag.text_splitter import SmartTextSplitter
            from rag.embeddings import get_embedding_service
            import uuid
            import os

            # 检查文件是否存在
            if not os.path.exists(file_path):
                return {
                    "type": "knowledge_add_document_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": f"文件不存在: {file_path}",
                }

            # 处理文档
            processor = DocumentProcessor()
            documents = processor.process_file(file_path)

            if not documents:
                return {
                    "type": "knowledge_add_document_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": "文档解析失败或文件格式不支持",
                }

            # 分块
            splitter = SmartTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = splitter.split_documents(documents)

            # 转换为向量存储文档
            vectorstore = get_vectorstore()
            embedding_service = get_embedding_service()

            docs_to_add = []
            for chunk in chunks:
                doc = Document(
                    id=str(uuid.uuid4()),
                    content=chunk.content,
                    metadata=chunk.metadata,
                )
                docs_to_add.append(doc)

            # 添加到向量存储
            count = await vectorstore.add_documents(
                knowledge_id=knowledge_id,
                documents=docs_to_add,
                embedding_service=embedding_service,
            )

            return {
                "type": "knowledge_add_document_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "document": {
                    "id": str(uuid.uuid4()),
                    "knowledgeId": knowledge_id,
                    "fileName": os.path.basename(file_path),
                    "filePath": file_path,
                    "fileType": os.path.splitext(file_path)[1],
                    "fileSize": os.path.getsize(file_path),
                    "chunkCount": count,
                    "createdAt": int(time.time() * 1000),
                },
            }

        except Exception as e:
            logger.error(f"添加文档错误: {e}")
            return {
                "type": "knowledge_add_document_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_knowledge_search(self, message: dict) -> dict:
        """处理知识库搜索请求"""
        knowledge_id = message.get("knowledgeId")
        query = message.get("query", "")
        top_k = message.get("topK", 5)
        method = message.get("method", "hybrid")

        if not knowledge_id or not query:
            return {
                "type": "knowledge_search_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "results": [],
                "count": 0,
                "error": "知识库 ID 和查询内容不能为空",
            }

        try:
            from rag.retriever import KnowledgeRetriever
            from rag.vectorstore import get_vectorstore
            from rag.embeddings import get_embedding_service

            vectorstore = get_vectorstore()
            embedding_service = get_embedding_service()

            retriever = KnowledgeRetriever(vectorstore, embedding_service)

            results = await retriever.retrieve(
                knowledge_id=knowledge_id,
                query=query,
                top_k=top_k,
                method=method,
            )

            # 转换结果格式
            search_results = []
            for result in results:
                search_results.append({
                    "content": result.content,
                    "score": result.score,
                    "metadata": result.metadata,
                    "retrievalMethod": result.retrieval_method,
                })

            return {
                "type": "knowledge_search_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "results": search_results,
                "count": len(search_results),
            }

        except Exception as e:
            logger.error(f"搜索知识库错误: {e}")
            return {
                "type": "knowledge_search_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "results": [],
                "count": 0,
                "error": str(e),
            }

    async def _handle_knowledge_list_documents(self, message: dict) -> dict:
        """处理列出知识库文档请求"""
        # 这个方法主要依赖 Electron 端的数据库，这里返回空列表
        knowledge_id = message.get("knowledgeId")

        return {
            "type": "knowledge_list_documents_response",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            "success": True,
            "documents": [],
            "count": 0,
        }
