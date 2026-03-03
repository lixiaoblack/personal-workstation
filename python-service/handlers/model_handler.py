"""
模型管理处理器

处理模型注册、注销、测试等操作。
"""
import time
import logging
from typing import Any, Dict, Optional, Callable, Awaitable

from .base_handler import BaseHandler
from model_router import model_router, ModelConfig, ModelProvider

logger = logging.getLogger(__name__)


class ModelHandler(BaseHandler):
    """
    模型管理处理器

    处理以下消息类型：
    - model_register: 注册模型
    - model_unregister: 注销模型
    - model_test: 测试模型连接
    - model_config_sync: 同步模型配置
    """

    async def handle(self, message: dict) -> Optional[dict]:
        """处理模型管理消息"""
        msg_type = message.get("type")

        if msg_type == "model_register":
            return await self._handle_model_register(message)
        elif msg_type == "model_unregister":
            return await self._handle_model_unregister(message)
        elif msg_type == "model_test":
            return await self._handle_model_test(message)
        elif msg_type == "model_config_sync":
            return await self._handle_model_config_sync(message)
        else:
            return self.error_response(f"未知的模型消息类型: {msg_type}", message.get("id"))

    async def _handle_model_register(self, message: dict) -> dict:
        """处理模型注册请求"""
        try:
            model_id = message.get("modelId")
            config_data = message.get("config", {})

            if not model_id:
                return self.error_response("缺少 modelId", message.get("id"))

            # 构建模型配置
            provider_str = config_data.get("provider", "openai")
            try:
                provider = ModelProvider(provider_str)
            except ValueError:
                return self.error_response(f"不支持的提供商: {provider_str}", message.get("id"))

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
            return self.error_response(str(e), message.get("id"))

    async def _handle_model_unregister(self, message: dict) -> dict:
        """处理模型注销请求"""
        model_id = message.get("modelId")

        if not model_id:
            return self.error_response("缺少 modelId", message.get("id"))

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
            return self.error_response("缺少 modelId", message.get("id"))

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
                        usage_type=config_data.get("usageType", "llm"),
                        api_key=config_data.get("apiKey"),
                        api_base_url=config_data.get("apiBaseUrl"),
                        host=config_data.get("host"),
                        dimension=config_data.get("dimension"),  # 向量维度
                        max_tokens=config_data.get("maxTokens", 4096),
                        temperature=config_data.get("temperature", 0.7),
                    )

                    # 注册模型
                    model_router.register_model(model_id, config)
                    registered_count += 1
                    # 详细日志：打印 dimension 是否正确传递
                    logger.info(
                        f"已注册模型: {config.model_id} (provider: {provider}, usage_type: {config.usage_type}, dimension: {config.dimension})"
                    )

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
            return self.error_response(str(e), message.get("id"))
