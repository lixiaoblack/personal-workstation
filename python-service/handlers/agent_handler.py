"""
智能体/工作流处理器

处理 Agent 聊天和工作流相关的消息。
这是新增的处理器，专门用于智能体和工作流的逻辑处理，
不影响原有的聊天处理逻辑。

架构：
┌──────────────────────────────────────────────────────────────┐
│                      AgentHandler                              │
├──────────────────────────────────────────────────────────────┤
│  消息类型处理：                                                │
│  - agent_chat: Agent 模式聊天                                 │
│  - workflow_execute: 工作流执行（未来）                        │
├──────────────────────────────────────────────────────────────┤
│  内部流程：                                                    │
│  1. 解析消息参数（知识库、技能、智能体配置）                   │
│  2. 设置知识库上下文                                          │
│  3. 执行 Agent（Deep Agent 或 ReAct Agent）                  │
│  4. 流式发送响应                                              │
└──────────────────────────────────────────────────────────────┘
"""
import time
import logging
import asyncio
from typing import Any, Dict, Optional, Callable, Awaitable, List

from .base_handler import BaseHandler

logger = logging.getLogger(__name__)


class AgentHandler(BaseHandler):
    """
    智能体/工作流处理器

    处理以下消息类型：
    - agent_chat: Agent 模式聊天
    - workflow_execute: 工作流执行（未来扩展）

    Agent 模式使用 ReAct (Reasoning + Acting) 循环或 Deep Agents：
    1. 思考：分析用户问题，决定下一步行动
    2. 行动：调用工具或给出答案
    3. 观察：查看工具结果，继续思考

    Deep Agents 提供额外能力：
    - 任务规划与分解 (write_todos)
    - 上下文管理 (文件系统工具)
    - 子智能体生成 (task 工具)
    - 长期记忆 (Memory Store)
    """

    def __init__(self, send_callback: Optional[Callable[[dict], Awaitable[None]]] = None):
        super().__init__(send_callback)

    async def handle(self, message: dict) -> Optional[dict]:
        """处理智能体消息"""
        msg_type = message.get("type")

        if msg_type == "agent_chat":
            return await self._handle_agent_chat(message)
        else:
            return self.error_response(f"未知的智能体消息类型: {msg_type}", message.get("id"))

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

        # 智能体特有参数
        agent_id = message.get("agentId")  # 智能体 ID
        agent_config = message.get("agentConfig", {})  # 智能体配置

        # 如果有智能体配置，优先使用配置中的参数
        if agent_config:
            # 使用智能体的自定义系统提示词
            custom_system_prompt = agent_config.get("systemPrompt")
            # 使用智能体绑定的模型
            if agent_config.get("modelId"):
                model_id = agent_config.get("modelId")
            # 使用智能体绑定的知识库列表
            bound_knowledge_ids = agent_config.get("knowledgeIds", [])
            if bound_knowledge_ids:
                # 智能体绑定了知识库，使用绑定的知识库列表
                # 如果用户没有手动选择知识库，则使用智能体绑定的知识库
                if not knowledge_id:
                    knowledge_id = bound_knowledge_ids[0]
                # 传递完整的知识库列表，用于后续限制搜索范围
                logger.info(f"[Agent] 智能体绑定知识库: {bound_knowledge_ids}")
            # 使用智能体启用的工具列表
            enabled_tools = agent_config.get("tools", [])
            # 智能体温度参数
            agent_temperature = agent_config.get("temperature")
            # 智能体最大 token 数
            agent_max_tokens = agent_config.get("maxTokens")
        else:
            custom_system_prompt = None
            enabled_tools = []
            bound_knowledge_ids = []
            agent_temperature = None
            agent_max_tokens = None

        logger.info(f"[Agent] 收到消息: {content[:50]}...")
        logger.info(f"[Agent] 知识库元数据: {knowledge_metadata}")
        logger.info(f"[Agent] 使用 Deep Agent: {use_deep_agent}")
        logger.info(f"[Agent] 附件数量: {len(attachments)}")
        logger.info(f"[Agent] 智能体 ID: {agent_id}")
        if agent_config:
            logger.info(f"[Agent] 智能体配置: name={agent_config.get('name')}, "
                        f"custom_prompt={bool(custom_system_prompt)}, "
                        f"enabled_tools={enabled_tools}")
        if attachments:
            for att in attachments:
                logger.info(
                    f"[Agent] 附件: {att.get('name')} | 路径: {att.get('path')} | 类型: {att.get('type')}")

        try:
            from langchain_core.messages import HumanMessage
            from agent.knowledge_tool import KnowledgeRetrieverTool

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
            logger.info(
                f"[Agent] 准备调用 _run_deep_agent, use_deep_agent={use_deep_agent}")
            if use_deep_agent:
                try:
                    logger.info(f"[Agent] 开始调用 _run_deep_agent")
                    result = await self._run_deep_agent(
                        content=content,
                        conversation_id=conversation_id,
                        model_id=model_id,
                        incoming_history=incoming_history,
                        msg_id=msg_id,
                        attachments=attachments,
                        custom_system_prompt=custom_system_prompt,
                        enabled_tools=enabled_tools,
                        bound_knowledge_ids=bound_knowledge_ids,
                        agent_temperature=agent_temperature,
                        agent_max_tokens=agent_max_tokens,
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
        custom_system_prompt: Optional[str] = None,
        enabled_tools: list = [],
        bound_knowledge_ids: list = [],
        agent_temperature: Optional[float] = None,
        agent_max_tokens: Optional[int] = None,
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
            custom_system_prompt: 自定义系统提示词（智能体配置）
            enabled_tools: 启用的工具列表（智能体配置）
            bound_knowledge_ids: 绑定的知识库 ID 列表（智能体配置）
            agent_temperature: 温度参数（智能体配置）
            agent_max_tokens: 最大 token 数（智能体配置）

        Returns:
            执行结果，如果 Deep Agent 不可用返回 None
        """
        logger.info(f"[DeepAgent] 开始执行 _run_deep_agent")
        logger.info(
            f"[DeepAgent] bound_knowledge_ids={bound_knowledge_ids}, enabled_tools={enabled_tools}")

        try:
            from agent import DeepAgentWrapper, MessageSender, create_deep_agent
            from agent.tools import global_tool_registry
            from agent.knowledge_tool import KnowledgeRetrieverTool
            from langchain_core.messages import HumanMessage, AIMessage

            logger.info(f"[DeepAgent] 导入模块成功")

            # 创建消息发送器
            async def send_step_callback(step_data):
                if self.send_callback:
                    await self.send_callback(step_data)

            message_sender = MessageSender(send_callback=send_step_callback)

            # 获取工具列表（根据智能体配置过滤）
            all_tools = [
                global_tool_registry.get_tool(name)
                for name in global_tool_registry.list_tools()
                if global_tool_registry.get_tool(name)
            ]

            logger.info(f"[DeepAgent] 全部工具数量: {len(all_tools)}")

            # 如果智能体指定了启用工具列表，则只使用指定的工具
            if enabled_tools:
                tools = [t for t in all_tools if t.name in enabled_tools]
                logger.info(
                    f"[DeepAgent] 智能体启用工具过滤: {enabled_tools}, 过滤后工具数量: {len(tools)}")
                logger.info(f"[DeepAgent] 过滤后工具列表: {[t.name for t in tools]}")
            else:
                tools = all_tools
                logger.info(f"[DeepAgent] 未指定工具列表，使用全部 {len(tools)} 个工具")

            # 获取默认知识库（提前获取，用于注入检索结果）
            default_knowledge_id = KnowledgeRetrieverTool.get_default_knowledge()
            logger.info(f"[DeepAgent] 获取默认知识库: {default_knowledge_id}")

            # 创建 Deep Agent（传入自定义系统提示词）
            agent = create_deep_agent(
                model_id=model_id,
                tools=tools,
                system_prompt=custom_system_prompt,  # 使用智能体的自定义系统提示词
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
            logger.info(
                f"[DeepAgent] 获取知识库元数据: {list(knowledge_metadata.keys()) if knowledge_metadata else 'None'}")
            enhanced_content = content

            # 如果有附件，设置附件路径映射并构建附件上下文
            attachment_context = ""
            file_contents = ""  # 存储文件内容
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

                    # 🔴 新增：直接读取文件内容
                    try:
                        import os
                        if os.path.exists(att_path) and os.path.isfile(att_path):
                            # 检查文件大小，限制在 100KB 以内
                            if att_size > 100 * 1024:
                                file_contents += f"""\n[文件: {att_name}]
文件过大（{att_size / 1024:.1f}KB），请使用 file_read 工具读取。
"""
                            else:
                                with open(att_path, 'r', encoding='utf-8', errors='ignore') as f:
                                    content_text = f.read()
                                    file_contents += f"""\n[文件: {att_name} 内容]
{content_text}\n"""
                                logger.info(f"[DeepAgent] 已读取文件: {att_name}, 长度: {len(content_text)}")
                        else:
                            logger.warning(f"[DeepAgent] 文件不存在: {att_path}")
                    except Exception as e:
                        logger.error(f"[DeepAgent] 读取文件失败: {e}")
                        file_contents += f"""\n[文件: {att_name}]
读取失败: {str(e)}\n"""

                # 设置附件路径映射（用于修正 LLM 可能编造的路径）
                DeepAgentWrapper.set_attachment_paths(attachment_paths)

                # 🔴 修改：如果有文件内容，直接注入到消息中
                if file_contents:
                    attachment_context = f"""
[用户上传了以下文件，内容如下]
{file_contents}
"""
                else:
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

            # 知识库检索：只在智能体绑定了知识库时才进行检索
            # 如果 bound_knowledge_ids 有值，只搜索绑定的知识库
            knowledge_context = ""
            knowledge_search_result = None
            kb_names = []

            # 确定要搜索的知识库列表
            search_knowledge_ids = bound_knowledge_ids if bound_knowledge_ids else (
                [default_knowledge_id] if default_knowledge_id else [])

            if search_knowledge_ids and knowledge_metadata:
                logger.info(f"[DeepAgent] 将搜索以下知识库: {search_knowledge_ids}")

                try:
                    from agent.knowledge_tool import KnowledgeRetrieverTool
                    retriever = KnowledgeRetrieverTool()

                    # 遍历每个绑定的知识库进行检索
                    all_results = []
                    for kid in search_knowledge_ids:
                        kb_info = knowledge_metadata.get(kid, {})
                        kb_name = kb_info.get("name", "未知知识库")
                        kb_names.append(kb_name)

                        result = await retriever._call_async(
                            query=content,
                            knowledge_id=kid
                        )
                        if result and "未找到" not in result and "没有找到" not in result and "错误" not in result:
                            all_results.append(f"【{kb_name}】\n{result}")
                            logger.info(f"[DeepAgent] 知识库 {kb_name} 检索成功")
                        else:
                            logger.info(f"[DeepAgent] 知识库 {kb_name} 未找到相关内容")

                    if all_results:
                        knowledge_context = f"""以下是从绑定的知识库中检索到的相关内容：

{chr(10).join(all_results)}"""
                        logger.info(
                            f"[DeepAgent] 知识库检索成功，共 {len(all_results)} 个知识库有结果")
                except Exception as e:
                    logger.warning(f"[DeepAgent] 知识库检索失败: {e}")

            # 原有的条件判断改为使用 knowledge_context
            if knowledge_context:

                # 🎯 检测用户是否明确要求联网搜索
                web_search_keywords = ["联网搜索", "网上搜索", "网络搜索",
                                       "搜索一下", "搜一下", "查一下", "百度", "谷歌", "搜索看看"]
                user_wants_web_search = any(
                    kw in content.lower() for kw in web_search_keywords)

                # 🎯 检测用户是否需要执行操作（需要调用工具）
                # 操作型关键词：添加、创建、删除、修改、更新等
                operation_keywords = [
                    "添加到待办", "添加待办", "创建待办", "新建待办",
                    "添加任务", "创建任务", "新建任务",
                    "添加到知识库", "添加文档", "上传文档",
                    "删除", "修改", "更新", "编辑",
                    "发送", "回复", "转发",
                    "执行", "运行", "启动",
                    "设置", "配置",
                ]
                user_needs_operation = any(
                    kw in content for kw in operation_keywords)

                # 🎯 关键改进：如果知识库有检索结果，且用户未明确要求联网搜索，且不需要执行操作，直接用 LLM 回答
                # 如果用户需要执行操作（如添加待办），必须走 Agent 流程调用工具
                if knowledge_context and not attachment_context and not user_wants_web_search and not user_needs_operation:
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
                    from model_router import model_router
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
                    elif user_needs_operation:
                        # 用户需要执行操作，走 Agent 流程调用工具
                        enhanced_content = f"""{knowledge_context}

[用户问题]
{content}

[用户要求] 用户需要执行操作，请根据知识库内容调用相应的工具完成任务。"""
                        logger.info(f"[DeepAgent] 用户需要执行操作，走 Agent 流程调用工具")
                    else:
                        enhanced_content = f"""{knowledge_context}

[用户问题]
{content}"""
                else:
                    # 绑定了知识库但检索无结果
                    kb_names_str = "、".join(kb_names) if kb_names else "未知知识库"
                    enhanced_content = f"""[Context]
用户绑定的知识库: {kb_names_str}

[重要] 知识库自动检索未找到相关内容。你可以：
1. 根据你的知识回答，并告知用户知识库中暂无相关内容

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
                f"[DeepAgent] 开始执行，工具数量: {len(tools)}, 绑定知识库: {bound_knowledge_ids if bound_knowledge_ids else '无'}")

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

            # 清除附件标志
            DeepAgentWrapper.clear_attachment_flag()
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
