"""
Agent 状态定义

在 LangGraph 中，状态（State）是工作流中各节点之间传递数据的载体。
可以把它理解为一个"共享的数据对象"，每个节点可以读取和修改它。

状态流转：
┌─────────┐    状态    ┌─────────┐    状态    ┌─────────┐
│  节点A  │ ────────→ │  节点B  │ ────────→ │  节点C  │
└─────────┘           └─────────┘           └─────────┘

ReAct Agent 的状态包含：
1. 用户输入的消息
2. Agent 的思考过程
3. 工具调用记录
4. 最终答案
"""

from typing import TypedDict, List, Optional, Literal
from langchain_core.messages import BaseMessage


class ToolCall(TypedDict):
    """
    工具调用记录

    记录 Agent 调用工具的完整信息，包括：
    - 工具名称
    - 工具输入参数
    - 工具执行结果
    - 执行状态（成功/失败）
    """
    # 工具名称，如 "calculator"
    name: str

    # 工具输入参数，如 {"expression": "2+2"}
    arguments: dict

    # 工具执行结果，如 "计算结果: 4"
    result: Optional[str]

    # 执行状态：pending(待执行)、success(成功)、error(失败)
    status: Literal["pending", "success", "error"]


class AgentStep(TypedDict):
    """
    Agent 执行步骤

    ReAct Agent 的每一步都会生成一个 AgentStep，
    用于记录当前步骤的详细信息，方便前端展示思考过程。
    """
    # 步骤类型
    # - "thought": 思考（Agent 在分析问题）
    # - "tool_call": 调用工具
    # - "tool_result": 工具返回结果
    # - "answer": 最终答案
    type: Literal["thought", "tool_call", "tool_result", "answer"]

    # 步骤内容
    # - thought: 思考内容
    # - tool_call: 工具调用信息
    # - tool_result: 工具返回结果
    # - answer: 最终答案文本
    content: str

    # 相关的工具调用（仅 tool_call 和 tool_result 类型有值）
    tool_call: Optional[ToolCall]


class AgentState(TypedDict):
    """
    Agent 状态

    这是 LangGraph 工作流的核心数据结构。
    整个 Agent 的执行过程中，所有节点都通过这个状态来共享数据。

    状态流转示例：
    1. 用户输入 → input: "帮我算一下 2+2"
    2. Agent 思考 → steps: [{"type": "thought", "content": "用户需要计算..."}]
    3. 调用工具 → steps: [..., {"type": "tool_call", "tool_call": {...}}]
    4. 工具结果 → steps: [..., {"type": "tool_result", ...}]
    5. 最终答案 → output: "2+2 = 4"
    """

    # ==================== 输入 ====================

    # 用户输入的原始消息列表（LangChain 消息格式）
    # 包含历史对话和当前用户输入
    # 示例: [HumanMessage("帮我算一下 2+2")]
    messages: List[BaseMessage]

    # 用户输入的原始文本（便于处理）
    input: str

    # 会话 ID（用于上下文管理）
    conversation_id: Optional[str]

    # ==================== Agent 执行过程 ====================

    # Agent 的执行步骤记录
    # 每一步思考、工具调用、工具结果都会记录在这里
    # 用于前端展示 Agent 的思考过程
    steps: List[AgentStep]

    # 当前步骤的思考内容
    # Agent 在决定下一步行动前的思考过程
    current_thought: Optional[str]

    # 待执行的工具调用列表
    # Agent 决定调用工具后，会将工具调用信息放在这里
    pending_tool_calls: List[ToolCall]

    # ==================== 输出 ====================

    # Agent 的最终答案
    # 当 Agent 认为问题已解决时，会生成最终答案
    output: Optional[str]

    # ==================== 控制 ====================

    # 迭代次数（防止无限循环）
    # ReAct Agent 可能在思考-行动循环中无限循环
    # 需要设置最大迭代次数来限制
    iteration_count: int

    # 是否应该结束
    # 当 Agent 认为问题已解决或达到最大迭代次数时设为 True
    should_finish: bool

    # 错误信息（如果有）
    error: Optional[str]


def create_initial_state(
    messages: List[BaseMessage],
    input_text: str,
    conversation_id: Optional[str] = None
) -> AgentState:
    """
    创建初始状态

    在开始 Agent 执行前，需要初始化状态对象。

    Args:
        messages: LangChain 消息列表（包含历史对话）
        input_text: 用户输入的文本
        conversation_id: 会话 ID（可选）

    Returns:
        初始化后的 AgentState
    """
    return AgentState(
        # 输入
        messages=messages,
        input=input_text,
        conversation_id=conversation_id,

        # 执行过程（初始为空）
        steps=[],
        current_thought=None,
        pending_tool_calls=[],

        # 输出（初始为空）
        output=None,

        # 控制
        iteration_count=0,
        should_finish=False,
        error=None,
    )
