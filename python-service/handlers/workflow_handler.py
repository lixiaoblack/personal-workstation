"""
工作流聊天处理器

处理工作流模式的聊天消息，与 Agent 聊天逻辑隔离。
通过 WorkflowExecutor 执行工作流节点，支持流式输出。

架构：
┌──────────────────────────────────────────────────────────────┐
│                      WorkflowHandler                          │
├──────────────────────────────────────────────────────────────┤
│  消息类型处理：                                                │
│  - workflow_chat: 工作流模式聊天                               │
├──────────────────────────────────────────────────────────────┤
│  内部流程：                                                    │
│  1. 加载工作流定义                                            │
│  2. 设置初始变量（用户输入）                                   │
│  3. 执行 WorkflowExecutor                                     │
│  4. 流式发送节点状态和 LLM 输出                                │
└──────────────────────────────────────────────────────────────┘
"""
import time
import logging
import asyncio
import json
from typing import Any, Dict, Optional, Callable, Awaitable

from .base_handler import BaseHandler

logger = logging.getLogger(__name__)


class WorkflowHandler(BaseHandler):
    """
    工作流聊天处理器

    处理 workflow_chat 消息类型，执行工作流并流式返回结果。

    与 AgentHandler 的区别：
    - AgentHandler: 使用 DeepAgent/ReActAgent 执行，支持工具调用
    - WorkflowHandler: 使用 WorkflowExecutor 执行，按节点定义顺序执行
    """

    def __init__(self, send_callback: Optional[Callable[[dict], Awaitable[None]]] = None):
        super().__init__(send_callback)

    async def handle(self, message: dict) -> Optional[dict]:
        """处理工作流消息"""
        msg_type = message.get("type")

        if msg_type == "workflow_chat":
            return await self._handle_workflow_chat(message)
        else:
            return self.error_response(f"未知的工作流消息类型: {msg_type}", message.get("id"))

    async def _handle_workflow_chat(self, message: dict) -> Optional[dict]:
        """
        处理工作流聊天消息

        执行流程：
        1. 提取工作流 ID 和用户输入
        2. 加载工作流定义
        3. 创建执行上下文
        4. 执行工作流节点
        5. 流式发送节点状态和 LLM 输出

        Args:
            message: WebSocket 消息

        Returns:
            执行结果或 None（流式消息通过 send_callback 发送）
        """
        workflow_id = message.get("workflowId")
        content = message.get("content", "")
        conversation_id = message.get("conversationId", "")
        incoming_history = message.get("history", [])  # 历史消息
        initial_variables = message.get("variables", {})  # 初始变量
        msg_id = message.get("id")

        logger.info(
            f"[Workflow] 收到消息: workflow_id={workflow_id}, content={content[:50]}...")

        if not workflow_id:
            return self.error_response("缺少工作流 ID", msg_id)

        try:
            from workflow import get_executor, WorkflowContext, NodeStatus

            # 获取执行器
            executor = get_executor()

            # 发送流式开始消息
            if self.send_callback:
                await self.send_callback({
                    "type": "workflow_stream_start",
                    "id": msg_id,
                    "timestamp": int(time.time() * 1000),
                    "workflowId": workflow_id,
                    "conversationId": conversation_id,
                })

            # 创建执行上下文，设置初始变量
            import uuid
            context = WorkflowContext(
                workflow_id=workflow_id,
                execution_id=f"wf_{uuid.uuid4().hex[:12]}",
                variables={
                    "input": content,  # 用户输入
                    "history": incoming_history,  # 历史消息
                    **initial_variables,  # 额外变量
                }
            )

            # 设置节点完成回调，用于流式发送状态
            async def on_node_complete(node_id: str, result):
                """节点完成时发送状态消息"""
                if self.send_callback:
                    await self.send_callback({
                        "type": "workflow_node_status",
                        "id": f"{msg_id}_node_{node_id}",
                        "timestamp": int(time.time() * 1000),
                        "workflowId": workflow_id,
                        "conversationId": conversation_id,
                        "nodeId": node_id,
                        "nodeType": result.output.get("node_type") if isinstance(result.output, dict) else None,
                        "status": result.status.value,
                        "output": result.output if result.status == NodeStatus.COMPLETED else None,
                        "error": result.error,
                    })

            # 设置流式输出回调（用于 LLM 节点）
            async def on_stream_chunk(node_id: str, chunk: str, full_content: str):
                """LLM 节点流式输出"""
                if self.send_callback:
                    await self.send_callback({
                        "type": "workflow_stream_chunk",
                        "id": f"{msg_id}_chunk",
                        "timestamp": int(time.time() * 1000),
                        "workflowId": workflow_id,
                        "conversationId": conversation_id,
                        "nodeId": node_id,
                        "content": chunk,
                        "fullContent": full_content,
                    })

            context.on_node_complete = on_node_complete

            # 执行工作流（使用支持流式的执行方法）
            result = await self._execute_workflow_with_streaming(
                executor=executor,
                workflow_id=workflow_id,
                context=context,
                on_stream_chunk=on_stream_chunk,
            )

            if result.get("success"):
                # 发送流式结束消息
                if self.send_callback:
                    # 获取最终输出（从 end 节点或最后一个节点）
                    final_output = self._extract_final_output(context)

                    await self.send_callback({
                        "type": "workflow_stream_end",
                        "id": f"{msg_id}_end",
                        "timestamp": int(time.time() * 1000),
                        "workflowId": workflow_id,
                        "conversationId": conversation_id,
                        "fullContent": final_output,
                        "variables": context.variables,
                        "nodeResults": {
                            node_id: {
                                "status": r.status.value,
                                "output": r.output
                            }
                            for node_id, r in context.node_results.items()
                        }
                    })

                return {"completed": True}
            else:
                # 执行失败
                if self.send_callback:
                    await self.send_callback({
                        "type": "workflow_error",
                        "id": f"{msg_id}_error",
                        "timestamp": int(time.time() * 1000),
                        "workflowId": workflow_id,
                        "conversationId": conversation_id,
                        "error": result.get("error", "工作流执行失败"),
                        "nodeId": result.get("node_id"),
                    })

                return None

        except ImportError as e:
            logger.error(f"[Workflow] 导入模块失败: {e}")
            return self.error_response(f"工作流模块不可用: {str(e)}", msg_id)
        except Exception as e:
            import traceback
            logger.error(f"[Workflow] 执行错误: {e}")
            logger.error(f"[Workflow] 错误堆栈: {traceback.format_exc()}")

            if self.send_callback:
                await self.send_callback({
                    "type": "workflow_error",
                    "id": f"{msg_id}_error",
                    "timestamp": int(time.time() * 1000),
                    "workflowId": workflow_id,
                    "conversationId": conversation_id,
                    "error": str(e),
                })

            return None

    async def _execute_workflow_with_streaming(
        self,
        executor,
        workflow_id: str,
        context: "WorkflowContext",
        on_stream_chunk: Callable,
    ) -> Dict[str, Any]:
        """
        执行工作流，支持 LLM 节点流式输出

        Args:
            executor: WorkflowExecutor 实例
            workflow_id: 工作流 ID
            context: 执行上下文
            on_stream_chunk: 流式输出回调

        Returns:
            执行结果
        """
        from workflow import NodeStatus, NodeType

        # 加载工作流定义
        workflow = executor._load_workflow(workflow_id)
        if not workflow:
            return {"success": False, "error": "工作流不存在"}

        # 解析节点和边
        nodes = {node["id"]: node for node in json.loads(
            workflow.get("nodes", "[]"))}
        edges = json.loads(workflow.get("edges", "[]"))

        # 构建邻接表
        adjacency = executor._build_adjacency(nodes, edges)

        # 找到开始节点
        start_node = executor._find_start_node(nodes)
        if not start_node:
            return {"success": False, "error": "找不到开始节点"}

        # 拓扑排序
        execution_order = executor._topological_sort(nodes, adjacency)

        # 执行节点
        try:
            for node_id in execution_order:
                node = nodes.get(node_id)
                if not node:
                    continue

                context.current_node_id = node_id

                # 检查节点是否已完成（恢复执行场景）
                if node_id in context.node_results:
                    result = context.node_results[node_id]
                    if result.status == NodeStatus.COMPLETED:
                        continue

                # 执行节点（LLM 节点支持流式）
                node_type = node.get("type")

                if node_type == NodeType.LLM:
                    # LLM 节点：使用流式执行
                    result = await self._execute_llm_node_with_streaming(
                        executor=executor,
                        node=node,
                        context=context,
                        on_stream_chunk=on_stream_chunk,
                    )
                else:
                    # 其他节点：正常执行
                    result = await executor._execute_node(node, context)

                context.node_results[node_id] = result

                # 回调通知
                if context.on_node_complete:
                    await context.on_node_complete(node_id, result)

                # 检查执行状态
                if result.status == NodeStatus.FAILED:
                    context.status = "failed"
                    return {
                        "success": False,
                        "error": result.error,
                        "node_id": node_id,
                        "execution_id": context.execution_id
                    }

                # 等待用户交互
                if result.status == NodeStatus.WAITING:
                    context.status = "waiting"
                    return {
                        "success": False,
                        "status": "waiting",
                        "waiting_for": node["type"],
                        "node_id": node_id,
                        "execution_id": context.execution_id,
                    }

                # 条件分支：决定下一个节点
                if node_type == NodeType.CONDITION:
                    next_node_id = executor._evaluate_condition(node, context)
                    if next_node_id:
                        execution_order = executor._filter_execution_order(
                            execution_order, node_id, next_node_id, adjacency
                        )

        except Exception as e:
            context.status = "failed"
            return {
                "success": False,
                "error": str(e),
                "execution_id": context.execution_id
            }

        context.status = "completed"
        return {
            "success": True,
            "execution_id": context.execution_id,
            "variables": context.variables,
            "node_results": {
                node_id: {
                    "status": result.status.value,
                    "output": result.output
                }
                for node_id, result in context.node_results.items()
            }
        }

    async def _execute_llm_node_with_streaming(
        self,
        executor,
        node: Dict[str, Any],
        context: "WorkflowContext",
        on_stream_chunk: Callable,
    ) -> "NodeResult":
        """
        执行 LLM 节点，支持流式输出

        Args:
            executor: WorkflowExecutor 实例
            node: 节点定义
            context: 执行上下文
            on_stream_chunk: 流式输出回调

        Returns:
            节点执行结果
        """
        from workflow import NodeStatus, NodeResult
        from datetime import datetime

        node_id = node["id"]
        node_data = node.get("data", {})

        result = NodeResult(
            node_id=node_id,
            status=NodeStatus.RUNNING,
            started_at=datetime.now()
        )

        try:
            from model_router import model_router

            model_id = node_data.get("model")
            prompt_template = node_data.get("prompt", "")
            system_prompt = node_data.get(
                "systemPrompt") or "你是一个有帮助的助手，请用中文回复用户的问题。"
            temperature = node_data.get("temperature", 0.7)
            max_tokens = node_data.get("maxTokens", 2048)

            # 渲染提示词模板
            prompt = executor._render_template(
                prompt_template, context.variables)

            # 获取模型配置
            config = model_router.get_config(
                int(model_id)) if model_id else None
            if config:
                config.temperature = temperature
                config.max_tokens = max_tokens

            # 构建消息列表
            messages = []
            messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            # 流式调用 LLM
            full_content = ""
            chunk_count = 0

            async for chunk in model_router.chat_stream_async(
                messages=messages,
                model_id=int(model_id) if model_id else None
            ):
                chunk_count += 1
                full_content += chunk

                # 发送流式块
                if on_stream_chunk:
                    await on_stream_chunk(node_id, chunk, full_content)

            # 保存输出到变量
            output_var = node_data.get("outputVariable", "llm_output")
            context.variables[output_var] = full_content

            result.output = {"content": full_content}
            result.status = NodeStatus.COMPLETED

            logger.info(
                f"[Workflow] LLM 节点 {node_id} 执行完成，输出长度: {len(full_content)}")

        except Exception as e:
            result.status = NodeStatus.FAILED
            result.error = str(e)
            logger.error(f"[Workflow] LLM 节点 {node_id} 执行失败: {e}")

        result.completed_at = datetime.now()
        return result

    def _extract_final_output(self, context: "WorkflowContext") -> str:
        """
        从执行上下文中提取最终输出

        优先从 end 节点的输出中获取，否则从最后一个 LLM 节点获取。

        Args:
            context: 执行上下文

        Returns:
            最终输出文本
        """
        from workflow import NodeType

        # 遍历节点结果，找到 end 节点或最后一个 LLM 节点
        end_output = None
        last_llm_output = None

        for node_id, result in context.node_results.items():
            output = result.output
            if isinstance(output, dict):
                # 检查是否是 end 节点
                if result.output.get("message") == "工作流结束":
                    end_output = result.output.get(
                        "variables", {}).get("output", "")
                # 检查是否是 LLM 输出
                if "content" in output:
                    last_llm_output = output["content"]

        # 优先返回 end 节点的输出
        if end_output:
            return str(end_output)

        # 否则返回最后一个 LLM 输出
        if last_llm_output:
            return last_llm_output

        return "工作流执行完成"
