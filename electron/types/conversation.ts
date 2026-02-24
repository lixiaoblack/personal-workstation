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
  // 知识库选择相关
  knowledgeSelection?: {
    /** 附件 ID */
    attachmentId: string;
    /** 选择的知识库 ID */
    knowledgeId: string;
    /** 选择的知识库名称 */
    knowledgeName: string;
    /** 选择时间戳 */
    selectedAt: number;
    /** 只读标记，已选择后不可修改 */
    readonly: true;
  };
  // 附件信息
  attachment?: {
    /** 附件 ID */
    id: string;
    /** 附件类型 */
    type: "file" | "image" | "url";
    /** 显示名称 */
    name: string;
    /** 文件大小 */
    size?: number;
    /** MIME 类型 */
    mimeType?: string;
    /** 文件路径 */
    path?: string;
    /** URL 地址 */
    url?: string;
  };
  // 知识库添加结果
  knowledgeAddResult?: {
    /** 是否成功 */
    success: boolean;
    /** 文档 ID */
    documentId?: string;
    /** 文档名称 */
    documentName?: string;
    /** 分块数量 */
    chunkCount?: number;
    /** 错误信息 */
    error?: string;
  };
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
