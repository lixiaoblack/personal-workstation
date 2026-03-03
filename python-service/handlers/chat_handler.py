"""
聊天消息处理器

处理普通聊天消息，保留原有的逻辑不变。
"""
import time
import logging
from typing import Any, Dict, Optional, Callable, Awaitable, List

from .base_handler import BaseHandler
from model_router import model_router

logger = logging.getLogger(__name__)


class ChatHandler(BaseHandler):
    """
    聊天消息处理器

    处理普通聊天消息（chat_message），支持：
    1. 普通聊天：直接调用 LLM
    2. 工具增强聊天：使用 Function Calling
    3. 流式输出

    注意：此处理器保留原有的逻辑，不做任何修改。
    """

    def __init__(self, send_callback: Optional[Callable[[dict], Awaitable[None]]] = None):
        super().__init__(send_callback)
        # 会话存储（内存中，后续可替换为持久化存储）
        self.conversations: Dict[str, list] = {}

    async def handle(self, message: dict) -> Optional[dict]:
        """
        处理聊天消息

        Args:
            message: 消息字典，包含以下字段：
                - content: 用户消息内容
                - conversationId: 会话 ID
                - modelId: 模型 ID（可选）
                - stream: 是否流式输出
                - history: 历史消息列表
                - useTools: 是否启用工具（Function Calling）

        Returns:
            响应字典，或 None（流式消息通过 send_callback 发送）
        """
        return await self._handle_chat_message(message)

    async def _handle_chat_message(self, message: dict) -> dict:
        """
        处理聊天消息

        支持两种模式：
        1. 普通聊天：直接调用 LLM
        2. 工具增强聊天：使用 Function Calling，让 LLM 可以调用工具
        """
        content = message.get("content", "")
        conversation_id = message.get("conversationId")
        model_id = message.get("modelId")  # 可选，指定模型
        stream = message.get("stream", False)  # 是否流式输出
        # 优先使用传入的历史记录（滑动窗口策略）
        incoming_history = message.get("history", [])
        # 是否启用工具（Function Calling）
        use_tools = message.get("useTools", False)  # 默认不启用

        logger.info(f"收到聊天消息: {content[:50]}... (useTools={use_tools})")

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

            # 如果启用工具，使用 Function Calling
            if use_tools:
                return await self._handle_chat_with_tools(
                    message, messages, model_id, conversation_id
                )

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
            return self.error_response(str(e), message.get("id"))

    async def _handle_chat_with_tools(
        self,
        message: dict,
        messages: list,
        model_id: Optional[int],
        conversation_id: str
    ) -> dict:
        """
        使用 Function Calling 的聊天

        让 LLM 可以调用工具获取信息，然后生成回答。
        """
        from agent.tools import global_tool_registry

        # 获取所有工具的 OpenAI 格式
        tools = global_tool_registry.get_openai_tools()
        logger.info(f"[FunctionCalling] 可用工具数量: {len(tools)}")

        # 定义工具执行器
        async def tool_executor(tool_name: str, tool_args: dict) -> str:
            """执行工具并返回结果"""
            try:
                result = global_tool_registry.execute_tool(
                    tool_name, tool_args)
                logger.info(f"[FunctionCalling] 工具 {tool_name} 执行成功")
                return result
            except Exception as e:
                error_msg = f"工具 {tool_name} 执行失败: {str(e)}"
                logger.error(error_msg)
                return error_msg

        try:
            # 使用支持工具的聊天方法
            response_content = await model_router.chat_with_tools(
                messages=messages,
                model_id=model_id,
                tools=tools,
                tool_executor=tool_executor
            )

            # 存储响应
            if conversation_id and conversation_id in self.conversations:
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
                "usedTools": True  # 标记使用了工具
            }

        except Exception as e:
            logger.error(f"[FunctionCalling] 工具聊天错误: {e}")
            # 降级到普通聊天
            response_content = await model_router.chat_async(
                messages=messages,
                model_id=model_id
            )
            return {
                "type": "chat_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "content": response_content,
                "conversationId": conversation_id,
                "success": True,
                "fallback": True
            }

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
