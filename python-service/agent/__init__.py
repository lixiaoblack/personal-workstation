"""
AI Agent 模块

本模块实现基于 LangGraph 的 ReAct 智能体框架。

ReAct = Reasoning + Acting（推理 + 行动）
核心思想：让 AI 模型能够"思考"并"行动"，通过工具调用来解决复杂问题。

模块结构：
- state.py: 定义 Agent 的状态结构
- tools.py: 工具注册和管理
- graph.py: LangGraph 工作流定义（ReAct Agent）
- deep_agent.py: Deep Agents 封装（高级智能体能力）
"""

from .state import AgentState, AgentStep
from .tools import ToolRegistry, BaseTool
from .graph import ReActAgent
from .deep_agent import DeepAgentWrapper, MessageSender, create_deep_agent

__all__ = [
    "AgentState",
    "AgentStep",
    "ToolRegistry",
    "BaseTool",
    "ReActAgent",
    "DeepAgentWrapper",
    "MessageSender",
    "create_deep_agent",
]
