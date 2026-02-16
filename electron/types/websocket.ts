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

  // 系统相关
  SYSTEM_STATUS = "system_status", // 系统状态
  SYSTEM_ERROR = "system_error", // 系统错误

  // Python 服务相关
  PYTHON_STATUS = "python_status", // Python 服务状态
  PYTHON_LOG = "python_log", // Python 日志
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

// 聊天消息
export interface ChatMessage extends BaseMessage {
  type: MessageType.CHAT_MESSAGE;
  content: string;
  conversationId?: string; // 会话 ID
  stream?: boolean; // 是否流式输出，默认 false
  metadata?: Record<string, unknown>; // 额外元数据
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

// 联合类型
export type WebSocketMessage =
  | ConnectionAckMessage
  | PingMessage
  | PongMessage
  | ClientIdentifyMessage
  | ChatMessage
  | ChatResponseMessage
  | ChatStreamStartMessage
  | ChatStreamChunkMessage
  | ChatStreamEndMessage
  | ChatErrorMessage
  | SystemStatusMessage
  | PythonStatusMessage
  | PythonLogMessage;

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
