/**
 * 记忆服务
 * 管理对话摘要和用户长期记忆
 */

import { getDatabase } from "../database/index";

// ========== 类型定义 ==========

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

// ========== 摘要管理 ==========

/**
 * 创建对话摘要
 */
export function createSummary(
  conversationId: number,
  startMessageId: number,
  endMessageId: number,
  summary: string,
  keyTopics: string[],
  messageCount: number
): ConversationSummary {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO conversation_summaries 
    (conversation_id, start_message_id, end_message_id, summary, key_topics, message_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    conversationId,
    startMessageId,
    endMessageId,
    summary,
    JSON.stringify(keyTopics),
    messageCount,
    now
  );

  return {
    id: result.lastInsertRowid as number,
    conversationId,
    startMessageId,
    endMessageId,
    summary,
    keyTopics,
    messageCount,
    createdAt: now,
  };
}

/**
 * 获取对话的所有摘要
 */
export function getSummariesByConversation(
  conversationId: number
): ConversationSummary[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, conversation_id, start_message_id, end_message_id, 
           summary, key_topics, message_count, created_at
    FROM conversation_summaries
    WHERE conversation_id = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(conversationId) as Array<{
    id: number;
    conversation_id: number;
    start_message_id: number;
    end_message_id: number;
    summary: string;
    key_topics: string;
    message_count: number;
    created_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    startMessageId: row.start_message_id,
    endMessageId: row.end_message_id,
    summary: row.summary,
    keyTopics: JSON.parse(row.key_topics || "[]"),
    messageCount: row.message_count,
    createdAt: row.created_at,
  }));
}

/**
 * 获取最近的摘要（用于构建上下文）
 */
export function getRecentSummaries(limit: number = 3): ConversationSummary[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, conversation_id, start_message_id, end_message_id, 
           summary, key_topics, message_count, created_at
    FROM conversation_summaries
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as Array<{
    id: number;
    conversation_id: number;
    start_message_id: number;
    end_message_id: number;
    summary: string;
    key_topics: string;
    message_count: number;
    created_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    startMessageId: row.start_message_id,
    endMessageId: row.end_message_id,
    summary: row.summary,
    keyTopics: JSON.parse(row.key_topics || "[]"),
    messageCount: row.message_count,
    createdAt: row.created_at,
  }));
}

// ========== 记忆管理 ==========

/**
 * 保存用户记忆
 */
export function saveMemory(
  memoryType: UserMemory["memoryType"],
  memoryKey: string,
  memoryValue: string,
  sourceConversationId?: number,
  confidence: number = 1.0
): UserMemory {
  const db = getDatabase();
  const now = Date.now();

  // 检查是否已存在相同 type + key 的记忆
  const existing = db
    .prepare(
      "SELECT id FROM user_memory WHERE memory_type = ? AND memory_key = ?"
    )
    .get(memoryType, memoryKey) as { id: number } | undefined;

  if (existing) {
    // 更新现有记忆
    const stmt = db.prepare(`
      UPDATE user_memory 
      SET memory_value = ?, confidence = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(memoryValue, confidence, now, existing.id);

    return {
      id: existing.id,
      memoryType,
      memoryKey,
      memoryValue,
      sourceConversationId: sourceConversationId || null,
      confidence,
      createdAt: now, // 简化处理
      updatedAt: now,
    };
  } else {
    // 创建新记忆
    const stmt = db.prepare(`
      INSERT INTO user_memory 
      (memory_type, memory_key, memory_value, source_conversation_id, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      memoryType,
      memoryKey,
      memoryValue,
      sourceConversationId || null,
      confidence,
      now,
      now
    );

    return {
      id: result.lastInsertRowid as number,
      memoryType,
      memoryKey,
      memoryValue,
      sourceConversationId: sourceConversationId || null,
      confidence,
      createdAt: now,
      updatedAt: now,
    };
  }
}

/**
 * 批量保存记忆
 */
export function saveMemories(
  memories: Array<{
    type: UserMemory["memoryType"];
    key: string;
    value: string;
    sourceConversationId?: number;
  }>
): void {
  for (const m of memories) {
    saveMemory(m.type, m.key, m.value, m.sourceConversationId);
  }
}

/**
 * 获取所有用户记忆
 */
export function getAllMemories(): UserMemory[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, memory_type, memory_key, memory_value, 
           source_conversation_id, confidence, created_at, updated_at
    FROM user_memory
    ORDER BY updated_at DESC
  `);

  const rows = stmt.all() as Array<{
    id: number;
    memory_type: string;
    memory_key: string;
    memory_value: string;
    source_conversation_id: number | null;
    confidence: number;
    created_at: number;
    updated_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    memoryType: row.memory_type as UserMemory["memoryType"],
    memoryKey: row.memory_key,
    memoryValue: row.memory_value,
    sourceConversationId: row.source_conversation_id,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 按类型获取记忆
 */
export function getMemoriesByType(
  memoryType: UserMemory["memoryType"]
): UserMemory[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, memory_type, memory_key, memory_value, 
           source_conversation_id, confidence, created_at, updated_at
    FROM user_memory
    WHERE memory_type = ?
    ORDER BY updated_at DESC
  `);

  const rows = stmt.all(memoryType) as Array<{
    id: number;
    memory_type: string;
    memory_key: string;
    memory_value: string;
    source_conversation_id: number | null;
    confidence: number;
    created_at: number;
    updated_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    memoryType: row.memory_type as UserMemory["memoryType"],
    memoryKey: row.memory_key,
    memoryValue: row.memory_value,
    sourceConversationId: row.source_conversation_id,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 删除记忆
 */
export function deleteMemory(memoryId: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM user_memory WHERE id = ?")
    .run(memoryId);
  return result.changes > 0;
}

/**
 * 清空所有记忆
 */
export function clearAllMemories(): void {
  const db = getDatabase();
  db.exec("DELETE FROM user_memory");
}

// ========== 上下文构建 ==========

/**
 * 构建记忆上下文
 */
export function buildMemoryContext(): MemoryContext {
  const memories = getAllMemories();
  const summaries = getRecentSummaries(3);

  const contextPrompt = buildContextPrompt(memories, summaries);

  return {
    memories,
    summaries,
    contextPrompt,
  };
}

/**
 * 构建上下文提示文本
 */
function buildContextPrompt(
  memories: UserMemory[],
  summaries: ConversationSummary[]
): string {
  const parts: string[] = [];

  // 按类型分组记忆
  const memoriesByType: Record<string, UserMemory[]> = {};
  for (const m of memories) {
    if (!memoriesByType[m.memoryType]) {
      memoriesByType[m.memoryType] = [];
    }
    memoriesByType[m.memoryType].push(m);
  }

  const typeLabels: Record<string, string> = {
    preference: "用户偏好",
    project: "项目信息",
    task: "任务进度",
    fact: "重要事实",
    context: "上下文",
  };

  // 添加各类型记忆
  for (const [type, mems] of Object.entries(memoriesByType)) {
    const label = typeLabels[type] || type;
    const items = mems.map((m) => `- ${m.memoryKey}: ${m.memoryValue}`);
    if (items.length > 0) {
      parts.push(`**${label}**\n${items.join("\n")}`);
    }
  }

  // 添加历史摘要
  if (summaries.length > 0) {
    const summaryTexts = summaries.map((s) => `- ${s.summary}`);
    parts.push(`**历史对话摘要**\n${summaryTexts.join("\n")}`);
  }

  return parts.join("\n\n");
}

// ========== 导出 ==========

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
