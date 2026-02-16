"""
ReAct Agent 工作流

这是 Agent 的核心模块，实现了 ReAct (Reasoning + Acting) 模式。

ReAct 模式核心思想：
    让 LLM 交替进行"思考(Reasoning)"和"行动(Acting)"，
    通过多轮迭代来解决问题。

ReAct 循环：
    ┌─────────────────────────────────────────────────────┐
    │                    ReAct 循环                        │
    │                                                     │
    │   ┌──────────┐                                      │
    │   │  用户输入  │                                      │
    │   └────┬─────┘                                      │
    │        ▼                                            │
    │   ┌──────────┐                                      │
    │   │  思考    │ ← Agent 分析问题，决定下一步         │
    │   │(Thought) │                                      │
    │   └────┬─────┘                                      │
    │        ▼                                            │
    │   ┌──────────┐                                      │
    │   │  行动    │ ← Agent 调用工具或给出答案           │
    │   │ (Action) │                                      │
    │   └────┬─────┘                                      │
    │        ▼                                            │
    │   ┌──────────┐                                      │
    │   │  观察    │ ← Agent 观察工具结果                 │
    │   │(Observe) │                                      │
    │   └────┬─────┘                                      │
    │        │                                            │
    │        ├──── 问题未解决 ────→ 继续思考              │
    │        │                                            │
    │        └──── 问题已解决 ────→ 输出答案              │
    │                                                     │
    └─────────────────────────────────────────────────────┘

LangGraph 工作流结构：
    
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  agent  │ ──→ │  should │ ──→ │   end   │
    │ (思考)  │     │_continue│     │ (结束)  │
    └─────────┘     └────┬────┘     └─────────┘
                         │
                         ▼ (继续)
                    ┌─────────┐
                    │  tools  │
                    │ (执行)  │
                    └────┬────┘
                         │
                         └──────→ 返回 agent 继续思考
"""

import logging
from typing import AsyncIterator, List, Dict, Any, Optional
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END

from .state import AgentState, AgentStep, ToolCall, create_initial_state
from .tools import ToolRegistry, global_tool_registry
from model_router import model_router

logger = logging.getLogger(__name__)


# ==================== Agent 系统提示词 ====================

REACT_SYSTEM_PROMPT = """你是一个智能助手，使用 ReAct (Reasoning + Acting) 模式来解决问题。

## 工作方式
1. **思考 (Thought)**: 分析用户的问题，决定下一步行动
2. **行动 (Action)**: 调用工具获取信息或执行操作
3. **观察 (Observation)**: 查看工具返回的结果
4. **迭代**: 根据观察结果继续思考，直到问题解决

## 可用工具

{tools_prompt}

## 响应格式

当你需要调用工具时，请按以下格式响应：

```
Thought: [你的思考过程]
Action: [工具名称]
Action Input: {"param": "value"}
```

当你认为问题已经解决时，请按以下格式给出最终答案：

```
Thought: [你的思考过程]
Final Answer: [最终答案]
```

## 示例

用户: 帮我算一下 123 * 456

```
Thought: 用户需要进行乘法计算，我可以使用 calculator 工具
Action: calculator
Action Input: {"expression": "123 * 456"}
```

(系统返回: 计算结果: 56088)

```
Thought: 已经得到计算结果
Final Answer: 123 * 456 = 56088
```

## 注意事项
1. 每次只调用一个工具
2. 仔细分析工具返回的结果
3. 如果工具调用失败，尝试其他方法
4. 给出最终答案时要完整、清晰
"""


# ==================== Agent 节点函数 ====================

def agent_node(state: AgentState, tool_registry: ToolRegistry) -> Dict[str, Any]:
    """
    Agent 思考节点
    
    这是 ReAct 循环的核心。Agent 在这里：
    1. 分析当前状态
    2. 决定下一步行动（思考、调用工具、或给出答案）
    
    Args:
        state: 当前 Agent 状态
        tool_registry: 工具注册中心
    
    Returns:
        状态更新字典
    """
    logger.info(f"[Agent] 开始思考，迭代次数: {state['iteration_count']}")
    
    # 1. 构建系统提示词（包含工具列表）
    tools_prompt = tool_registry.get_tools_prompt()
    system_prompt = REACT_SYSTEM_PROMPT.format(tools_prompt=tools_prompt)
    
    # 2. 构建消息列表
    messages = [SystemMessage(content=system_prompt)]
    
    # 添加历史消息
    messages.extend(state["messages"])
    
    # 添加之前的步骤记录（如果有）
    if state["steps"]:
        history = "\n".join([
            step["content"] for step in state["steps"]
        ])
        messages.append(HumanMessage(content=f"之前的执行记录:\n{history}"))
    
    # 3. 调用 LLM 进行推理
    try:
        # 转换 LangChain 消息类型为标准格式
        # LangChain: human/ai/system -> 标准: user/assistant/system
        def convert_role(msg_type: str) -> str:
            """将 LangChain 消息类型转换为标准格式"""
            role_map = {
                "human": "user",
                "ai": "assistant",
                "system": "system",
            }
            return role_map.get(msg_type, "user")
        
        # 使用 model_router 调用模型（同步方式）
        response = model_router.chat(
            messages=[{"role": convert_role(m.type), "content": m.content} for m in messages],
            stream=False
        )
        
        # response 是字符串，需要解析
        llm_output = response
        logger.info(f"[Agent] LLM 输出: {llm_output[:200]}...")
        
    except Exception as e:
        import traceback
        logger.error(f"[Agent] LLM 调用失败: {e}")
        logger.error(f"[Agent] 错误堆栈: {traceback.format_exc()}")
        return {
            "error": str(e),
            "should_finish": True,
            "output": f"抱歉，我遇到了一些问题：{str(e)}"
        }
    
    # 4. 解析 LLM 输出
    return parse_llm_output(state, llm_output, tool_registry)


def parse_llm_output(
    state: AgentState,
    llm_output: str,
    tool_registry: ToolRegistry
) -> Dict[str, Any]:
    """
    解析 LLM 输出
    
    LLM 的输出可能是：
    1. 工具调用请求（包含 Action 和 Action Input）
    2. 最终答案（包含 Final Answer）
    3. 普通对话
    
    Args:
        state: 当前状态
        llm_output: LLM 的输出文本
        tool_registry: 工具注册中心
    
    Returns:
        状态更新字典
    """
    updates: Dict[str, Any] = {
        "iteration_count": state["iteration_count"] + 1
    }
    
    # 检查是否包含最终答案
    if "Final Answer:" in llm_output:
        # 提取最终答案
        answer_start = llm_output.find("Final Answer:")
        answer = llm_output[answer_start + len("Final Answer:"):].strip()
        
        # 提取思考过程（如果有）
        thought = ""
        if "Thought:" in llm_output:
            thought_start = llm_output.find("Thought:")
            thought_end = llm_output.find("Final Answer:")
            thought = llm_output[thought_start + len("Thought:"):thought_end].strip()
        
        # 记录步骤
        steps = state["steps"].copy()
        if thought:
            steps.append(AgentStep(
                type="thought",
                content=f"💭 {thought}",
                tool_call=None
            ))
        steps.append(AgentStep(
            type="answer",
            content=answer,
            tool_call=None
        ))
        
        updates["steps"] = steps
        updates["output"] = answer
        updates["should_finish"] = True
        updates["current_thought"] = thought
        
        logger.info(f"[Agent] 得到最终答案: {answer[:100]}...")
        return updates
    
    # 检查是否包含工具调用
    if "Action:" in llm_output and "Action Input:" in llm_output:
        try:
            # 提取工具名称
            action_start = llm_output.find("Action:")
            action_end = llm_output.find("Action Input:")
            tool_name = llm_output[action_start + len("Action:"):action_end].strip()
            
            # 提取工具参数
            input_start = llm_output.find("Action Input:")
            input_end = len(llm_output)
            # 查找下一个 Thought 或 Action 标记
            for marker in ["Thought:", "Action:", "Final Answer:"]:
                pos = llm_output.find(marker, input_start + len("Action Input:"))
                if pos != -1 and pos < input_end:
                    input_end = pos
            
            input_str = llm_output[input_start + len("Action Input:"):input_end].strip()
            
            # 解析 JSON 参数
            import json
            try:
                tool_args = json.loads(input_str)
            except json.JSONDecodeError as e:
                logger.error(f"[Agent] JSON 解析失败: {e}, 原始字符串: {input_str}")
                # 尝试修复常见问题（中文引号、单引号等）
                input_str_fixed = input_str.replace('"', '"').replace('"', '"').replace("'", '"')
                try:
                    tool_args = json.loads(input_str_fixed)
                    logger.info(f"[Agent] JSON 修复成功")
                except json.JSONDecodeError:
                    raise ValueError(f"无法解析工具参数: {input_str}")
            
            # 提取思考过程
            thought = ""
            if "Thought:" in llm_output:
                thought_start = llm_output.find("Thought:")
                thought_end = llm_output.find("Action:")
                thought = llm_output[thought_start + len("Thought:"):thought_end].strip()
            
            # 创建工具调用记录
            tool_call = ToolCall(
                name=tool_name,
                arguments=tool_args,
                result=None,
                status="pending"
            )
            
            # 记录步骤
            steps = state["steps"].copy()
            if thought:
                steps.append(AgentStep(
                    type="thought",
                    content=f"💭 {thought}",
                    tool_call=None
                ))
            steps.append(AgentStep(
                type="tool_call",
                content=f"🔧 调用工具: {tool_name}",
                tool_call=tool_call
            ))
            
            updates["steps"] = steps
            updates["pending_tool_calls"] = [tool_call]
            updates["current_thought"] = thought
            
            logger.info(f"[Agent] 决定调用工具: {tool_name}, 参数: {tool_args}")
            return updates
            
        except Exception as e:
            logger.error(f"[Agent] 解析工具调用失败: {e}")
            updates["error"] = f"解析工具调用失败: {str(e)}"
            updates["should_finish"] = True
            return updates
    
    # 普通对话响应（没有工具调用或最终答案）
    steps = state["steps"].copy()
    steps.append(AgentStep(
        type="answer",
        content=llm_output,
        tool_call=None
    ))
    
    updates["steps"] = steps
    updates["output"] = llm_output
    updates["should_finish"] = True
    
    logger.info(f"[Agent] 普通响应: {llm_output[:100]}...")
    return updates


def tools_node(state: AgentState, tool_registry: ToolRegistry) -> Dict[str, Any]:
    """
    工具执行节点
    
    执行 pending_tool_calls 中的所有工具调用，
    并将结果记录到状态中。
    
    Args:
        state: 当前 Agent 状态
        tool_registry: 工具注册中心
    
    Returns:
        状态更新字典
    """
    pending_calls = state["pending_tool_calls"]
    if not pending_calls:
        return {}
    
    logger.info(f"[Tools] 执行 {len(pending_calls)} 个工具调用")
    
    steps = state["steps"].copy()
    executed_calls: List[ToolCall] = []
    
    for call in pending_calls:
        try:
            # 执行工具
            result = tool_registry.execute_tool(call["name"], call["arguments"])
            
            # 更新工具调用记录
            executed_call = ToolCall(
                name=call["name"],
                arguments=call["arguments"],
                result=result,
                status="success"
            )
            executed_calls.append(executed_call)
            
            # 记录步骤
            steps.append(AgentStep(
                type="tool_result",
                content=f"📊 结果: {result}",
                tool_call=executed_call
            ))
            
            logger.info(f"[Tools] 工具 {call['name']} 执行成功")
            
        except Exception as e:
            # 记录失败
            failed_call = ToolCall(
                name=call["name"],
                arguments=call["arguments"],
                result=str(e),
                status="error"
            )
            executed_calls.append(failed_call)
            
            steps.append(AgentStep(
                type="tool_result",
                content=f"❌ 错误: {str(e)}",
                tool_call=failed_call
            ))
            
            logger.error(f"[Tools] 工具 {call['name']} 执行失败: {e}")
    
    return {
        "steps": steps,
        "pending_tool_calls": [],  # 清空待执行列表
    }


def should_continue(state: AgentState) -> str:
    """
    路由函数：决定是否继续执行
    
    检查当前状态，决定下一步：
    1. 如果有 pending_tool_calls → 执行工具
    2. 如果 should_finish=True → 结束
    3. 如果超过最大迭代次数 → 结束
    4. 否则 → 继续思考
    
    Args:
        state: 当前 Agent 状态
    
    Returns:
        下一个节点名称（"tools" 或 "end"）
    """
    MAX_ITERATIONS = 10  # 最大迭代次数
    
    # 检查是否应该结束
    if state["should_finish"]:
        logger.info("[Router] 任务完成，结束")
        return "end"
    
    # 检查是否超过最大迭代次数
    if state["iteration_count"] >= MAX_ITERATIONS:
        logger.info(f"[Router] 达到最大迭代次数 {MAX_ITERATIONS}，结束")
        return "end"
    
    # 检查是否有待执行的工具调用
    if state["pending_tool_calls"]:
        logger.info("[Router] 有待执行的工具，调用 tools")
        return "tools"
    
    # 默认结束
    return "end"


# ==================== ReAct Agent 类 ====================

class ReActAgent:
    """
    ReAct Agent
    
    使用 LangGraph 实现的 ReAct 模式智能体。
    
    使用示例：
        agent = ReActAgent(model_id=1)
        
        # 同步执行
        result = agent.run("帮我算一下 2+2")
        
        # 流式执行
        async for step in agent.astream("帮我算一下 2+2"):
            print(step)
    """
    
    def __init__(
        self,
        model_id: Optional[int] = None,
        tool_registry: Optional[ToolRegistry] = None,
        max_iterations: int = 10
    ):
        """
        初始化 ReAct Agent
        
        Args:
            model_id: 使用的模型 ID
            tool_registry: 工具注册中心（默认使用全局注册中心）
            max_iterations: 最大迭代次数
        """
        self.model_id = model_id
        self.tool_registry = tool_registry or global_tool_registry
        self.max_iterations = max_iterations
        
        # 构建 LangGraph 工作流
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """
        构建 LangGraph 工作流
        
        工作流结构：
        
            ┌─────────┐
            │  agent  │ (思考节点)
            └────┬────┘
                 │
                 ▼
            ┌─────────┐
            │ should_ │ (路由：是否继续)
            │continue │
            └────┬────┘
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        │        ▼
   ┌────────┐    │   ┌─────────┐
   │ tools  │    │   │   END   │
   │(执行)  │    │   │ (结束)  │
   └────┬───┘    │   └─────────┘
        │        │
        └────────┘
           (循环)
        
        Returns:
            编译后的 StateGraph
        """
        # 创建工作流图
        # AgentState 是状态的类型定义
        workflow = StateGraph(AgentState)
        
        # 添加节点
        # 节点是工作流中的处理单元，每个节点接收状态并返回状态更新
        workflow.add_node("agent", lambda state: agent_node(state, self.tool_registry))
        workflow.add_node("tools", lambda state: tools_node(state, self.tool_registry))
        
        # 设置入口节点
        # 工作流从这里开始执行
        workflow.set_entry_point("agent")
        
        # 添加条件边
        # 根据 should_continue 函数的返回值决定下一个节点
        workflow.add_conditional_edges(
            "agent",  # 从 agent 节点出发
            should_continue,  # 路由函数
            {
                "tools": "tools",  # 返回 "tools" → 跳转到 tools 节点
                "end": END,  # 返回 "end" → 结束
            }
        )
        
        # 添加普通边
        # tools 节点执行完后，总是返回 agent 节点继续思考
        workflow.add_edge("tools", "agent")
        
        # 编译工作流
        # 编译后的图可以执行
        return workflow.compile()
    
    def run(
        self,
        input_text: str,
        messages: Optional[List] = None,
        conversation_id: Optional[str] = None
    ) -> AgentState:
        """
        同步执行 Agent
        
        Args:
            input_text: 用户输入
            messages: 历史消息列表（可选）
            conversation_id: 会话 ID（可选）
        
        Returns:
            最终的 Agent 状态
        """
        # 构建初始消息
        if messages is None:
            messages = [HumanMessage(content=input_text)]
        
        # 创建初始状态
        initial_state = create_initial_state(
            messages=messages,
            input_text=input_text,
            conversation_id=conversation_id
        )
        
        # 执行工作流
        final_state = self.graph.invoke(initial_state)
        
        return final_state
    
    async def astream(
        self,
        input_text: str,
        messages: Optional[List] = None,
        conversation_id: Optional[str] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        流式执行 Agent
        
        每执行一个节点，就返回当前状态更新。
        用于实时展示 Agent 的执行过程。
        
        Args:
            input_text: 用户输入
            messages: 历史消息列表（可选）
            conversation_id: 会话 ID（可选）
        
        Yields:
            状态更新字典
        """
        # 构建初始消息
        if messages is None:
            messages = [HumanMessage(content=input_text)]
        
        # 创建初始状态
        initial_state = create_initial_state(
            messages=messages,
            input_text=input_text,
            conversation_id=conversation_id
        )
        
        # 流式执行工作流
        async for event in self.graph.astream(initial_state):
            # event 是 {node_name: state_update} 格式
            for node_name, state_update in event.items():
                yield {
                    "node": node_name,
                    "update": state_update
                }


# ==================== 便捷函数 ====================

def create_agent(model_id: Optional[int] = None) -> ReActAgent:
    """
    创建 ReAct Agent 实例
    
    Args:
        model_id: 模型 ID
    
    Returns:
        ReActAgent 实例
    """
    return ReActAgent(model_id=model_id)
