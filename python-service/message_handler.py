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
from ask import AskHandler

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
        # 初始化 Ask 模块
        self.ask_handler = AskHandler(send_callback=send_callback)
        
        # 设置 AskHandler 引用到 Todo 工具模块
        from agent.todo_tool import set_ask_handler
        set_ask_handler(self.ask_handler)
        
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
            # Memory 记忆相关
            "memory_generate_summary": self._handle_memory_generate_summary,
            "memory_extract": self._handle_memory_extract,
            # Web Crawl 网页采集相关
            "web_crawl": self._handle_web_crawl,
            "web_fetch": self._handle_web_fetch,
            # Ask 通用交互模块
            "ask_response": self._handle_ask_response,
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
            return self._error_response(str(e), message.get("id"))

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

    async def _handle_agent_chat(self, message: dict) -> Optional[dict]:
        """
        处理 Agent 聊天消息

        Agent 模式使用 ReAct (Reasoning + Acting) 循环或 Deep Agents：
        1. 思考：分析用户问题，决定下一步行动
        2. 行动：调用工具或给出答案
        3. 观察：查看工具结果，继续思考

        Deep Agents 提供额外能力：
        - 任务规划与分解 (write_todos)
        - 上下文管理 (文件系统工具)
        - 子智能体生成 (task 工具)
        - 长期记忆 (Memory Store)

        每一步都会通过 WebSocket 发送 agent_step 消息给前端，
        让用户看到 Agent 的思考过程。
        """
        content = message.get("content", "")
        conversation_id = message.get("conversationId", "")
        model_id = message.get("modelId")  # 可选，指定模型
        incoming_history = message.get("history", [])  # 历史消息
        knowledge_id = message.get("knowledgeId")  # 知识库 ID（可选）
        knowledge_metadata = message.get("knowledgeMetadata")  # 知识库元数据
        use_deep_agent = message.get("useDeepAgent", True)  # 是否使用 Deep Agent
        attachments = message.get("attachments", [])  # 附件列表
        msg_id = message.get("id")

        logger.info(f"[Agent] 收到消息: {content[:50]}...")
        logger.info(f"[Agent] 知识库元数据: {knowledge_metadata}")
        logger.info(f"[Agent] 使用 Deep Agent: {use_deep_agent}")
        logger.info(f"[Agent] 附件数量: {len(attachments)}")
        if attachments:
            for att in attachments:
                logger.info(
                    f"[Agent] 附件: {att.get('name')} | 路径: {att.get('path')} | 类型: {att.get('type')}")

        try:
            from langchain_core.messages import HumanMessage
            from agent.knowledge_tool import KnowledgeRetrieverTool
            from agent.tools import global_tool_registry

            # 设置知识库元数据（用于智能匹配）
            if knowledge_metadata:
                KnowledgeRetrieverTool.set_knowledge_metadata(
                    knowledge_metadata)
                logger.info(
                    f"[Agent] 已设置知识库元数据: {list(knowledge_metadata.keys())}")

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

            # 尝试使用 Deep Agent
            if use_deep_agent:
                try:
                    result = await self._run_deep_agent(
                        content=content,
                        conversation_id=conversation_id,
                        model_id=model_id,
                        incoming_history=incoming_history,
                        msg_id=msg_id,
                        attachments=attachments,
                    )
                    # 如果 Deep Agent 完成执行（包括返回 {"completed": True}），直接返回
                    if result is not None:
                        return result
                    # Deep Agent 返回 None（SDK 未安装），降级到 ReAct Agent
                    logger.info("[Agent] Deep Agent 不可用，降级到 ReAct Agent")
                except Exception as e:
                    logger.warning(
                        f"[Agent] Deep Agent 执行失败，降级到 ReAct Agent: {e}")

            # 使用 ReAct Agent（默认或降级）
            return await self._run_react_agent(
                content=content,
                conversation_id=conversation_id,
                model_id=model_id,
                incoming_history=incoming_history,
                msg_id=msg_id,
            )

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

    async def _run_deep_agent(
        self,
        content: str,
        conversation_id: str,
        model_id: Optional[int],
        incoming_history: list,
        msg_id: str,
        attachments: list = [],
    ) -> Optional[dict]:
        """
        使用 Deep Agent 执行

        Deep Agents 提供高级能力：
        - 任务规划 (write_todos)
        - 上下文管理 (文件系统工具)
        - 子智能体生成 (task 工具)
        - 长期记忆

        Args:
            content: 用户输入
            conversation_id: 会话 ID
            model_id: 模型 ID
            incoming_history: 历史消息
            msg_id: 消息 ID
            attachments: 附件列表

        Returns:
            执行结果，如果 Deep Agent 不可用返回 None
        """
        try:
            from agent import DeepAgentWrapper, MessageSender, create_deep_agent
            from agent.tools import global_tool_registry
            from agent.knowledge_tool import KnowledgeRetrieverTool
            from langchain_core.messages import HumanMessage, AIMessage

            # 创建消息发送器
            async def send_step_callback(step_data):
                if self.send_callback:
                    await self.send_callback(step_data)

            message_sender = MessageSender(send_callback=send_step_callback)

            # 获取所有工具
            tools = [
                global_tool_registry.get_tool(name)
                for name in global_tool_registry.list_tools()
                if global_tool_registry.get_tool(name)
            ]

            # 获取默认知识库（提前获取，用于注入检索结果）
            default_knowledge_id = KnowledgeRetrieverTool.get_default_knowledge()

            # 创建 Deep Agent
            agent = create_deep_agent(
                model_id=model_id,
                tools=tools,
                message_sender=message_sender
            )

            # 构建消息列表
            messages = []
            if incoming_history:
                for msg in incoming_history:
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))

            # 获取知识库元数据（default_knowledge_id 已在前面获取）
            knowledge_metadata = KnowledgeRetrieverTool.get_knowledge_metadata()
            enhanced_content = content

            # 如果有附件，设置附件路径映射并构建附件上下文
            attachment_context = ""
            if attachments:
                # 设置附件路径映射，用于修正 file_read 工具的路径
                attachment_paths = {}
                attachment_info = []
                for att in attachments:
                    att_name = att.get('name', '未知文件')
                    att_path = att.get('path', '')
                    att_type = att.get('type', 'other')
                    att_size = att.get('size', 0)
                    # 建立文件名到路径的映射
                    attachment_paths[att_name] = att_path
                    # 更清晰地标注文件路径，让 Agent 能正确识别
                    attachment_info.append(f"""文件名称: {att_name}
文件路径: {att_path}
文件类型: {att_type}
文件大小: {att_size} 字节""")

                # 设置附件路径映射（用于修正 LLM 可能编造的路径）
                DeepAgentWrapper.set_attachment_paths(attachment_paths)

                attachment_context = f"""
[重要：用户上传了以下文件]
{chr(10).join(attachment_info)}

[指令] 用户上传了文件并询问相关问题，你必须先使用 file_read 工具读取文件内容。

调用示例：
file_read(file_path="{attachments[0].get('path', '')}")

**不要使用其他路径，必须使用上面列出的文件路径！**
"""
                logger.info(
                    f"[DeepAgent] 已构建附件上下文，长度: {len(attachment_context)}")
                logger.info(f"[DeepAgent] 附件路径映射: {attachment_paths}")

            if default_knowledge_id and knowledge_metadata:
                kb_info = knowledge_metadata.get(default_knowledge_id, {})
                kb_name = kb_info.get("name", "未知知识库")
                kb_desc = kb_info.get("description", "")

                # 先自动检索知识库，获取相关内容
                knowledge_context = ""
                knowledge_search_result = None
                try:
                    from agent.knowledge_tool import KnowledgeRetrieverTool
                    retriever = KnowledgeRetrieverTool()
                    # 执行检索（使用异步方法）
                    knowledge_search_result = await retriever._call_async(
                        query=content,
                        knowledge_id=default_knowledge_id
                    )
                    if knowledge_search_result and "未找到" not in knowledge_search_result and "没有找到" not in knowledge_search_result and "错误" not in knowledge_search_result:
                        knowledge_context = f"""以下是从「{kb_name}」知识库中检索到的相关内容：

{knowledge_search_result}"""
                        logger.info(
                            f"[DeepAgent] 知识库检索成功，结果长度: {len(knowledge_search_result)}")
                    else:
                        logger.info(
                            f"[DeepAgent] 知识库未找到相关内容: {knowledge_search_result[:100] if knowledge_search_result else 'empty'}")
                except Exception as e:
                    logger.warning(f"[DeepAgent] 知识库检索失败: {e}")

                # 🎯 检测用户是否明确要求联网搜索
                web_search_keywords = ["联网搜索", "网上搜索", "网络搜索",
                                       "搜索一下", "搜一下", "查一下", "百度", "谷歌", "搜索看看"]
                user_wants_web_search = any(
                    kw in content.lower() for kw in web_search_keywords)

                # 🎯 关键改进：如果知识库有检索结果，且用户未明确要求联网搜索，直接用 LLM 回答
                if knowledge_context and not attachment_context and not user_wants_web_search:
                    logger.info(f"[DeepAgent] 知识库有结果，直接 LLM 回答（跳过 Agent 工具调用）")

                    # 构建消息
                    llm_messages = []
                    if incoming_history:
                        for msg in incoming_history:
                            if msg["role"] == "user":
                                llm_messages.append(
                                    {"role": "user", "content": msg["content"]})
                            elif msg["role"] == "assistant":
                                llm_messages.append(
                                    {"role": "assistant", "content": msg["content"]})

                    # 添加知识库上下文和用户问题
                    user_message = f"""{knowledge_context}

请基于以上知识库内容回答用户问题：{content}"""
                    llm_messages.append(
                        {"role": "user", "content": user_message})

                    # 直接用 LLM 流式回答
                    full_content = ""
                    chunk_count = 0
                    try:
                        async for chunk in model_router.chat_stream_async(
                            messages=llm_messages,
                            model_id=model_id
                        ):
                            chunk_count += 1
                            full_content += chunk
                            logger.debug(
                                f"[DeepAgent] LLM 流式块 #{chunk_count}: {len(chunk)} 字符, 累计: {len(full_content)}")
                            await self.send_callback({
                                "type": "chat_stream_chunk",
                                "id": f"{msg_id}_chunk",
                                "timestamp": int(time.time() * 1000),
                                "conversationId": conversation_id,
                                "content": chunk,
                                "chunkIndex": chunk_count,
                            })

                        # 发送结束消息
                        await self.send_callback({
                            "type": "chat_stream_end",
                            "id": f"{msg_id}_end",
                            "timestamp": int(time.time() * 1000),
                            "conversationId": conversation_id,
                            "fullContent": full_content,
                        })
                        logger.info(
                            f"[DeepAgent] LLM 直接回答完成，内容长度: {len(full_content)}")
                        return {"completed": True}
                    except Exception as e:
                        logger.error(
                            f"[DeepAgent] LLM 直接回答失败: {e}，降级到 Agent 流程")
                        # 继续走 Agent 流程作为降级

                # 使用系统提示格式，避免输出给用户
                if attachment_context:
                    # 有附件时，优先处理附件
                    enhanced_content = f"""{attachment_context}

[用户问题]
{content}

[注意] 用户上传了文件，请优先使用 file_read 工具读取并分析文件内容。"""
                elif knowledge_context:
                    # 有知识库检索结果
                    if user_wants_web_search:
                        # 用户明确要求联网搜索，Agent 需要调用 web_search
                        enhanced_content = f"""{knowledge_context}

[用户问题]
{content}

[用户要求] 用户明确要求联网搜索，请调用 web_search 工具搜索网络信息，并结合知识库内容回答。"""
                        logger.info(f"[DeepAgent] 用户要求联网搜索，走 Agent 流程")
                    else:
                        enhanced_content = f"""{knowledge_context}

[用户问题]
{content}"""
                else:
                    # 知识库检索无结果，Agent 可以使用其他工具补充
                    enhanced_content = f"""[Context]
用户选择了知识库: {kb_name}
知识库 ID: {default_knowledge_id}
描述: {kb_desc or '无'}

[重要] 知识库自动检索未找到相关内容。你可以：
1. 使用 web_search 工具搜索网络信息
2. 根据你的知识回答，并告知用户知识库中暂无相关内容

[User Question]
{content}"""
            elif attachment_context:
                # 只有附件，没有知识库
                enhanced_content = f"""{attachment_context}

[用户问题]
{content}

[再次提醒] 你必须调用 file_read 工具来读取文件内容！"""
                logger.info(
                    f"[DeepAgent] 使用附件上下文（无知识库），enhanced_content 长度: {len(enhanced_content)}")

            logger.info(
                f"[DeepAgent] 开始执行，工具数量: {len(tools)}, 已选知识库: {default_knowledge_id}")

            # 流式执行
            # 注意：Deep Agent 内部通过 message_sender 发送 agent_step 消息
            # 这里只需要处理流式内容和结束消息
            full_content = ""
            has_final_answer = False

            async for step in agent.astream(
                input_text=enhanced_content,
                messages=messages if messages else None,
                conversation_id=conversation_id
            ):
                step_type = step.get("step_type", "")
                step_content = step.get("content", "")

                # 如果是流式内容，发送流式消息
                if step_type == "stream_chunk":
                    full_content = step.get(
                        "full_content", full_content + step_content)
                    await self.send_callback({
                        "type": "chat_stream_chunk",
                        "id": f"{msg_id}_chunk",
                        "timestamp": int(time.time() * 1000),
                        "conversationId": conversation_id,
                        "content": step_content,
                        "chunkIndex": step.get("iteration", 0),
                    })

                # 如果是最终答案，发送结束消息
                if step_type == "answer":
                    has_final_answer = True
                    full_content = step_content if step_content else full_content
                    await self.send_callback({
                        "type": "chat_stream_end",
                        "id": f"{msg_id}_end",
                        "timestamp": int(time.time() * 1000),
                        "conversationId": conversation_id,
                        "fullContent": full_content,
                    })

                # 收集最终内容（用于后续发送结束消息）
                if step_content and step_type in ["thought", "answer"]:
                    full_content = step_content

            # 如果流式循环结束但没有收到 answer 类型，手动发送结束消息
            if not has_final_answer:
                logger.info(
                    f"[DeepAgent] 流式结束，发送结束消息，内容长度: {len(full_content)}")
                await self.send_callback({
                    "type": "chat_stream_end",
                    "id": f"{msg_id}_end",
                    "timestamp": int(time.time() * 1000),
                    "conversationId": conversation_id,
                    "fullContent": full_content,
                })

            # 如果有附件，发送 knowledge_ask_add 消息询问用户是否添加到知识库
            # 注意：延迟发送，确保前端有足够时间处理 chat_stream_end 并更新 UI
            if attachments:
                import uuid
                # 延迟 500ms 发送，确保前端已完成消息渲染
                await asyncio.sleep(0.5)
                for att in attachments:
                    await self.send_callback({
                        "type": "knowledge_ask_add",
                        "id": f"{msg_id}_ask_{uuid.uuid4().hex[:8]}",
                        "timestamp": int(time.time() * 1000),
                        "conversationId": conversation_id,
                        "content": f"已分析文件「{att.get('name', '未知文件')}」，是否需要将其添加到知识库？",
                        "attachment": {
                            "id": str(uuid.uuid4()),
                            "name": att.get("name", "未知文件"),
                            "path": att.get("path", ""),
                            "size": att.get("size", 0),
                            "type": att.get("type", "file"),
                            "mimeType": att.get("mimeType", ""),
                        },
                    })
                    logger.info(
                        f"[DeepAgent] 发送 knowledge_ask_add 消息，附件: {att.get('name')}")

            logger.info(f"[DeepAgent] 执行完成")
            return {"completed": True}  # 返回标记表示 Deep Agent 已完成执行

        except ImportError as e:
            logger.info(f"[DeepAgent] SDK 未安装，降级到 ReAct Agent: {e}")
            return None  # Deep Agent 不可用，返回 None 让调用者降级
        except Exception as e:
            logger.error(f"[DeepAgent] 执行错误: {e}")
            raise  # 抛出异常让调用者处理

    async def _run_react_agent(
        self,
        content: str,
        conversation_id: str,
        model_id: Optional[int],
        incoming_history: list,
        msg_id: str,
    ) -> Optional[dict]:
        """
        使用 ReAct Agent 执行

        ReAct (Reasoning + Acting) 循环：
        1. 思考：分析问题
        2. 行动：调用工具
        3. 观察：查看结果

        Args:
            content: 用户输入
            conversation_id: 会话 ID
            model_id: 模型 ID
            incoming_history: 历史消息
            msg_id: 消息 ID

        Returns:
            执行结果
        """
        from agent import ReActAgent
        from agent.knowledge_tool import KnowledgeRetrieverTool
        from langchain_core.messages import HumanMessage

        # 如果用户选择了知识库，在消息前面注入上下文
        default_knowledge_id = KnowledgeRetrieverTool.get_default_knowledge()
        knowledge_metadata = KnowledgeRetrieverTool.get_knowledge_metadata()
        enhanced_content = content

        if default_knowledge_id and knowledge_metadata:
            kb_info = knowledge_metadata.get(default_knowledge_id, {})
            kb_name = kb_info.get("name", "未知知识库")
            kb_desc = kb_info.get("description", "")

            # 先自动检索知识库，获取相关内容
            knowledge_context = ""
            try:
                from agent.knowledge_tool import KnowledgeRetrieverTool
                retriever = KnowledgeRetrieverTool()
                # 执行检索（使用异步方法）
                search_result = await retriever._call_async(
                    query=content,
                    knowledge_id=default_knowledge_id
                )
                if search_result and "未找到" not in search_result and "没有找到" not in search_result and "错误" not in search_result:
                    knowledge_context = f"""
【知识库检索结果】
以下是从「{kb_name}」知识库中检索到的相关内容：

{search_result}

【回答要求】
1. **优先**基于以上知识库检索结果回答用户问题
2. 如果知识库内容已足够回答问题，直接回答即可
3. 如果知识库内容不完整或无法完全回答，可以调用 web_search 等工具补充信息
4. 回答时明确标注信息来源（知识库/网络搜索/自身知识）"""
                    logger.info(
                        f"[ReActAgent] 知识库检索成功，结果长度: {len(search_result)}")
                else:
                    logger.info(f"[ReActAgent] 知识库未找到相关内容")
            except Exception as e:
                logger.warning(f"[ReActAgent] 知识库检索失败: {e}")

            # 在用户消息前添加上下文提示
            if knowledge_context:
                enhanced_content = f"""{knowledge_context}

【用户问题】{content}

【指令】请基于知识库检索结果回答问题。如果检索结果不完整，可以补充你的知识。"""
            else:
                enhanced_content = f"""【重要】用户已明确选择知识库：{kb_name}
知识库ID: {default_knowledge_id}
知识库描述: {kb_desc or '无'}

【用户问题】{content}

【指令】知识库自动检索未找到相关内容。你可以：
1. 使用 web_search 工具搜索网络信息
2. 根据你的知识回答，并告知用户知识库中暂无相关内容"""

        # 创建 Agent 实例
        agent = ReActAgent(model_id=model_id)

        # 构建消息列表
        messages = []
        if incoming_history:
            for msg in incoming_history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                # 其他角色的消息可以后续添加

        logger.info(f"[ReActAgent] 开始执行，已选知识库: {default_knowledge_id}")

        # 执行 Agent（流式输出思考过程）- 使用增强后的内容
        sent_step_count = 0  # 已发送的步骤数量
        async for event in agent.astream(
            input_text=enhanced_content,
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
    # 注意：知识库的创建/删除/列表现在统一由前端通过 FrontendBridge 处理
    # Python 端只保留 LanceDB 向量操作和搜索功能

    async def _handle_knowledge_create(self, message: dict) -> dict:
        """
        处理创建 LanceDB 集合请求（仅向量存储）

        此接口仅供前端调用，用于创建 LanceDB 向量存储集合。
        完整的知识库创建流程（SQLite + LanceDB）由前端统一处理。
        """
        knowledge_id = message.get("knowledgeId")
        embedding_model = message.get("embeddingModel", "ollama")
        embedding_model_name = message.get(
            "embeddingModelName", "nomic-embed-text")

        if not knowledge_id:
            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "知识库 ID 不能为空",
            }

        try:
            from rag.vectorstore import get_vectorstore
            from rag.embeddings import EmbeddingService, EmbeddingModelType

            # 创建向量存储
            vectorstore = get_vectorstore()

            # 确定嵌入模型类型和维度
            model_type = EmbeddingModelType.OLLAMA if embedding_model == "ollama" else EmbeddingModelType.OPENAI
            embedding_service = EmbeddingService(
                model_type=model_type,
                model_name=embedding_model_name,
            )

            # 创建集合
            success = vectorstore.create_collection(
                knowledge_id, embedding_service.dimension)

            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": success,
                "knowledgeId": knowledge_id,
            }

        except Exception as e:
            logger.error(f"创建 LanceDB 集合错误: {e}")
            return {
                "type": "knowledge_create_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_knowledge_delete(self, message: dict) -> dict:
        """
        处理删除 LanceDB 集合请求（仅向量存储）

        此接口仅供前端调用，用于删除 LanceDB 向量存储集合。
        完整的知识库删除流程（SQLite + LanceDB）由前端统一处理。
        """
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
            logger.error(f"删除 LanceDB 集合错误: {e}")
            return {
                "type": "knowledge_delete_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "knowledgeId": knowledge_id,
                "error": str(e),
            }

    async def _handle_knowledge_list(self, message: dict) -> dict:
        """
        处理获取 LanceDB 集合列表请求

        注意：此接口返回的是 LanceDB 中的集合信息，不包含 SQLite 中的元数据。
        完整的知识库列表请通过 FrontendBridge 调用 knowledgeService.listKnowledge()
        """
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
                    "totalChunks": 0,
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
                "note": "此为 LanceDB 集合列表，完整知识库列表请通过 FrontendBridge 获取",
            }

        except Exception as e:
            logger.error(f"获取 LanceDB 集合列表错误: {e}")
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
        original_file_name = message.get("originalFileName")  # 原始文件名

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

            # 获取文件扩展名
            file_ext = os.path.splitext(file_path)[1].lower()
            image_extensions = ['.jpg', '.jpeg',
                                '.png', '.gif', '.webp', '.bmp']
            ocr_text = None
            ocr_blocks = None  # OCR 边界框信息

            # 处理图片文件：执行 OCR 识别
            if file_ext in image_extensions:
                try:
                    from ocr_service import ocr_recognize_image
                    import json
                    logger.info(f"[Knowledge] 对图片执行 OCR: {file_path}")
                    ocr_result = ocr_recognize_image(file_path)
                    if ocr_result and ocr_result.get('success'):
                        ocr_text = ocr_result.get('text', '')
                        # 保存完整的 blocks 信息（包含边界框和识别率）
                        if ocr_result.get('blocks'):
                            ocr_blocks = json.dumps(
                                ocr_result.get('blocks'), ensure_ascii=False)
                        logger.info(
                            f"[Knowledge] OCR 识别成功，文字长度: {len(ocr_text)}, blocks: {len(ocr_result.get('blocks', []))}")
                except Exception as ocr_error:
                    logger.warning(f"[Knowledge] OCR 识别失败: {ocr_error}")

            # 处理文档
            processor = DocumentProcessor()
            documents = processor.process_file(file_path)

            # 如果是图片且没有文档内容，但有 OCR 结果，使用 OCR 内容
            if not documents and ocr_text:
                from rag.document_processor import DocumentChunk
                documents = [DocumentChunk(
                    content=ocr_text,
                    metadata={
                        'source': os.path.basename(file_path),
                        'file_type': 'image',
                        'ocr': True
                    }
                )]
                logger.info(f"[Knowledge] 使用 OCR 内容作为文档")

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

            # 使用原始文件名（如果提供），否则使用文件路径中的文件名
            file_name = original_file_name or os.path.basename(file_path)

            return {
                "type": "knowledge_add_document_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "document": {
                    "id": str(uuid.uuid4()),
                    "knowledgeId": knowledge_id,
                    "fileName": file_name,
                    "filePath": file_path,
                    "fileType": file_ext,
                    "fileSize": os.path.getsize(file_path),
                    "chunkCount": count,
                    "ocrText": ocr_text,
                    "ocrBlocks": ocr_blocks,
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

    # ==================== Memory 记忆相关消息处理 ====================

    async def _handle_memory_generate_summary(self, message: dict) -> dict:
        """
        处理摘要生成请求

        从对话消息中生成摘要，用于多轮对话状态管理。
        """
        conversation_id = message.get("conversationId")
        messages = message.get("messages", [])
        model_id = message.get("modelId")

        if not conversation_id or not messages:
            return {
                "type": "memory_generate_summary_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少 conversationId 或 messages",
            }

        try:
            from memory_service import memory_service

            # 生成摘要
            result = await memory_service.generate_summary(messages, model_id)

            if not result:
                return {
                    "type": "memory_generate_summary_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": "摘要生成失败",
                }

            logger.info(f"[Memory] 生成摘要成功: conversation_id={conversation_id}")

            return {
                "type": "memory_generate_summary_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "conversationId": conversation_id,
                "summary": result.get("summary", ""),
                "keyTopics": result.get("key_topics", []),
                "pendingTasks": result.get("pending_tasks", []),
            }

        except Exception as e:
            logger.error(f"生成摘要错误: {e}")
            return {
                "type": "memory_generate_summary_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_memory_extract(self, message: dict) -> dict:
        """
        处理记忆提取请求

        从对话中提取用户偏好、项目上下文、任务进度等信息。
        """
        conversation_id = message.get("conversationId")
        messages = message.get("messages", [])
        model_id = message.get("modelId")

        if not messages:
            return {
                "type": "memory_extract_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少 messages",
            }

        try:
            from memory_service import memory_service

            # 提取记忆
            result = await memory_service.extract_memory(messages, model_id)

            if not result:
                return {
                    "type": "memory_extract_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": True,
                    "memories": {},
                }

            logger.info(f"[Memory] 提取记忆成功: {list(result.keys())}")

            return {
                "type": "memory_extract_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "conversationId": conversation_id,
                "memories": result,
            }

        except Exception as e:
            logger.error(f"提取记忆错误: {e}")
            return {
                "type": "memory_extract_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    # ==================== Web Crawl 网页采集处理 ====================

    async def _handle_web_crawl(self, message: dict) -> dict:
        """
        处理网页采集请求

        抓取网页内容并添加到知识库。
        """
        url = message.get("url")
        knowledge_id = message.get("knowledgeId")
        title = message.get("title")
        chunk_size = message.get("chunkSize", 500)

        if not url:
            return {
                "type": "web_crawl_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少 URL",
            }

        if not knowledge_id:
            return {
                "type": "web_crawl_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少知识库 ID",
            }

        try:
            from agent.web_crawler import get_web_crawler

            logger.info(f"[WebCrawl] 开始采集: {url} -> {knowledge_id}")

            crawler = get_web_crawler()
            result = await crawler.crawl_and_store(
                url=url,
                knowledge_id=knowledge_id,
                title=title,
                chunk_size=chunk_size,
            )

            if result.get("success"):
                logger.info(f"[WebCrawl] 采集成功: {result.get('title')}")
                return {
                    "type": "web_crawl_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": True,
                    "url": result.get("url"),
                    "title": result.get("title"),
                    "chunks": result.get("chunks"),
                    "knowledgeId": result.get("knowledge_id"),
                    "documentCount": result.get("document_count"),
                }
            else:
                return {
                    "type": "web_crawl_response",
                    "id": message.get("id"),
                    "timestamp": int(time.time() * 1000),
                    "success": False,
                    "error": result.get("error", "采集失败"),
                }

        except Exception as e:
            logger.error(f"[WebCrawl] 采集错误: {e}")
            return {
                "type": "web_crawl_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    async def _handle_web_fetch(self, message: dict) -> dict:
        """
        处理网页内容获取请求

        仅获取网页内容，不入库。
        """
        url = message.get("url")
        max_length = message.get("maxLength", 5000)

        if not url:
            return {
                "type": "web_fetch_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": "缺少 URL",
            }

        try:
            from agent.web_crawler import get_web_crawler

            logger.info(f"[WebFetch] 获取内容: {url}")

            crawler = get_web_crawler()
            crawler._max_length = max_length

            content = await crawler.fetch(url)

            logger.info(f"[WebFetch] 获取成功: {content.title}")

            return {
                "type": "web_fetch_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": True,
                "url": content.url,
                "title": content.title,
                "content": content.content,
            }

        except Exception as e:
            logger.error(f"[WebFetch] 获取错误: {e}")
            return {
                "type": "web_fetch_response",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }

    # ==================== Ask 通用交互模块 ====================

    async def _handle_ask_response(self, message: dict) -> dict:
        """
        处理用户对 Ask 的响应

        用户响应通过 AskHandler 处理，设置到对应的询问会话中。
        后续处理通过上下文进行。
        """
        try:
            success = await self.ask_handler.handle_response(message)
            return {
                "type": "ask_response_ack",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": success,
                "askId": message.get("askId"),
            }
        except Exception as e:
            logger.error(f"[Ask] 处理响应错误: {e}")
            return {
                "type": "ask_response_ack",
                "id": message.get("id"),
                "timestamp": int(time.time() * 1000),
                "success": False,
                "error": str(e),
            }
