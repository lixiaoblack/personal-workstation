/**
 * WebSocket 消息协议类型定义
 * 用于渲染进程、主进程和 Python 智能体服务之间的通信
 */

// 消息类型枚举
export enum MessageType {
  // 连接相关
  CONNECTION_ACK = "connection_ack", // 连接确认
  PING = "ping", // 心跳请求
  PONG = "pong", // 心跳响应
  CLIENT_IDENTIFY = "client_identify", // 客户端标识

  // 聊天相关
  CHAT_MESSAGE = "chat_message", // 聊天消息
  CHAT_RESPONSE = "chat_response", // 聊天响应（非流式）
  CHAT_ERROR = "chat_error", // 聊天错误

  // 流式响应
  CHAT_STREAM_START = "chat_stream_start", // 流式开始
  CHAT_STREAM_CHUNK = "chat_stream_chunk", // 流式内容块
  CHAT_STREAM_END = "chat_stream_end", // 流式结束

  // Agent 相关（ReAct 模式）
  AGENT_CHAT = "agent_chat", // Agent 聊天消息（触发智能体）
  AGENT_THOUGHT = "agent_thought", // Agent 思考过程
  AGENT_TOOL_CALL = "agent_tool_call", // Agent 工具调用
  AGENT_TOOL_RESULT = "agent_tool_result", // 工具执行结果
  AGENT_STEP = "agent_step", // Agent 步骤更新（通用）

  // 系统相关
  SYSTEM_STATUS = "system_status", // 系统状态
  SYSTEM_ERROR = "system_error", // 系统错误

  // Python 服务相关
  PYTHON_STATUS = "python_status", // Python 服务状态
  PYTHON_LOG = "python_log", // Python 日志

  // Ollama 相关
  OLLAMA_STATUS = "ollama_status", // Ollama 状态查询
  OLLAMA_STATUS_RESPONSE = "ollama_status_response", // Ollama 状态响应
  OLLAMA_MODELS = "ollama_models", // Ollama 模型列表查询
  OLLAMA_MODELS_RESPONSE = "ollama_models_response", // Ollama 模型列表响应
  OLLAMA_TEST = "ollama_test", // Ollama 连接测试
  OLLAMA_TEST_RESPONSE = "ollama_test_response", // Ollama 测试响应
}

// 基础消息结构
export interface BaseMessage {
  type: MessageType;
  id?: string; // 消息唯一 ID
  timestamp: number; // 时间戳
}

// 连接确认消息
export interface ConnectionAckMessage extends BaseMessage {
  type: MessageType.CONNECTION_ACK;
  clientId: string;
}

// 心跳消息
export interface PingMessage extends BaseMessage {
  type: MessageType.PING;
}

export interface PongMessage extends BaseMessage {
  type: MessageType.PONG;
}

// 历史消息项（用于上下文传递）
export interface HistoryMessageItem {
  role: "user" | "assistant" | "system";
  content: string;
}

// 聊天消息
export interface ChatMessage extends BaseMessage {
  type: MessageType.CHAT_MESSAGE;
  content: string;
  conversationId?: string; // 会话 ID
  modelId?: number; // 模型配置 ID
  stream?: boolean; // 是否流式输出，默认 false
  history?: HistoryMessageItem[]; // 历史消息（滑动窗口）
  maxHistoryTokens?: number; // 最大上下文 token 数（可选）
  metadata?: Record<string, unknown>; // 额外元数据
}

// Agent 聊天消息（触发 ReAct 智能体）
export interface AgentChatMessage extends BaseMessage {
  type: MessageType.AGENT_CHAT;
  content: string;
  conversationId?: string; // 会话 ID
  modelId?: number; // 模型配置 ID
  history?: HistoryMessageItem[]; // 历史消息（滑动窗口）
  maxIterations?: number; // 最大迭代次数，默认 5
}

// 聊天响应
export interface ChatResponseMessage extends BaseMessage {
  type: MessageType.CHAT_RESPONSE;
  content: string;
  conversationId?: string;
  success: boolean;
}

// 流式响应开始
export interface ChatStreamStartMessage extends BaseMessage {
  type: MessageType.CHAT_STREAM_START;
  conversationId: number;
  modelId?: number;
  modelName?: string;
}

// 流式响应内容块
export interface ChatStreamChunkMessage extends BaseMessage {
  type: MessageType.CHAT_STREAM_CHUNK;
  conversationId: number;
  content: string; // 内容块
  chunkIndex: number; // 块索引
}

// 流式响应结束
export interface ChatStreamEndMessage extends BaseMessage {
  type: MessageType.CHAT_STREAM_END;
  conversationId: number;
  fullContent: string; // 完整内容
  tokensUsed?: number; // 消耗的 token 数
}

// 聊天错误
export interface ChatErrorMessage extends BaseMessage {
  type: MessageType.CHAT_ERROR;
  error: string;
  code?: string;
  conversationId?: string;
}

// 系统状态
export interface SystemStatusMessage extends BaseMessage {
  type: MessageType.SYSTEM_STATUS;
  status: "ready" | "busy" | "error";
  message?: string;
}

// Python 服务状态
export interface PythonStatusMessage extends BaseMessage {
  type: MessageType.PYTHON_STATUS;
  status: "running" | "stopped" | "error";
  version?: string;
  pid?: number;
}

// Python 日志
export interface PythonLogMessage extends BaseMessage {
  type: MessageType.PYTHON_LOG;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

// Ollama 状态查询消息
export interface OllamaStatusMessage extends BaseMessage {
  type: MessageType.OLLAMA_STATUS;
  host?: string;
}

// Ollama 状态响应消息
export interface OllamaStatusResponseMessage extends BaseMessage {
  type: MessageType.OLLAMA_STATUS_RESPONSE;
  running: boolean;
  host: string;
  version?: string;
  error?: string;
  models?: Array<{
    name: string;
    modifiedAt: string;
    size: number;
    sizeGB: number;
    sizeMB: number;
    digest: string;
  }>;
  modelCount?: number;
}

// Ollama 模型列表查询消息
export interface OllamaModelsMessage extends BaseMessage {
  type: MessageType.OLLAMA_MODELS;
  host?: string;
}

// Ollama 模型列表响应消息
export interface OllamaModelsResponseMessage extends BaseMessage {
  type: MessageType.OLLAMA_MODELS_RESPONSE;
  success: boolean;
  host: string;
  models?: Array<{
    name: string;
    modifiedAt: string;
    size: number;
    sizeGB: number;
    sizeMB: number;
    digest: string;
  }>;
  count?: number;
  error?: string;
}

// Ollama 连接测试消息
export interface OllamaTestMessage extends BaseMessage {
  type: MessageType.OLLAMA_TEST;
  host?: string;
}

// Ollama 测试响应消息
export interface OllamaTestResponseMessage extends BaseMessage {
  type: MessageType.OLLAMA_TEST_RESPONSE;
  success: boolean;
  host: string;
  latency?: number;
  modelCount?: number;
  error?: string;
}

// ==================== Agent 相关消息类型 ====================

/**
 * Agent 步骤类型
 *
 * Agent 执行过程中的每一步都有对应的类型：
 * - thought: 思考过程，Agent 在分析问题
 * - tool_call: 调用工具，Agent 决定使用某个工具
 * - tool_result: 工具结果，工具执行完毕返回的结果
 * - answer: 最终答案，Agent 认为问题已解决
 */
export type AgentStepType = "thought" | "tool_call" | "tool_result" | "answer";

/**
 * 工具调用信息
 *
 * 记录 Agent 调用工具的详细信息
 */
export interface AgentToolCallInfo {
  /** 工具名称，如 "calculator" */
  name: string;
  /** 工具参数，如 {"expression": "2+2"} */
  arguments: Record<string, unknown>;
  /** 工具执行结果（仅在 tool_result 类型时有值） */
  result?: string;
  /** 执行状态 */
  status?: "pending" | "success" | "error";
}

/**
 * Agent 步骤消息（通用）
 *
 * 用于通知前端 Agent 的执行进度。
 * 每一步思考、工具调用、结果都会通过这个消息发送。
 */
export interface AgentStepMessage extends BaseMessage {
  type: MessageType.AGENT_STEP;
  /** 会话 ID */
  conversationId: string;
  /** 步骤类型 */
  stepType: AgentStepType;
  /** 步骤内容（人类可读的描述） */
  content: string;
  /** 工具调用信息（仅 tool_call 和 tool_result 类型时有值） */
  toolCall?: AgentToolCallInfo;
  /** 当前迭代次数 */
  iteration?: number;
}

/**
 * Agent 思考消息
 *
 * Agent 在执行过程中的思考内容
 */
export interface AgentThoughtMessage extends BaseMessage {
  type: MessageType.AGENT_THOUGHT;
  conversationId: string;
  /** 思考内容 */
  thought: string;
  /** 当前迭代次数 */
  iteration: number;
}

/**
 * Agent 工具调用消息
 *
 * Agent 决定调用某个工具时发送
 */
export interface AgentToolCallMessage extends BaseMessage {
  type: MessageType.AGENT_TOOL_CALL;
  conversationId: string;
  /** 工具调用信息 */
  toolCall: AgentToolCallInfo;
  /** 当前迭代次数 */
  iteration: number;
}

/**
 * Agent 工具结果消息
 *
 * 工具执行完毕后发送
 */
export interface AgentToolResultMessage extends BaseMessage {
  type: MessageType.AGENT_TOOL_RESULT;
  conversationId: string;
  /** 工具调用信息（包含结果） */
  toolCall: AgentToolCallInfo;
  /** 当前迭代次数 */
  iteration: number;
}

// 联合类型
export type WebSocketMessage =
  | ConnectionAckMessage
  | PingMessage
  | PongMessage
  | ClientIdentifyMessage
  | ChatMessage
  | AgentChatMessage
  | ChatResponseMessage
  | ChatStreamStartMessage
  | ChatStreamChunkMessage
  | ChatStreamEndMessage
  | ChatErrorMessage
  | AgentStepMessage
  | AgentThoughtMessage
  | AgentToolCallMessage
  | AgentToolResultMessage
  | SystemStatusMessage
  | PythonStatusMessage
  | PythonLogMessage
  | OllamaStatusMessage
  | OllamaStatusResponseMessage
  | OllamaModelsMessage
  | OllamaModelsResponseMessage
  | OllamaTestMessage
  | OllamaTestResponseMessage;

// WebSocket 连接状态
export enum ConnectionState {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

// WebSocket 客户端类型
export type ClientType = "renderer" | "python_agent";

// WebSocket 客户端信息
export interface WebSocketClientInfo {
  id: string;
  clientType: ClientType; // 客户端类型
  isRenderer: boolean; // 是否是渲染进程（兼容旧字段）
  connectedAt: number;
  lastActivity: number;
}

// 客户端标识消息
export interface ClientIdentifyMessage extends BaseMessage {
  type: MessageType.CLIENT_IDENTIFY;
  clientType: ClientType;
}

// 生成唯一 ID
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 创建消息的辅助函数
export function createMessage<T extends WebSocketMessage>(
  type: MessageType,
  data: Omit<T, "type" | "timestamp" | "id">
): T {
  return {
    type,
    id: generateMessageId(),
    timestamp: Date.now(),
    ...data,
  } as T;
}
