/**
 * 记忆服务
 *
 * 通过 Python HTTP API 管理对话摘要和用户长期记忆
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { get, post, del } from "./pythonApiClient";

// ==================== 类型定义 ====================

export interface ConversationSummary {
  id: number;
  conversationId: number;
  startMessageId: number;
  endMessageId: number;
  summary: string;
  keyTopics: string[];
  messageCount: number;
  createdAt: number;
}

export interface UserMemory {
  id: number;
  memoryType: "preference" | "project" | "task" | "fact" | "context";
  memoryKey: string;
  memoryValue: string;
  sourceConversationId: number | null;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryContext {
  memories: UserMemory[];
  summaries: ConversationSummary[];
  contextPrompt: string;
}

// ==================== 摘要管理 ====================

/**
 * 创建对话摘要
 */
export async function createSummary(
  conversationId: number,
  startMessageId: number,
  endMessageId: number,
  summary: string,
  keyTopics: string[],
  messageCount: number
): Promise<ConversationSummary> {
  const response = await post("/api/summaries", {
    conversation_id: conversationId,
    start_message_id: startMessageId,
    end_message_id: endMessageId,
    summary,
    key_topics: keyTopics,
    message_count: messageCount,
  });

  if (response?.success && response.data) {
    return transformSummary(response.data);
  }

  throw new Error(response?.error || "创建摘要失败");
}

/**
 * 获取对话的所有摘要
 */
export async function getSummariesByConversation(
  conversationId: number
): Promise<ConversationSummary[]> {
  const response = await get<ConversationSummary[]>(
    `/api/summaries?conversation_id=${conversationId}`
  );
  if (response?.success && response.data) {
    return response.data.map(transformSummary);
  }
  return [];
}

/**
 * 获取最近的摘要（用于构建上下文）
 */
export async function getRecentSummaries(
  limit: number = 3
): Promise<ConversationSummary[]> {
  const response = await get<ConversationSummary[]>(
    `/api/summaries?limit=${limit}`
  );
  if (response?.success && response.data) {
    return response.data.map(transformSummary);
  }
  return [];
}

// ==================== 记忆管理 ====================

/**
 * 保存用户记忆
 */
export async function saveMemory(
  memoryType: UserMemory["memoryType"],
  memoryKey: string,
  memoryValue: string,
  sourceConversationId?: number,
  confidence: number = 1.0
): Promise<UserMemory> {
  const response = await post("/api/memories", {
    memory_type: memoryType,
    memory_key: memoryKey,
    memory_value: memoryValue,
    source_conversation_id: sourceConversationId || null,
    confidence,
  });

  if (response?.success && response.data) {
    return transformMemory(response.data);
  }

  throw new Error(response?.error || "保存记忆失败");
}

/**
 * 批量保存记忆
 */
export async function saveMemories(
  memories: Array<{
    type: UserMemory["memoryType"];
    key: string;
    value: string;
    sourceConversationId?: number;
  }>
): Promise<void> {
  for (const m of memories) {
    await saveMemory(m.type, m.key, m.value, m.sourceConversationId);
  }
}

/**
 * 获取所有用户记忆
 */
export async function getAllMemories(): Promise<UserMemory[]> {
  const response = await get<UserMemory[]>("/api/memories");
  if (response?.success && response.data) {
    return response.data.map(transformMemory);
  }
  return [];
}

/**
 * 按类型获取记忆
 */
export async function getMemoriesByType(
  memoryType: UserMemory["memoryType"]
): Promise<UserMemory[]> {
  const response = await get<UserMemory[]>(
    `/api/memories?memory_type=${memoryType}`
  );
  if (response?.success && response.data) {
    return response.data.map(transformMemory);
  }
  return [];
}

/**
 * 删除记忆
 */
export async function deleteMemory(memoryId: number): Promise<boolean> {
  const response = await del(`/api/memories/${memoryId}`);
  return response?.success === true;
}

/**
 * 清空所有记忆
 */
export async function clearAllMemories(): Promise<boolean> {
  const response = await del("/api/memories");
  return response?.success === true;
}

// ==================== 上下文构建 ====================

/**
 * 构建记忆上下文
 */
export async function buildMemoryContext(): Promise<MemoryContext> {
  const response = await get<{
    memories: any[];
    summaries: any[];
    context_prompt: string;
  }>("/api/memories/context");
  if (response?.success && response.data) {
    return {
      memories: (response.data.memories || []).map(transformMemory),
      summaries: (response.data.summaries || []).map(transformSummary),
      contextPrompt: response.data.context_prompt || "",
    };
  }
  return {
    memories: [],
    summaries: [],
    contextPrompt: "",
  };
}

// ==================== 转换函数 ====================

/**
 * 转换记忆对象
 */
function transformMemory(data: any): UserMemory {
  return {
    id: data.id,
    memoryType: data.memory_type || data.memoryType,
    memoryKey: data.memory_key || data.memoryKey,
    memoryValue: data.memory_value || data.memoryValue,
    sourceConversationId:
      data.source_conversation_id ?? data.sourceConversationId ?? null,
    confidence: data.confidence ?? 1.0,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
  };
}

/**
 * 转换摘要对象
 */
function transformSummary(data: any): ConversationSummary {
  return {
    id: data.id,
    conversationId: data.conversation_id || data.conversationId,
    startMessageId: data.start_message_id || data.startMessageId,
    endMessageId: data.end_message_id || data.endMessageId,
    summary: data.summary,
    keyTopics: data.key_topics || data.keyTopics || [],
    messageCount: data.message_count || data.messageCount,
    createdAt: data.created_at || data.createdAt,
  };
}

export default {
  createSummary,
  getSummariesByConversation,
  getRecentSummaries,
  saveMemory,
  saveMemories,
  getAllMemories,
  getMemoriesByType,
  deleteMemory,
  clearAllMemories,
  buildMemoryContext,
};
