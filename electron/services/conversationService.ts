/**
 * 对话管理服务
 *
 * 通过 Python HTTP API 处理对话和消息的 CRUD 操作
 */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Conversation,
  ConversationListItem,
  ConversationGroup,
  Message,
  CreateConversationInput,
  UpdateConversationInput,
  CreateMessageInput,
  MessageMetadata,
} from "../types/conversation";

// ==================== HTTP 请求辅助函数 ====================

const HTTP_HOST = "127.0.0.1";
const HTTP_PORT = 8766;
const HTTP_TIMEOUT = 5000;

/**
 * 发送 HTTP 请求（Promise 版本）
 */
function httpRequest(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve) => {
    const http = require("http");
    const bodyData = body ? JSON.stringify(body) : "";

    const options: any = {
      hostname: HTTP_HOST,
      port: HTTP_PORT,
      path,
      method,
      timeout: HTTP_TIMEOUT,
    };

    if (body) {
      options.headers = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyData),
      };
    }

    const req = http.request(options, (res: any) => {
      let data = "";
      res.on("data", (chunk: string) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error("[ConversationService] 解析响应失败:", e);
          resolve(null);
        }
      });
    });

    req.on("error", (e: Error) => {
      console.error("[ConversationService] 请求失败:", e);
      resolve(null);
    });

    req.on("timeout", () => {
      console.error("[ConversationService] 请求超时");
      req.destroy();
      resolve(null);
    });

    if (body) {
      req.write(bodyData);
    }
    req.end();
  });
}

// ==================== 对话操作 ====================

/**
 * 获取对话列表（按更新时间倒序）
 */
export async function getConversationList(): Promise<ConversationListItem[]> {
  const response = await httpRequest("GET", "/api/conversations");
  if (response?.success && response.data) {
    return response.data.map(transformConversation);
  }
  return [];
}

/**
 * 获取分组后的对话列表
 */
export async function getGroupedConversations(): Promise<ConversationGroup[]> {
  const response = await httpRequest("GET", "/api/conversations/grouped");
  if (response?.success && response.data) {
    return response.data.map((group: any) => ({
      label: group.label,
      conversations: group.conversations.map(transformConversation),
    }));
  }
  return [];
}

/**
 * 获取单个对话详情（包含消息）
 */
export async function getConversationById(
  id: number
): Promise<Conversation | null> {
  const response = await httpRequest("GET", `/api/conversations/${id}`);
  if (response?.success && response.data) {
    return transformConversationWithMessages(response.data);
  }
  return null;
}

/**
 * 创建新对话
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  const response = await httpRequest("POST", "/api/conversations", {
    title: input.title || null,
    model_id: input.modelId || null,
    model_name: input.modelName || null,
  });

  if (response?.success && response.data) {
    return transformConversationWithMessages(response.data);
  }

  throw new Error(response?.error || "创建对话失败");
}

/**
 * 更新对话
 */
export async function updateConversation(
  id: number,
  input: UpdateConversationInput
): Promise<Conversation | null> {
  const response = await httpRequest("PUT", `/api/conversations/${id}`, {
    title: input.title,
    model_id: input.modelId,
    model_name: input.modelName,
  });

  if (response?.success && response.data) {
    return transformConversationWithMessages(response.data);
  }
  return null;
}

/**
 * 更新对话标题
 */
export async function updateConversationTitle(
  id: number,
  title: string
): Promise<boolean> {
  const response = await httpRequest("PUT", `/api/conversations/${id}`, {
    title,
  });
  return response?.success === true;
}

/**
 * 删除对话
 */
export async function deleteConversation(id: number): Promise<boolean> {
  const response = await httpRequest("DELETE", `/api/conversations/${id}`);
  return response?.success === true;
}

// ==================== 消息操作 ====================

/**
 * 获取对话的消息列表
 */
export async function getMessagesByConversationId(
  conversationId: number
): Promise<Message[]> {
  const response = await httpRequest(
    "GET",
    `/api/conversations/${conversationId}/messages`
  );
  if (response?.success && response.data) {
    return response.data.map(transformMessage);
  }
  return [];
}

/**
 * 获取对话最近 N 条消息（用于上下文传递）
 */
export async function getRecentMessages(
  conversationId: number,
  limit: number = 20
): Promise<Message[]> {
  const response = await httpRequest(
    "GET",
    `/api/conversations/${conversationId}/messages?limit=${limit}`
  );
  if (response?.success && response.data) {
    return response.data.map(transformMessage);
  }
  return [];
}

/**
 * 添加消息
 */
export async function addMessage(input: CreateMessageInput): Promise<Message> {
  const response = await httpRequest(
    "POST",
    `/api/conversations/${input.conversationId}/messages`,
    {
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      tokens_used: input.tokensUsed || null,
      timestamp: input.timestamp,
      metadata: input.metadata || null,
    }
  );

  if (response?.success && response.data) {
    return transformMessage(response.data);
  }

  throw new Error(response?.error || "添加消息失败");
}

/**
 * 获取对话的第一条用户消息（用于自动设置标题）
 */
export async function getFirstUserMessage(
  conversationId: number
): Promise<Message | null> {
  const messages = await getMessagesByConversationId(conversationId);
  return messages.find((m) => m.role === "user") || null;
}

/**
 * 自动设置对话标题（使用第一条用户消息内容）
 */
export async function autoSetConversationTitle(
  conversationId: number
): Promise<string | null> {
  const firstMessage = await getFirstUserMessage(conversationId);
  if (!firstMessage) return null;

  // 截取前30个字符作为标题
  let title = firstMessage.content.trim().slice(0, 30);
  if (firstMessage.content.length > 30) {
    title += "...";
  }

  // 检查对话是否已有标题
  const conversation = await getConversationById(conversationId);
  if (conversation?.title) return conversation.title;

  await updateConversationTitle(conversationId, title);
  return title;
}

// ==================== 转换函数 ====================

/**
 * 转换对话对象（不含消息）
 */
function transformConversation(data: any): ConversationListItem {
  return {
    id: data.id,
    title: data.title,
    modelName: data.model_name || data.modelName,
    messageCount: data.message_count || data.messageCount || 0,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
  };
}

/**
 * 转换对话对象（含消息）
 */
function transformConversationWithMessages(data: any): Conversation {
  return {
    id: data.id,
    title: data.title,
    modelId: data.model_id || data.modelId,
    modelName: data.model_name || data.modelName,
    messageCount: data.message_count || data.messageCount || 0,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
    messages: (data.messages || []).map(transformMessage),
  };
}

/**
 * 转换消息对象
 */
function transformMessage(data: any): Message {
  let metadata: MessageMetadata | undefined;
  if (data.metadata) {
    try {
      metadata =
        typeof data.metadata === "string"
          ? JSON.parse(data.metadata)
          : data.metadata;
    } catch (e) {
      console.error("[ConversationService] 解析 metadata 失败:", e);
    }
  }

  return {
    id: data.id,
    conversationId: data.conversation_id || data.conversationId,
    role: data.role,
    content: data.content,
    tokensUsed: data.tokens_used || data.tokensUsed,
    timestamp: data.timestamp,
    createdAt: data.created_at || data.createdAt,
    metadata,
  };
}

export default {
  getConversationList,
  getGroupedConversations,
  getConversationById,
  createConversation,
  updateConversation,
  updateConversationTitle,
  deleteConversation,
  getMessagesByConversationId,
  getRecentMessages,
  addMessage,
  getFirstUserMessage,
  autoSetConversationTitle,
};
