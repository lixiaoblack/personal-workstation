/**
 * 对话管理服务
 * 处理对话和消息的 CRUD 操作
 */
import { getDatabase } from "../database/index";
import type {
  Conversation,
  ConversationListItem,
  ConversationGroup,
  Message,
  CreateConversationInput,
  UpdateConversationInput,
  CreateMessageInput,
} from "../types/conversation";

// 数据库行类型
interface ConversationRow {
  id: number;
  title: string | null;
  model_id: number | null;
  model_name: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  tokens_used: number | null;
  timestamp: number;
  created_at: string;
}

/**
 * 将数据库行转换为对话对象
 */
function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    modelName: row.model_name,
    messageCount: row.message_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 将数据库行转换为消息对象
 */
function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as "user" | "assistant" | "system",
    content: row.content,
    tokensUsed: row.tokens_used || undefined,
    timestamp: row.timestamp,
    createdAt: row.created_at,
  };
}

/**
 * 获取对话列表（按更新时间倒序）
 */
export function getConversationList(): ConversationListItem[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, title, model_id, model_name, message_count, created_at, updated_at
       FROM conversations 
       ORDER BY updated_at DESC`
    )
    .all() as ConversationRow[];

  return rows.map(rowToConversation);
}

/**
 * 获取分组后的对话列表
 */
export function getGroupedConversations(): ConversationGroup[] {
  const conversations = getConversationList();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { [key: string]: ConversationListItem[] } = {
    今天: [],
    昨天: [],
    本周: [],
    更早: [],
  };

  for (const conv of conversations) {
    const updatedAt = new Date(conv.updatedAt);
    if (updatedAt >= today) {
      groups["今天"].push(conv);
    } else if (updatedAt >= yesterday) {
      groups["昨天"].push(conv);
    } else if (updatedAt >= weekAgo) {
      groups["本周"].push(conv);
    } else {
      groups["更早"].push(conv);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, conversations: items }));
}

/**
 * 获取单个对话详情（包含消息）
 */
export function getConversationById(id: number): Conversation | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, title, model_id, model_name, message_count, created_at, updated_at
       FROM conversations WHERE id = ?`
    )
    .get(id) as ConversationRow | undefined;

  if (!row) return null;

  const conversation = rowToConversation(row);

  // 获取消息列表
  const messages = db
    .prepare(
      `SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at
       FROM messages WHERE conversation_id = ?
       ORDER BY timestamp ASC`
    )
    .all(id) as MessageRow[];

  return {
    ...conversation,
    messages: messages.map(rowToMessage),
  };
}

/**
 * 创建新对话
 */
export function createConversation(
  input: CreateConversationInput
): Conversation {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO conversations (title, model_id, model_name)
    VALUES (@title, @modelId, @modelName)
  `);

  const result = stmt.run({
    title: input.title || null,
    modelId: input.modelId || null,
    modelName: input.modelName || null,
  });

  return getConversationById(result.lastInsertRowid as number)!;
}

/**
 * 更新对话
 */
export function updateConversation(
  id: number,
  input: UpdateConversationInput
): Conversation | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: Record<string, unknown> = { id };

  if (input.title !== undefined) {
    updates.push("title = @title");
    values.title = input.title;
  }
  if (input.modelId !== undefined) {
    updates.push("model_id = @modelId");
    values.modelId = input.modelId;
  }
  if (input.modelName !== undefined) {
    updates.push("model_name = @modelName");
    values.modelName = input.modelName;
  }

  if (updates.length === 0) {
    return getConversationById(id);
  }

  updates.push("updated_at = datetime('now', 'localtime')");

  db.prepare(
    `UPDATE conversations SET ${updates.join(", ")} WHERE id = @id`
  ).run(values);

  return getConversationById(id);
}

/**
 * 更新对话标题
 */
export function updateConversationTitle(id: number, title: string): boolean {
  const db = getDatabase();
  const result = db
    .prepare(
      `UPDATE conversations SET title = @title, updated_at = datetime('now', 'localtime') WHERE id = @id`
    )
    .run({ id, title });

  return result.changes > 0;
}

/**
 * 删除对话
 */
export function deleteConversation(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * 添加消息
 */
export function addMessage(input: CreateMessageInput): Message {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO messages (conversation_id, role, content, tokens_used, timestamp)
    VALUES (@conversationId, @role, @content, @tokensUsed, @timestamp)
  `);

  const result = stmt.run({
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    tokensUsed: input.tokensUsed || null,
    timestamp: input.timestamp,
  });

  // 更新对话的消息数量和更新时间
  db.prepare(
    `UPDATE conversations 
     SET message_count = message_count + 1, 
         updated_at = datetime('now', 'localtime')
     WHERE id = ?`
  ).run(input.conversationId);

  // 获取新创建的消息
  const row = db
    .prepare(
      `SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at
       FROM messages WHERE id = ?`
    )
    .get(result.lastInsertRowid) as MessageRow;

  return rowToMessage(row);
}

/**
 * 获取对话的消息列表
 */
export function getMessagesByConversationId(conversationId: number): Message[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at
       FROM messages WHERE conversation_id = ?
       ORDER BY timestamp ASC`
    )
    .all(conversationId) as MessageRow[];

  return rows.map(rowToMessage);
}

/**
 * 获取对话最近 N 条消息（用于上下文传递）
 * 滑动窗口策略：只保留最近的消息，减少 token 消耗
 */
export function getRecentMessages(
  conversationId: number,
  limit: number = 20
): Message[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at
       FROM messages WHERE conversation_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(conversationId, limit) as MessageRow[];

  // 按时间正序返回（先发送的在前面）
  return rows.map(rowToMessage).reverse();
}

/**
 * 获取对话的第一条用户消息（用于自动设置标题）
 */
export function getFirstUserMessage(conversationId: number): Message | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, conversation_id, role, content, tokens_used, timestamp, created_at
       FROM messages WHERE conversation_id = ? AND role = 'user'
       ORDER BY timestamp ASC LIMIT 1`
    )
    .get(conversationId) as MessageRow | undefined;

  return row ? rowToMessage(row) : null;
}

/**
 * 自动设置对话标题（使用第一条用户消息内容）
 */
export function autoSetConversationTitle(
  conversationId: number
): string | null {
  const firstMessage = getFirstUserMessage(conversationId);
  if (!firstMessage) return null;

  // 截取前30个字符作为标题
  let title = firstMessage.content.trim().slice(0, 30);
  if (firstMessage.content.length > 30) {
    title += "...";
  }

  // 检查对话是否已有标题
  const conversation = getConversationById(conversationId);
  if (conversation?.title) return conversation.title;

  updateConversationTitle(conversationId, title);
  return title;
}
