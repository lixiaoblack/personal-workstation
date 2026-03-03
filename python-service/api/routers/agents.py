"""
智能体 API 路由

提供智能体的 CRUD 操作。
"""

import uuid
import json
import time
from typing import Optional

from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import AgentCreate, AgentUpdate

router = APIRouter(prefix="/api/agents", tags=["智能体"])


@router.get("/list")
async def list_agents():
    """
    获取智能体列表

    返回所有状态为 active 的智能体。
    """
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, name, description, avatar, model_id, model_name,
                   system_prompt, tools, knowledge_ids, skills, parameters,
                   workflow_id, status, created_at, updated_at
            FROM agents 
            WHERE status != 'deleted'
            ORDER BY updated_at DESC
        """)
        rows = cursor.fetchall()

        agents = []
        for row in rows:
            agent = dict(row)
            # 解析 JSON 字段
            agent["tools"] = json.loads(
                agent["tools"]) if agent["tools"] else []
            agent["knowledge_ids"] = json.loads(
                agent["knowledge_ids"]) if agent["knowledge_ids"] else []
            agent["skills"] = json.loads(
                agent["skills"]) if agent["skills"] else []
            agent["parameters"] = json.loads(
                agent["parameters"]) if agent["parameters"] else {}
            agents.append(agent)

        return {
            "success": True,
            "data": agents,
            "count": len(agents)
        }


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """
    获取智能体详情

    Args:
        agent_id: 智能体 ID

    Returns:
        智能体详细信息
    """
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT id, name, description, avatar, model_id, model_name,
                   system_prompt, tools, knowledge_ids, skills, parameters,
                   workflow_id, status, created_at, updated_at
            FROM agents WHERE id = ?
        """, (agent_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="智能体不存在")

        agent = dict(row)
        # 解析 JSON 字段
        agent["tools"] = json.loads(agent["tools"]) if agent["tools"] else []
        agent["knowledge_ids"] = json.loads(
            agent["knowledge_ids"]) if agent["knowledge_ids"] else []
        agent["skills"] = json.loads(
            agent["skills"]) if agent["skills"] else []
        agent["parameters"] = json.loads(
            agent["parameters"]) if agent["parameters"] else {}

        return {"success": True, "data": agent}


@router.post("/create")
async def create_agent(data: AgentCreate):
    """
    创建智能体

    Args:
        data: 智能体创建参数

    Returns:
        创建的智能体信息
    """
    agent_id = f"agent_{uuid.uuid4().hex}"
    now = int(time.time() * 1000)

    with get_db() as conn:
        try:
            conn.execute("""
                INSERT INTO agents 
                (id, name, description, avatar, model_id, model_name,
                 system_prompt, tools, knowledge_ids, skills, parameters,
                 workflow_id, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_id, data.name, data.description, data.avatar,
                data.model_id, data.model_name, data.system_prompt,
                json.dumps(data.tools), json.dumps(data.knowledge_ids),
                json.dumps(data.skills), json.dumps(data.parameters),
                data.workflow_id, "active", now, now
            ))
            conn.commit()

            return {
                "success": True,
                "data": {
                    "id": agent_id,
                    "name": data.name,
                    "description": data.description,
                    "avatar": data.avatar,
                    "model_id": data.model_id,
                    "model_name": data.model_name,
                    "system_prompt": data.system_prompt,
                    "tools": data.tools,
                    "knowledge_ids": data.knowledge_ids,
                    "skills": data.skills,
                    "parameters": data.parameters,
                    "workflow_id": data.workflow_id,
                    "status": "active",
                    "created_at": now,
                    "updated_at": now
                }
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.put("/{agent_id}")
async def update_agent(agent_id: str, data: AgentUpdate):
    """
    更新智能体

    Args:
        agent_id: 智能体 ID
        data: 更新参数

    Returns:
        更新后的智能体信息
    """
    now = int(time.time() * 1000)

    with get_db() as conn:
        # 检查智能体是否存在
        cursor = conn.execute(
            "SELECT id FROM agents WHERE id = ?", (agent_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="智能体不存在")

        # 构建更新语句
        updates = []
        params = []

        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name)
        if data.description is not None:
            updates.append("description = ?")
            params.append(data.description)
        if data.avatar is not None:
            updates.append("avatar = ?")
            params.append(data.avatar)
        if data.model_id is not None:
            updates.append("model_id = ?")
            params.append(data.model_id)
        if data.model_name is not None:
            updates.append("model_name = ?")
            params.append(data.model_name)
        if data.system_prompt is not None:
            updates.append("system_prompt = ?")
            params.append(data.system_prompt)
        if data.tools is not None:
            updates.append("tools = ?")
            params.append(json.dumps(data.tools))
        if data.knowledge_ids is not None:
            updates.append("knowledge_ids = ?")
            params.append(json.dumps(data.knowledge_ids))
        if data.skills is not None:
            updates.append("skills = ?")
            params.append(json.dumps(data.skills))
        if data.parameters is not None:
            updates.append("parameters = ?")
            params.append(json.dumps(data.parameters))
        if data.status is not None:
            updates.append("status = ?")
            params.append(data.status)
        if data.workflow_id is not None:
            updates.append("workflow_id = ?")
            params.append(data.workflow_id)

        if not updates:
            return await get_agent(agent_id)

        updates.append("updated_at = ?")
        params.extend([now, agent_id])

        conn.execute(
            f"UPDATE agents SET {', '.join(updates)} WHERE id = ?", params
        )
        conn.commit()

        return await get_agent(agent_id)


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """
    删除智能体（软删除）

    Args:
        agent_id: 智能体 ID

    Returns:
        删除结果
    """
    now = int(time.time() * 1000)

    with get_db() as conn:
        # 软删除：将状态设为 deleted
        cursor = conn.execute(
            "UPDATE agents SET status = ?, updated_at = ? WHERE id = ?",
            ("deleted", now, agent_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="智能体不存在")

        return {"success": True, "message": "智能体已删除"}


@router.post("/{agent_id}/duplicate")
async def duplicate_agent(agent_id: str):
    """
    复制智能体

    Args:
        agent_id: 要复制的智能体 ID

    Returns:
        新创建的智能体信息
    """
    with get_db() as conn:
        # 获取原智能体
        cursor = conn.execute("""
            SELECT name, description, avatar, model_id, model_name,
                   system_prompt, tools, knowledge_ids, skills, parameters, workflow_id
            FROM agents WHERE id = ?
        """, (agent_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="智能体不存在")

        # 创建新智能体
        new_agent_id = f"agent_{uuid.uuid4().hex}"
        now = int(time.time() * 1000)
        original = dict(row)

        conn.execute("""
            INSERT INTO agents 
            (id, name, description, avatar, model_id, model_name,
             system_prompt, tools, knowledge_ids, skills, parameters, workflow_id,
             status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_agent_id,
            f"{original['name']} (副本)",
            original['description'],
            original['avatar'],
            original['model_id'],
            original['model_name'],
            original['system_prompt'],
            original['tools'],
            original['knowledge_ids'],
            original['skills'],
            original['parameters'],
            original['workflow_id'],
            "active", now, now
        ))
        conn.commit()

        return await get_agent(new_agent_id)
