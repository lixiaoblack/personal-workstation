/**
 * AI 对话相关类型定义
 */

// 消息角色
export type MessageRole = "user" | "assistant" | "system";

// Agent 步骤类型
export type AgentStepType = "thought" | "tool_call" | "tool_result" | "answer";

// Agent 工具调用信息
export interface AgentToolCallInfo {
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status?: "pending" | "success" | "error";
}

// Agent 步骤（用于存储在消息 metadata 中）
export interface AgentStepData {
  type: AgentStepType;
  content: string;
  toolCall?: AgentToolCallInfo;
  iteration?: number;
  timestamp: number;
}

// 消息元数据
export interface MessageMetadata {
  agentSteps?: AgentStepData[];
}

// 消息对象
export interface Message {
  id: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  tokensUsed?: number;
  timestamp: number;
  createdAt: string;
  metadata?: MessageMetadata;
}

// 对话对象
export interface Conversation {
  id: number;
  title: string | null;
  modelId: number | null;
  modelName: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

// 对话列表项（用于侧边栏显示）
export interface ConversationListItem {
  id: number;
  title: string | null;
  modelName: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// 创建对话参数
export interface CreateConversationInput {
  title?: string;
  modelId?: number;
  modelName?: string;
}

// 更新对话参数
export interface UpdateConversationInput {
  title?: string;
  modelId?: number;
  modelName?: string;
}

// 创建消息参数
export interface CreateMessageInput {
  conversationId: number;
  role: MessageRole;
  content: string;
  tokensUsed?: number;
  timestamp: number;
  metadata?: MessageMetadata;
}

// 对话分组（按日期）
export interface ConversationGroup {
  label: string; // "今天" | "昨天" | "本周" | "更早"
  conversations: ConversationListItem[];
}

// 流式消息状态
export type StreamStatus = "idle" | "streaming" | "done" | "error";

// 流式消息状态对象
export interface StreamState {
  conversationId: number | null;
  status: StreamStatus;
  content: string;
  error?: string;
}
