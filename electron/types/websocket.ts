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

  // 聊天相关
  CHAT_MESSAGE = "chat_message", // 聊天消息
  CHAT_RESPONSE = "chat_response", // 聊天响应
  CHAT_STREAM = "chat_stream", // 流式响应
  CHAT_ERROR = "chat_error", // 聊天错误

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
  metadata?: Record<string, unknown>; // 额外元数据
}

// 聊天响应
export interface ChatResponseMessage extends BaseMessage {
  type: MessageType.CHAT_RESPONSE;
  content: string;
  conversationId?: string;
  success: boolean;
}

// 流式响应
export interface ChatStreamMessage extends BaseMessage {
  type: MessageType.CHAT_STREAM;
  content: string;
  conversationId?: string;
  done: boolean; // 是否结束
  chunkIndex: number; // 分块索引
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
  | ChatMessage
  | ChatResponseMessage
  | ChatStreamMessage
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

// WebSocket 客户端信息
export interface WebSocketClientInfo {
  id: string;
  isRenderer: boolean; // 是否是渲染进程
  connectedAt: number;
  lastActivity: number;
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
