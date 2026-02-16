#!/usr/bin/env python3
"""
消息处理器
处理来自 Electron 的消息并返回响应
"""
import json
import logging
import time
from typing import Any, Dict, Optional

from model_router import model_router, ModelConfig, ModelProvider

logger = logging.getLogger(__name__)


class MessageHandler:
    """消息处理器"""

    def __init__(self):
        self.handlers = {
            "ping": self._handle_ping,
            "chat_message": self._handle_chat_message,
            "system_status": self._handle_system_status,
            "model_register": self._handle_model_register,
            "model_unregister": self._handle_model_unregister,
            "model_test": self._handle_model_test,
            "model_config_sync": self._handle_model_config_sync,
            "connection_ack": self._handle_connection_ack,
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

        logger.info(f"收到聊天消息: {content[:50]}...")

        # 存储会话历史
        if conversation_id:
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
            if conversation_id and conversation_id in self.conversations:
                # 添加历史消息
                for msg in self.conversations[conversation_id][:-1]:  # 不包括刚添加的用户消息
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
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

                # 存储响应
                if conversation_id:
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

            if conversation_id:
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
        """处理流式聊天（返回流式开始消息，后续通过回调发送）"""
        # 注意：实际的流式内容需要通过 WebSocket 连接直接发送
        # 这里返回一个流式开始的消息，让前端知道要接收流式数据
        return {
            "type": "chat_stream_start",
            "id": message.get("id"),
            "timestamp": int(time.time() * 1000),
            "conversationId": message.get("conversationId"),
            "modelId": model_id,
        }

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
                    logger.info(f"已注册模型: {config.model_id} (provider: {provider})")

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
