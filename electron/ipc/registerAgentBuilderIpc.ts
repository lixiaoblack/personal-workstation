/**
 * 智能体管理 IPC 处理器
 *
 * 处理智能体的 CRUD 操作，通过 HTTP API 与 Python 服务通信。
 */

import { ipcMain } from "electron";
import { get, post, put, del } from "../services/pythonApiClient";
import { getDatabase } from "../database";

// ==================== 类型定义 ====================

/**
 * 智能体配置
 */
export interface AgentConfig {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  model_id: number | null;
  model_name: string | null;
  system_prompt: string | null;
  tools: string[];
  knowledge_ids: string[];
  skills: string[];
  parameters: Record<string, unknown>;
  workflow_id: string | null;
  status: string;
  created_at: number;
  updated_at: number;
}

/**
 * 创建智能体输入
 */
export interface CreateAgentInput {
  name: string;
  description?: string;
  avatar?: string;
  model_id?: number;
  model_name?: string;
  system_prompt?: string;
  tools?: string[];
  knowledge_ids?: string[];
  skills?: string[];
  parameters?: Record<string, unknown>;
  workflow_id?: string;
}

/**
 * 更新智能体输入
 */
export interface UpdateAgentInput {
  name?: string;
  description?: string;
  avatar?: string;
  model_id?: number;
  model_name?: string;
  system_prompt?: string;
  tools?: string[];
  knowledge_ids?: string[];
  skills?: string[];
  parameters?: Record<string, unknown>;
  status?: string;
  workflow_id?: string;
}

/**
 * 智能体列表结果
 */
export interface AgentListResult {
  success: boolean;
  data: AgentConfig[];
  count: number;
  error?: string;
}

/**
 * 智能体详情结果
 */
export interface AgentResult {
  success: boolean;
  data?: AgentConfig;
  error?: string;
}

/**
 * 智能体对话
 */
export interface AgentConversation {
  id: number;
  agent_id: string;
  title: string | null;
  message_count: number;
  created_at: number;
  updated_at: number;
  messages?: AgentMessage[];
}

/**
 * 智能体消息
 */
export interface AgentMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  tokens_used?: number;
  timestamp: number;
  metadata?: string; // 数据库存储为 string
  created_at?: string;
}

/**
 * 智能体消息输入（用于添加消息）
 */
export interface AgentMessageInput {
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  tokens_used?: number;
  timestamp: number;
  metadata?: Record<string, unknown>; // 输入时为对象
}

/**
 * 智能体对话列表结果
 */
export interface AgentConversationListResult {
  success: boolean;
  data: AgentConversation[];
  count: number;
  error?: string;
}

/**
 * 智能体对话详情结果
 */
export interface AgentConversationResult {
  success: boolean;
  data?: AgentConversation;
  error?: string;
}

// ==================== IPC 处理器 ====================

/**
 * 注册智能体相关 IPC 处理器
 */
export function registerAgentBuilderIpc(): void {
  // 获取智能体列表
  ipcMain.handle("agent:list", async (): Promise<AgentListResult> => {
    try {
      const response = await get<AgentConfig[]>("/api/agents/list");
      return {
        success: response.success,
        data: response.data || [],
        count: response.data?.length || 0,
        error: response.error,
      };
    } catch (error) {
      console.error("[AgentBuilderIpc] 获取智能体列表失败:", error);
      return {
        success: false,
        data: [],
        count: 0,
        error: String(error),
      };
    }
  });

  // 获取智能体详情
  ipcMain.handle(
    "agent:get",
    async (_event, agentId: string): Promise<AgentResult> => {
      try {
        const response = await get<AgentConfig>(`/api/agents/${agentId}`);
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 获取智能体详情失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 创建智能体
  ipcMain.handle(
    "agent:create",
    async (_event, input: CreateAgentInput): Promise<AgentResult> => {
      try {
        const response = await post<AgentConfig>("/api/agents/create", input);
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 创建智能体失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 更新智能体
  ipcMain.handle(
    "agent:update",
    async (
      _event,
      agentId: string,
      input: UpdateAgentInput
    ): Promise<AgentResult> => {
      try {
        const response = await put<AgentConfig>(
          `/api/agents/${agentId}`,
          input
        );
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 更新智能体失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 删除智能体
  ipcMain.handle(
    "agent:delete",
    async (
      _event,
      agentId: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await del(`/api/agents/${agentId}`);
        return {
          success: response.success,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 删除智能体失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 复制智能体
  ipcMain.handle(
    "agent:duplicate",
    async (_event, agentId: string): Promise<AgentResult> => {
      try {
        const response = await post<AgentConfig>(
          `/api/agents/${agentId}/duplicate`
        );
        return {
          success: response.success,
          data: response.data,
          error: response.error,
        };
      } catch (error) {
        console.error("[AgentBuilderIpc] 复制智能体失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  console.log("[AgentBuilderIpc] 智能体 IPC 处理器已注册");
}

// ==================== 智能体对话 IPC 处理器 ====================

/**
 * 注册智能体对话相关 IPC 处理器
 */
export function registerAgentConversationIpc(): void {
  // 获取智能体对话列表
  ipcMain.handle(
    "agent:conversations:list",
    async (_event, agentId: string): Promise<AgentConversationListResult> => {
      try {
        const db = getDatabase();
        const rows = db
          .prepare(
            `SELECT id, agent_id, title, message_count, created_at, updated_at
             FROM agent_conversations 
             WHERE agent_id = ?
             ORDER BY updated_at DESC`
          )
          .all(agentId) as AgentConversation[];

        return {
          success: true,
          data: rows,
          count: rows.length,
        };
      } catch (error) {
        console.error("[AgentConversationIpc] 获取对话列表失败:", error);
        return {
          success: false,
          data: [],
          count: 0,
          error: String(error),
        };
      }
    }
  );

  // 获取对话详情（含消息）
  ipcMain.handle(
    "agent:conversations:get",
    async (
      _event,
      conversationId: number
    ): Promise<AgentConversationResult> => {
      try {
        const db = getDatabase();

        // 获取对话信息
        const conversation = db
          .prepare(
            `SELECT id, agent_id, title, message_count, created_at, updated_at
             FROM agent_conversations WHERE id = ?`
          )
          .get(conversationId) as AgentConversation | undefined;

        if (!conversation) {
          return {
            success: false,
            error: "对话不存在",
          };
        }

        // 获取消息列表
        const messages = db
          .prepare(
            `SELECT id, conversation_id, role, content, tokens_used, timestamp, metadata, created_at
             FROM agent_messages 
             WHERE conversation_id = ?
             ORDER BY timestamp ASC`
          )
          .all(conversationId) as AgentMessage[];

        // 解析 metadata
        conversation.messages = messages.map((msg) => ({
          ...msg,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
        }));

        return {
          success: true,
          data: conversation,
        };
      } catch (error) {
        console.error("[AgentConversationIpc] 获取对话详情失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 创建新对话
  ipcMain.handle(
    "agent:conversations:create",
    async (_event, agentId: string): Promise<AgentConversationResult> => {
      try {
        const db = getDatabase();
        const now = Date.now();

        const result = db
          .prepare(
            `INSERT INTO agent_conversations (agent_id, title, message_count, created_at, updated_at)
             VALUES (?, NULL, 0, ?, ?)`
          )
          .run(agentId, now, now);

        const conversationId = result.lastInsertRowid as number;

        const conversation = db
          .prepare(
            `SELECT id, agent_id, title, message_count, created_at, updated_at
             FROM agent_conversations WHERE id = ?`
          )
          .get(conversationId) as AgentConversation;

        return {
          success: true,
          data: conversation,
        };
      } catch (error) {
        console.error("[AgentConversationIpc] 创建对话失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 删除对话
  ipcMain.handle(
    "agent:conversations:delete",
    async (
      _event,
      conversationId: number
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const db = getDatabase();
        db.prepare("DELETE FROM agent_conversations WHERE id = ?").run(
          conversationId
        );

        return { success: true };
      } catch (error) {
        console.error("[AgentConversationIpc] 删除对话失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 更新对话标题
  ipcMain.handle(
    "agent:conversations:updateTitle",
    async (
      _event,
      conversationId: number,
      title: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const db = getDatabase();
        const now = Date.now();

        db.prepare(
          "UPDATE agent_conversations SET title = ?, updated_at = ? WHERE id = ?"
        ).run(title, now, conversationId);

        return { success: true };
      } catch (error) {
        console.error("[AgentConversationIpc] 更新对话标题失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 添加消息
  ipcMain.handle(
    "agent:messages:add",
    async (
      _event,
      message: AgentMessageInput
    ): Promise<{ success: boolean; messageId?: number; error?: string }> => {
      try {
        const db = getDatabase();
        const now = Date.now();

        const result = db
          .prepare(
            `INSERT INTO agent_messages 
             (conversation_id, role, content, tokens_used, timestamp, metadata)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(
            message.conversation_id,
            message.role,
            message.content,
            message.tokens_used ?? null,
            message.timestamp,
            message.metadata ? JSON.stringify(message.metadata) : null
          );

        // 更新对话的消息数量和更新时间
        db.prepare(
          `UPDATE agent_conversations 
           SET message_count = message_count + 1, updated_at = ?
           WHERE id = ?`
        ).run(now, message.conversation_id);

        return {
          success: true,
          messageId: result.lastInsertRowid as number,
        };
      } catch (error) {
        console.error("[AgentConversationIpc] 添加消息失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 获取最近消息
  ipcMain.handle(
    "agent:messages:recent",
    async (
      _event,
      conversationId: number,
      limit: number = 20
    ): Promise<{ success: boolean; data?: AgentMessage[]; error?: string }> => {
      try {
        const db = getDatabase();

        const messages = db
          .prepare(
            `SELECT id, conversation_id, role, content, tokens_used, timestamp, metadata, created_at
             FROM agent_messages 
             WHERE conversation_id = ?
             ORDER BY timestamp DESC
             LIMIT ?`
          )
          .all(conversationId, limit) as AgentMessage[];

        // 反转顺序，使其按时间正序排列
        const sortedMessages = messages.reverse().map((msg) => ({
          ...msg,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
        }));

        return {
          success: true,
          data: sortedMessages,
        };
      } catch (error) {
        console.error("[AgentConversationIpc] 获取最近消息失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  // 自动设置对话标题（根据第一条用户消息）
  ipcMain.handle(
    "agent:conversations:autoTitle",
    async (
      _event,
      conversationId: number
    ): Promise<{ success: boolean; title?: string; error?: string }> => {
      try {
        const db = getDatabase();

        // 获取第一条用户消息
        const message = db
          .prepare(
            `SELECT content FROM agent_messages 
             WHERE conversation_id = ? AND role = 'user'
             ORDER BY timestamp ASC
             LIMIT 1`
          )
          .get(conversationId) as { content: string } | undefined;

        if (message) {
          // 截取前 30 个字符作为标题
          let title = message.content.trim().substring(0, 30);
          if (message.content.length > 30) {
            title += "...";
          }

          const now = Date.now();
          db.prepare(
            "UPDATE agent_conversations SET title = ?, updated_at = ? WHERE id = ?"
          ).run(title, now, conversationId);

          return { success: true, title };
        }

        return { success: true };
      } catch (error) {
        console.error("[AgentConversationIpc] 自动设置标题失败:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );

  console.log("[AgentConversationIpc] 智能体对话 IPC 处理器已注册");
}
