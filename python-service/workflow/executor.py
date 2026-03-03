"""
工作流执行引擎

负责解析和执行工作流定义，支持条件分支、循环和交互节点。
"""

import asyncio
import json
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

from api.database import get_db


class NodeType(str, Enum):
    """节点类型"""
    START = "start"
    END = "end"
    LLM = "llm"
    TOOL = "tool"
    KNOWLEDGE = "knowledge"
    CONDITION = "condition"
    LOOP = "loop"
    FILE_SELECT = "file_select"
    USER_INPUT = "user_input"
    HUMAN_REVIEW = "human_review"
    MESSAGE = "message"
    WEBHOOK = "webhook"


class NodeStatus(str, Enum):
    """节点执行状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING = "waiting"  # 等待用户交互
    SKIPPED = "skipped"


@dataclass
class NodeResult:
    """节点执行结果"""
    node_id: str
    status: NodeStatus
    output: Any = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class WorkflowContext:
    """工作流执行上下文"""
    workflow_id: str
    execution_id: str
    variables: Dict[str, Any] = field(default_factory=dict)
    node_results: Dict[str, NodeResult] = field(default_factory=dict)
    current_node_id: Optional[str] = None
    status: str = "running"
    created_at: datetime = field(default_factory=datetime.now)

    # 交互回调
    on_file_select: Optional[Callable] = None
    on_user_input: Optional[Callable] = None
    on_human_review: Optional[Callable] = None
    on_message: Optional[Callable] = None
    on_node_complete: Optional[Callable] = None


class WorkflowExecutor:
    """
    工作流执行器

    负责解析工作流定义并按拓扑顺序执行节点。
    """

    def __init__(self):
        self.llm_client = None  # 延迟初始化
        self.tool_registry = {}  # 工具注册表

    async def execute_node(
        self,
        workflow_id: str,
        node_id: str,
        input_variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        单节点测试执行

        用于调试单个节点，不依赖工作流上下游。

        Args:
            workflow_id: 工作流 ID
            node_id: 要测试的节点 ID
            input_variables: 测试输入变量

        Returns:
            节点执行结果
        """
        # 加载工作流定义
        workflow = self._load_workflow(workflow_id)
        if not workflow:
            return {"success": False, "error": "工作流不存在"}

        # 解析节点
        nodes = {node["id"]: node for node in json.loads(
            workflow.get("nodes", "[]"))}

        node = nodes.get(node_id)
        if not node:
            return {"success": False, "error": "节点不存在"}

        node_type = node.get("type")

        # 某些节点不支持单节点测试
        if node_type in ["end", "answer"]:
            return {"success": False, "error": f"{node_type} 节点不支持单节点测试"}

        # 创建测试上下文
        import uuid
        context = WorkflowContext(
            workflow_id=workflow_id,
            execution_id=f"test_{uuid.uuid4().hex[:8]}",
            variables=input_variables or {}
        )

        # 执行节点
        start_time = datetime.now()
        try:
            result = await self._execute_node(node, context)
            execution_time = (datetime.now() - start_time).total_seconds()

            return {
                "success": True,
                "node_id": node_id,
                "node_type": node_type,
                "status": result.status.value,
                "output": result.output,
                "variables": context.variables,
                "error": result.error,
                "execution_time": execution_time,
                "started_at": start_time.isoformat(),
                "completed_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "node_id": node_id,
                "error": str(e),
                "execution_time": (datetime.now() - start_time).total_seconds()
            }

    async def execute_from_node(
        self,
        workflow_id: str,
        start_node_id: str,
        initial_variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        从指定节点开始执行

        用于从某个中间节点开始测试后续流程。

        Args:
            workflow_id: 工作流 ID
            start_node_id: 起始节点 ID
            initial_variables: 初始变量（模拟上游节点输出）

        Returns:
            执行结果
        """
        # 加载工作流定义
        workflow = self._load_workflow(workflow_id)
        if not workflow:
            return {"success": False, "error": "工作流不存在"}

        # 创建上下文
        import uuid
        context = WorkflowContext(
            workflow_id=workflow_id,
            execution_id=f"exec_{uuid.uuid4().hex[:12]}",
            variables=initial_variables or {}
        )

        # 解析节点和边
        nodes = {node["id"]: node for node in json.loads(
            workflow.get("nodes", "[]"))}
        edges = json.loads(workflow.get("edges", "[]"))

        # 构建邻接表
        adjacency = self._build_adjacency(nodes, edges)

        # 从指定节点开始计算可达节点
        reachable = self._get_reachable_nodes(start_node_id, adjacency)

        # 拓扑排序（只排序可达节点）
        execution_order = self._topological_sort_subset(
            nodes, adjacency, reachable)

        # 执行节点
        try:
            for node_id in execution_order:
                node = nodes.get(node_id)
                if not node:
                    continue

                context.current_node_id = node_id

                # 执行节点
                result = await self._execute_node(node, context)
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
                        "execution_id": context.execution_id,
                        "node_results": {
                            nid: {"status": r.status.value, "output": r.output}
                            for nid, r in context.node_results.items()
                        }
                    }

                # 等待用户交互
                if result.status == NodeStatus.WAITING:
                    context.status = "waiting"
                    return {
                        "success": False,
                        "status": "waiting",
                        "waiting_for": node["type"],
                        "node_id": node_id,
                        "execution_id": context.execution_id
                    }

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

    async def execute(
        self,
        workflow_id: str,
        initial_input: Dict[str, Any] = None,
        context: WorkflowContext = None
    ) -> Dict[str, Any]:
        """
        执行工作流

        Args:
            workflow_id: 工作流 ID
            initial_input: 初始输入数据
            context: 执行上下文（用于恢复执行）

        Returns:
            执行结果
        """
        # 加载工作流定义
        workflow = self._load_workflow(workflow_id)
        if not workflow:
            return {"success": False, "error": "工作流不存在"}

        # 创建执行上下文
        if context is None:
            import uuid
            context = WorkflowContext(
                workflow_id=workflow_id,
                execution_id=f"exec_{uuid.uuid4().hex[:12]}",
                variables={"input": initial_input or {}}
            )

        # 解析节点和边
        nodes = {node["id"]: node for node in json.loads(
            workflow.get("nodes", "[]"))}
        edges = json.loads(workflow.get("edges", "[]"))

        # 构建邻接表
        adjacency = self._build_adjacency(nodes, edges)

        # 找到开始节点
        start_node = self._find_start_node(nodes)
        if not start_node:
            return {"success": False, "error": "找不到开始节点"}

        # 拓扑排序
        execution_order = self._topological_sort(nodes, adjacency)

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

                # 执行节点
                result = await self._execute_node(node, context)
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
                        "context": self._serialize_context(context)
                    }

                # 条件分支：决定下一个节点
                if node["type"] == NodeType.CONDITION:
                    next_node_id = self._evaluate_condition(node, context)
                    if next_node_id:
                        # 跳过不在分支路径上的节点
                        execution_order = self._filter_execution_order(
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

    async def _execute_node(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> NodeResult:
        """
        执行单个节点
        """
        node_id = node["id"]
        node_type = node.get("type")
        node_data = node.get("data", {})

        result = NodeResult(
            node_id=node_id,
            status=NodeStatus.RUNNING,
            started_at=datetime.now()
        )

        try:
            handler = getattr(self, f"_handle_{node_type}_node", None)
            if handler:
                output = await handler(node_data, context)
                result.output = output
                result.status = NodeStatus.COMPLETED
            else:
                result.status = NodeStatus.FAILED
                result.error = f"未知节点类型: {node_type}"

        except Exception as e:
            result.status = NodeStatus.FAILED
            result.error = str(e)

        result.completed_at = datetime.now()
        return result

    async def _handle_start_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """开始节点：初始化变量"""
        return {"message": "工作流开始"}

    async def _handle_end_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """结束节点：返回结果"""
        return {"message": "工作流结束", "variables": context.variables}

    async def _handle_llm_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        LLM 节点：调用大语言模型

        配置项：
        - model: 模型 ID 或名称
        - prompt: 提示词模板
        - systemPrompt: 系统提示词（可选）
        - temperature: 温度参数
        - maxTokens: 最大 token 数
        """
        from model_router import model_router

        model_id = data.get("model")
        prompt_template = data.get("prompt", "")
        # 默认使用中文回复的系统提示词
        system_prompt = data.get("systemPrompt") or "你是一个有帮助的助手，请用中文回复用户的问题。"
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("maxTokens", 2048)

        # 渲染提示词模板
        prompt = self._render_template(prompt_template, context.variables)

        # 获取模型配置
        config = model_router.get_config(int(model_id)) if model_id else None
        if config:
            # 覆盖温度和最大 tokens
            config.temperature = temperature
            config.max_tokens = max_tokens

        # 构建消息列表
        messages = []

        # 添加系统提示词
        messages.append({"role": "system", "content": system_prompt})

        # 添加用户消息
        messages.append({"role": "user", "content": prompt})

        # 调用 LLM
        response = await model_router.chat_async(
            messages=messages,
            model_id=int(model_id) if model_id else None
        )

        # 保存输出到变量
        output_var = data.get("outputVariable", "llm_output")
        context.variables[output_var] = response

        return {"content": response}

    async def _handle_tool_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        工具节点：调用工具

        配置项：
        - toolName: 工具名称
        - params: 工具参数
        """
        tool_name = data.get("toolName")
        params_template = data.get("params", {})

        # 渲染参数模板
        params = self._render_template(params_template, context.variables)

        # 获取工具
        tool = self.tool_registry.get(tool_name)
        if not tool:
            raise ValueError(f"工具未注册: {tool_name}")

        # 执行工具
        result = await tool.execute(**params) if asyncio.iscoroutinefunction(tool.execute) else tool.execute(**params)

        # 保存输出
        output_var = data.get("outputVariable", f"tool_{tool_name}_output")
        context.variables[output_var] = result

        return result

    async def _handle_knowledge_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        知识检索节点

        配置项：
        - knowledgeId: 知识库 ID
        - query: 查询文本（支持模板）
        - topK: 返回条数
        - scoreThreshold: 相似度阈值
        """
        from rag.retriever import KnowledgeRetriever
        from rag.vectorstore import get_vectorstore
        from rag.embeddings import get_embedding_service

        knowledge_id = data.get("knowledgeId")
        query_template = data.get("query", "${input}")
        top_k = data.get("topK", 5)
        score_threshold = data.get("scoreThreshold", 0.5)

        # 渲染查询
        query = self._render_template(query_template, context.variables)

        # 初始化检索器
        vectorstore = get_vectorstore()
        embedding_service = get_embedding_service()
        retriever = KnowledgeRetriever(vectorstore, embedding_service)

        # 检索知识库
        results = await retriever.retrieve(
            knowledge_id=knowledge_id,
            query=query,
            top_k=top_k,
            method="hybrid",
        )

        # 转换结果格式
        formatted_results = [
            {
                "content": r.content,
                "score": r.score,
                "metadata": r.metadata,
                "retrieval_method": r.retrieval_method,
            }
            for r in results
        ]

        # 保存输出
        output_var = data.get("outputVariable", "knowledge_results")
        context.variables[output_var] = formatted_results

        return {"results": formatted_results, "query": query}

    async def _handle_condition_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        条件分支节点

        配置项：
        - expression: 条件表达式
        """
        expression = data.get("expression", "")

        # 评估条件
        result = self._evaluate_expression(expression, context.variables)

        return {"condition_result": result}

    async def _handle_loop_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        循环节点

        配置项：
        - iterations: 循环次数
        - condition: 退出条件（可选）
        """
        # 循环逻辑在 execute 方法中处理
        iterations = data.get("iterations", 1)
        condition = data.get("condition")

        return {"iterations": iterations, "condition": condition}

    async def _handle_file_select_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        文件选择节点（Electron 客户端）

        配置项：
        - multiple: 是否多选
        - accept: 文件类型过滤
        - maxSize: 最大文件大小(MB)
        """
        # 返回等待状态，由前端处理文件选择
        context.variables["_waiting_file_select"] = {
            "multiple": data.get("multiple", False),
            "accept": data.get("accept", ""),
            "maxSize": data.get("maxSize", 10)
        }

        # 触发回调
        if context.on_file_select:
            await context.on_file_select(context, data)

        raise NodeWaitingException("等待用户选择文件")

    async def _handle_user_input_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        用户输入节点

        配置项：
        - inputType: 输入类型 (text/select/multiselect)
        - label: 标签
        - options: 选项（逗号分隔）
        - required: 是否必填
        """
        context.variables["_waiting_user_input"] = {
            "inputType": data.get("inputType", "text"),
            "label": data.get("label", "请输入"),
            "options": data.get("options", "").split(",") if data.get("options") else [],
            "required": data.get("required", True)
        }

        if context.on_user_input:
            await context.on_user_input(context, data)

        raise NodeWaitingException("等待用户输入")

    async def _handle_human_review_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        人工审核节点

        配置项：
        - message: 提示信息
        - timeout: 超时时间（分钟）
        """
        context.variables["_waiting_human_review"] = {
            "message": data.get("message", "请审核以下内容..."),
            "timeout": data.get("timeout", 60)
        }

        if context.on_human_review:
            await context.on_human_review(context, data)

        raise NodeWaitingException("等待人工审核")

    async def _handle_message_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        消息输出节点

        配置项：
        - content: 消息内容（支持模板）
        """
        content_template = data.get("content", "")
        content = self._render_template(content_template, context.variables)

        if context.on_message:
            await context.on_message(context, content)

        return {"content": content}

    async def _handle_webhook_node(
        self,
        data: Dict[str, Any],
        context: WorkflowContext
    ) -> Any:
        """
        Webhook 触发节点

        配置项：
        - url: Webhook URL
        - method: 请求方法
        - headers: 请求头
        """
        import aiohttp

        url = data.get("url")
        method = data.get("method", "POST")
        headers = data.get("headers", {})

        # 渲染 URL 和 headers
        url = self._render_template(url, context.variables)
        headers = self._render_template(headers, context.variables)

        async with aiohttp.ClientSession() as session:
            async with session.request(
                method=method,
                url=url,
                headers=headers,
                json=context.variables.get("input", {})
            ) as response:
                result = await response.json()

        output_var = data.get("outputVariable", "webhook_response")
        context.variables[output_var] = result

        return {"status": response.status, "response": result}

    def _load_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """从数据库加载工作流"""
        with get_db() as conn:
            cursor = conn.execute(
                "SELECT * FROM workflows WHERE id = ?",
                (workflow_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    def _build_adjacency(
        self,
        nodes: Dict[str, Any],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        """构建邻接表"""
        adjacency = {node_id: [] for node_id in nodes}
        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            if source and target:
                adjacency.setdefault(source, []).append(target)
        return adjacency

    def _find_start_node(self, nodes: Dict[str, Any]) -> Optional[str]:
        """找到开始节点"""
        for node_id, node in nodes.items():
            if node.get("type") == NodeType.START:
                return node_id
        return None

    def _topological_sort(
        self,
        nodes: Dict[str, Any],
        adjacency: Dict[str, List[str]]
    ) -> List[str]:
        """拓扑排序"""
        in_degree = {node_id: 0 for node_id in nodes}
        for source, targets in adjacency.items():
            for target in targets:
                in_degree[target] = in_degree.get(target, 0) + 1

        # 从入度为 0 的节点开始
        queue = [node_id for node_id, degree in in_degree.items()
                 if degree == 0]
        result = []

        while queue:
            node_id = queue.pop(0)
            result.append(node_id)

            for target in adjacency.get(node_id, []):
                in_degree[target] -= 1
                if in_degree[target] == 0:
                    queue.append(target)

        return result

    def _get_reachable_nodes(
        self,
        start_node_id: str,
        adjacency: Dict[str, List[str]]
    ) -> set:
        """获取从指定节点可达的所有节点"""
        reachable = set()
        queue = [start_node_id]

        while queue:
            node_id = queue.pop(0)
            if node_id in reachable:
                continue
            reachable.add(node_id)
            queue.extend(adjacency.get(node_id, []))

        return reachable

    def _topological_sort_subset(
        self,
        nodes: Dict[str, Any],
        adjacency: Dict[str, List[str]],
        reachable: set
    ) -> List[str]:
        """对可达节点子集进行拓扑排序"""
        # 只考虑可达节点
        filtered_nodes = {nid: nodes[nid] for nid in reachable if nid in nodes}

        # 计算入度（只考虑可达节点之间的边）
        in_degree = {node_id: 0 for node_id in filtered_nodes}
        for source, targets in adjacency.items():
            if source in reachable:
                for target in targets:
                    if target in reachable:
                        in_degree[target] = in_degree.get(target, 0) + 1

        # 从入度为 0 的节点开始
        queue = [node_id for node_id, degree in in_degree.items()
                 if degree == 0]
        result = []

        while queue:
            node_id = queue.pop(0)
            result.append(node_id)

            for target in adjacency.get(node_id, []):
                if target in reachable:
                    in_degree[target] -= 1
                    if in_degree[target] == 0:
                        queue.append(target)

        return result

    def _evaluate_condition(
        self,
        node: Dict[str, Any],
        context: WorkflowContext
    ) -> Optional[str]:
        """评估条件分支，返回下一个节点 ID"""
        expression = node.get("data", {}).get("expression", "")
        result = self._evaluate_expression(expression, context.variables)

        # 根据条件结果选择分支
        # 节点的 data.branches 中存储条件到节点 ID 的映射
        branches = node.get("data", {}).get("branches", {})

        if result and "true" in branches:
            return branches["true"]
        elif not result and "false" in branches:
            return branches["false"]

        return None

    def _evaluate_expression(self, expression: str, variables: Dict[str, Any]) -> Any:
        """评估表达式"""
        # 简单的表达式评估
        # 支持: ${var} > 10, ${var} == "value", ${var} contains "text"

        # 替换变量
        expr = self._render_template(expression, variables)

        # 安全评估
        try:
            # 只允许简单的比较和逻辑运算
            allowed_chars = set("0123456789.+-*/%<>=!&|()[]\"' ")
            if all(c in allowed_chars or c.isalpha() for c in expr):
                return eval(expr)
        except:
            pass

        return False

    def _render_template(self, template: Any, variables: Dict[str, Any]) -> Any:
        """渲染模板，替换 ${var} 变量"""
        if isinstance(template, str):
            import re

            def replace_var(match):
                var_name = match.group(1)
                # 支持嵌套属性访问: ${input.name}
                keys = var_name.split(".")
                value = variables
                for key in keys:
                    if isinstance(value, dict):
                        value = value.get(key)
                    else:
                        return match.group(0)
                return str(value) if value is not None else ""

            return re.sub(r'\$\{([^}]+)\}', replace_var, template)
        elif isinstance(template, dict):
            return {k: self._render_template(v, variables) for k, v in template.items()}
        elif isinstance(template, list):
            return [self._render_template(item, variables) for item in template]
        return template

    def _filter_execution_order(
        self,
        order: List[str],
        current_node: str,
        target_node: str,
        adjacency: Dict[str, List[str]]
    ) -> List[str]:
        """过滤执行顺序，只保留从 target_node 可达的节点"""
        # 简化处理：从 target_node 开始重新计算可达节点
        reachable = set()
        queue = [target_node]

        while queue:
            node_id = queue.pop(0)
            if node_id in reachable:
                continue
            reachable.add(node_id)
            queue.extend(adjacency.get(node_id, []))

        # 过滤执行顺序
        current_index = order.index(current_node)
        return [n for n in order[current_index:] if n in reachable or n == current_node]

    def _serialize_context(self, context: WorkflowContext) -> Dict[str, Any]:
        """序列化上下文（用于持久化和恢复）"""
        return {
            "workflow_id": context.workflow_id,
            "execution_id": context.execution_id,
            "variables": context.variables,
            "node_results": {
                node_id: {
                    "status": result.status.value,
                    "output": result.output,
                    "error": result.error
                }
                for node_id, result in context.node_results.items()
            },
            "current_node_id": context.current_node_id,
            "status": context.status
        }


class NodeWaitingException(Exception):
    """节点等待异常"""
    pass


# 全局执行器实例
_executor: Optional[WorkflowExecutor] = None


def get_executor() -> WorkflowExecutor:
    """获取工作流执行器实例"""
    global _executor
    if _executor is None:
        _executor = WorkflowExecutor()
    return _executor
