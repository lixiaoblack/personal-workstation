"""
工作流 API 路由

提供工作流的 CRUD 操作。
"""

import uuid
import json
import time
from typing import Optional

from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import WorkflowCreate, WorkflowUpdate

router = APIRouter(prefix="/api/workflows", tags=["工作流"])


@router.get("/list")
async def list_workflows(
    agent_id: Optional[str] = None,
    status: Optional[str] = None
):
    """
    获取工作流列表

    Args:
        agent_id: 可选，按智能体 ID 过滤
        status: 可选，按状态过滤

    Returns:
        工作流列表
    """
    with get_db() as conn:
        sql = """
            SELECT id, agent_id, name, description, nodes, edges, variables,
                   status, created_at, updated_at
            FROM workflows
            WHERE status != 'deleted'
        """
        params = []

        if agent_id:
            sql += " AND agent_id = ?"
            params.append(agent_id)
        if status:
            sql += " AND status = ?"
            params.append(status)

        sql += " ORDER BY updated_at DESC"

        cursor = conn.execute(sql, params)
        rows = cursor.fetchall()

        workflows = []
        for row in rows:
            workflow = dict(row)
            # 解析 JSON 字段
            workflow["nodes"] = json.loads(
                workflow["nodes"]) if workflow["nodes"] else []
            workflow["edges"] = json.loads(
                workflow["edges"]) if workflow["edges"] else []
            workflow["variables"] = json.loads(
                workflow["variables"]) if workflow["variables"] else {}
            workflows.append(workflow)

        return {
            "success": True,
            "data": workflows,
            "count": len(workflows)
        }


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """
    获取工作流详情

    Args:
        workflow_id: 工作流 ID

    Returns:
        工作流详细信息
    """
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, agent_id, name, description, nodes, edges, variables,
                   status, created_at, updated_at
            FROM workflows WHERE id = ?
        """, (workflow_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="工作流不存在")

        workflow = dict(row)
        # 解析 JSON 字段
        workflow["nodes"] = json.loads(
            workflow["nodes"]) if workflow["nodes"] else []
        workflow["edges"] = json.loads(
            workflow["edges"]) if workflow["edges"] else []
        workflow["variables"] = json.loads(
            workflow["variables"]) if workflow["variables"] else {}

        return {"success": True, "data": workflow}


@router.post("/create")
async def create_workflow(data: WorkflowCreate):
    """
    创建工作流

    Args:
        data: 工作流创建参数

    Returns:
        创建的工作流信息
    """
    workflow_id = f"wf_{uuid.uuid4().hex}"
    now = int(time.time() * 1000)

    with get_db() as conn:
        try:
            conn.execute("""
                INSERT INTO workflows
                (id, agent_id, name, description, nodes, edges, variables,
                 status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                workflow_id, data.agent_id, data.name, data.description,
                json.dumps(data.nodes), json.dumps(data.edges),
                json.dumps(data.variables), "draft", now, now
            ))
            conn.commit()

            return {
                "success": True,
                "data": {
                    "id": workflow_id,
                    "agent_id": data.agent_id,
                    "name": data.name,
                    "description": data.description,
                    "nodes": data.nodes,
                    "edges": data.edges,
                    "variables": data.variables,
                    "status": "draft",
                    "created_at": now,
                    "updated_at": now
                }
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, data: WorkflowUpdate):
    """
    更新工作流

    Args:
        workflow_id: 工作流 ID
        data: 更新参数

    Returns:
        更新后的工作流信息
    """
    now = int(time.time() * 1000)

    with get_db() as conn:
        # 检查工作流是否存在
        cursor = conn.execute(
            "SELECT id FROM workflows WHERE id = ?", (workflow_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="工作流不存在")

        # 构建更新语句
        updates = []
        params = []

        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name)
        if data.description is not None:
            updates.append("description = ?")
            params.append(data.description)
        if data.agent_id is not None:
            updates.append("agent_id = ?")
            params.append(data.agent_id)
        if data.nodes is not None:
            updates.append("nodes = ?")
            params.append(json.dumps(data.nodes))
        if data.edges is not None:
            updates.append("edges = ?")
            params.append(json.dumps(data.edges))
        if data.variables is not None:
            updates.append("variables = ?")
            params.append(json.dumps(data.variables))
        if data.status is not None:
            updates.append("status = ?")
            params.append(data.status)

        if not updates:
            return await get_workflow(workflow_id)

        updates.append("updated_at = ?")
        params.extend([now, workflow_id])

        conn.execute(
            f"UPDATE workflows SET {', '.join(updates)} WHERE id = ?", params
        )
        conn.commit()

        return await get_workflow(workflow_id)


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """
    删除工作流（软删除）

    Args:
        workflow_id: 工作流 ID

    Returns:
        删除结果
    """
    now = int(time.time() * 1000)

    with get_db() as conn:
        # 软删除：将状态设为 deleted
        cursor = conn.execute(
            "UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?",
            ("deleted", now, workflow_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="工作流不存在")

        return {"success": True, "message": "工作流已删除"}


@router.post("/{workflow_id}/duplicate")
async def duplicate_workflow(workflow_id: str):
    """
    复制工作流

    Args:
        workflow_id: 要复制的工作流 ID

    Returns:
        新创建的工作流信息
    """
    with get_db() as conn:
        # 获取原工作流
        cursor = conn.execute("""
            SELECT agent_id, name, description, nodes, edges, variables
            FROM workflows WHERE id = ?
        """, (workflow_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="工作流不存在")

        # 创建新工作流
        new_workflow_id = f"wf_{uuid.uuid4().hex}"
        now = int(time.time() * 1000)
        original = dict(row)

        conn.execute("""
            INSERT INTO workflows
            (id, agent_id, name, description, nodes, edges, variables,
             status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_workflow_id,
            original['agent_id'],
            f"{original['name']} (副本)",
            original['description'],
            original['nodes'],
            original['edges'],
            original['variables'],
            "draft", now, now
        ))
        conn.commit()

        return await get_workflow(new_workflow_id)


@router.post("/{workflow_id}/publish")
async def publish_workflow(workflow_id: str):
    """
    发布工作流

    将工作流状态从 draft 改为 published

    Args:
        workflow_id: 工作流 ID

    Returns:
        发布后的工作流信息
    """
    now = int(time.time() * 1000)

    with get_db() as conn:
        # 检查工作流是否存在
        cursor = conn.execute(
            "SELECT id, status FROM workflows WHERE id = ?", (workflow_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="工作流不存在")

        # 更新状态
        conn.execute(
            "UPDATE workflows SET status = ?, updated_at = ? WHERE id = ?",
            ("published", now, workflow_id)
        )
        conn.commit()

        return await get_workflow(workflow_id)


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, input_data: Optional[dict] = None):
    """
    执行工作流

    Args:
        workflow_id: 工作流 ID
        input_data: 输入数据

    Returns:
        执行结果
    """
    from workflow import get_executor

    executor = get_executor()
    result = await executor.execute(
        workflow_id=workflow_id,
        initial_input=input_data or {}
    )

    return result


@router.post("/{workflow_id}/execute-node/{node_id}")
async def execute_single_node(
    workflow_id: str,
    node_id: str,
    input_variables: Optional[dict] = None
):
    """
    单节点测试执行

    用于调试单个节点，不依赖工作流上下游。

    Args:
        workflow_id: 工作流 ID
        node_id: 要测试的节点 ID
        input_variables: 测试输入变量（模拟上游节点输出）

    Returns:
        节点执行结果，包含输出、执行时间、变量等
    """
    from workflow import get_executor

    executor = get_executor()
    result = await executor.execute_node(
        workflow_id=workflow_id,
        node_id=node_id,
        input_variables=input_variables or {}
    )

    return result


@router.post("/{workflow_id}/execute-from/{node_id}")
async def execute_from_node(
    workflow_id: str,
    node_id: str,
    initial_variables: Optional[dict] = None
):
    """
    从指定节点开始执行

    用于从某个中间节点开始测试后续流程。

    Args:
        workflow_id: 工作流 ID
        node_id: 起始节点 ID
        initial_variables: 初始变量（模拟上游节点输出）

    Returns:
        执行结果
    """
    from workflow import get_executor

    executor = get_executor()
    result = await executor.execute_from_node(
        workflow_id=workflow_id,
        start_node_id=node_id,
        initial_variables=initial_variables or {}
    )

    return result


@router.post("/execution/{execution_id}/resume")
async def resume_workflow_execution(
    execution_id: str,
    node_id: str,
    response_data: dict
):
    """
    恢复工作流执行

    当工作流等待用户交互时，通过此 API 提交响应并恢复执行。

    Args:
        execution_id: 执行 ID
        node_id: 等待响应的节点 ID
        response_data: 响应数据

    Returns:
        执行结果
    """
    from workflow import get_executor, WorkflowContext

    # TODO: 从持久化存储中恢复上下文
    # 这里简化处理，实际应该从数据库或缓存中加载

    executor = get_executor()

    # 恢复执行
    # context = load_context(execution_id)
    # context.variables[node_id] = response_data
    # result = await executor.execute(context.workflow_id, context=context)

    return {
        "success": True,
        "message": "工作流恢复执行功能待实现",
        "execution_id": execution_id,
        "node_id": node_id
    }
