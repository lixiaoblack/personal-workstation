/**
 * WebSocket 服务器服务
 * 用于渲染进程和 Python 智能体服务之间的通信
 */
import { WebSocketServer, WebSocket } from "ws";
import type { AddressInfo } from "net";
import {
  MessageType,
  type WebSocketMessage,
  type WebSocketClientInfo,
  type ClientType,
  type ChatMessage,
  type AgentChatMessage,
  type OllamaStatusResponseMessage,
  type OllamaModelsResponseMessage,
  type OllamaTestResponseMessage,
  type SkillListResponseMessage,
  type SkillExecuteResponseMessage,
  type SkillReloadResponseMessage,
  type KnowledgeSyncCreateMessage,
  type KnowledgeSyncCreateResponseMessage,
  type KnowledgeSyncDeleteMessage,
  type KnowledgeSyncDeleteResponseMessage,
  type FrontendBridgeRequestMessage,
  type FrontendBridgeResponseMessage,
  type FrontendBridgeListMessage,
  type FrontendBridgeListResponseMessage,
  createMessage,
} from "../types/websocket";
import { getEnabledModelConfigs } from "./modelConfigService";
import * as knowledgeService from "./knowledgeService";
import {
  executeBridgeMethod,
  getBridgeMethods,
} from "./bridgeRegistry";
import type { OnlineModelConfig, OllamaModelConfig } from "../types/model";
import type {
  OllamaStatus,
  OllamaModel,
  OllamaTestResult,
} from "../types/ollama";

// WebSocket 服务器配置
interface WebSocketServerConfig {
  port?: number; // 端口号，默认自动分配
  host?: string; // 主机地址
  heartbeatInterval?: number; // 心跳间隔（毫秒），默认 30 秒
}

// WebSocket 服务器实例
let wss: WebSocketServer | null = null;
let serverPort: number = 0;

// 客户端连接映射
const clients: Map<WebSocket, WebSocketClientInfo> = new Map();

// Python 客户端连接（用于消息转发）
let pythonClient: WebSocket | null = null;

// 心跳定时器
let heartbeatTimer: NodeJS.Timeout | null = null;

// Ollama 请求响应 Promise 缓存
interface PendingOllamaRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: NodeJS.Timeout;
}
const pendingOllamaRequests: Map<string, PendingOllamaRequest> = new Map();

// Skills 请求响应 Promise 缓存
interface PendingSkillRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: NodeJS.Timeout;
}
const pendingSkillRequests: Map<string, PendingSkillRequest> = new Map();

// Knowledge 请求响应 Promise 缓存
interface PendingKnowledgeRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: NodeJS.Timeout;
}
const pendingKnowledgeRequests: Map<string, PendingKnowledgeRequest> =
  new Map();

// Memory 请求响应 Promise 缓存
interface PendingMemoryRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: NodeJS.Timeout;
}
const pendingMemoryRequests: Map<string, PendingMemoryRequest> = new Map();

// Ollama 请求超时时间（毫秒）
const OLLAMA_REQUEST_TIMEOUT = 30000;

// Skills 请求超时时间（毫秒）
const SKILL_REQUEST_TIMEOUT = 30000;

// Knowledge 请求超时时间（毫秒）
const KNOWLEDGE_REQUEST_TIMEOUT = 60000; // 文档处理可能需要更长时间

// Memory 请求超时时间（毫秒）
const MEMORY_REQUEST_TIMEOUT = 60000; // 摘要生成可能需要较长时间

// 默认配置
const DEFAULT_CONFIG: Required<WebSocketServerConfig> = {
  port: 0, // 0 表示自动分配端口
  host: "127.0.0.1",
  heartbeatInterval: 30000, // 30 秒
};

/**
 * 创建并启动 WebSocket 服务器
 */
export function startWebSocketServer(
  config: WebSocketServerConfig = {}
): Promise<{ port: number; host: string }> {
  return new Promise((resolve, reject) => {
    if (wss) {
      resolve({ port: serverPort, host: DEFAULT_CONFIG.host });
      return;
    }

    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    wss = new WebSocketServer({
      port: finalConfig.port,
      host: finalConfig.host,
    });

    wss.on("error", (error) => {
      console.error("[WebSocket] 服务器错误:", error);
      reject(error);
    });

    wss.on("listening", () => {
      const address = wss?.address() as AddressInfo;
      serverPort = address.port;
      console.log(
        `[WebSocket] 服务器已启动: ws://${finalConfig.host}:${serverPort}`
      );

      // 启动心跳检测
      startHeartbeat(finalConfig.heartbeatInterval);

      resolve({ port: serverPort, host: finalConfig.host });
    });

    wss.on("connection", (ws: WebSocket) => {
      const clientId = generateClientId();
      const clientInfo: WebSocketClientInfo = {
        id: clientId,
        clientType: "renderer", // 默认为渲染进程连接
        isRenderer: true,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
      };

      clients.set(ws, clientInfo);
      console.log(
        `[WebSocket] 客户端已连接: ${clientId}, 当前连接数: ${clients.size}`
      );

      // 发送连接确认
      const ackMessage = createMessage(MessageType.CONNECTION_ACK, {
        clientId,
      });
      ws.send(JSON.stringify(ackMessage));

      // 处理消息
      ws.on("message", (data: Buffer) => {
        handleClientMessage(ws, data);
      });

      // 处理断开连接
      ws.on("close", () => {
        const info = clients.get(ws);
        console.log(
          `[WebSocket] 客户端已断开: ${info?.id}, 当前连接数: ${
            clients.size - 1
          }`
        );

        // 清理 Python 客户端引用
        if (pythonClient === ws) {
          pythonClient = null;
          console.log("[WebSocket] Python 客户端已断开");
          // 通知所有渲染进程
          broadcastPythonStatus("disconnected");
        }

        clients.delete(ws);
      });

      // 处理错误
      ws.on("error", (error) => {
        console.error(`[WebSocket] 客户端错误: ${clientId}`, error);
      });

      // 心跳检测
      ws.on("pong", () => {
        const info = clients.get(ws);
        if (info) {
          info.lastActivity = Date.now();
        }
      });
    });
  });
}

/**
 * 停止 WebSocket 服务器
 */
export async function stopWebSocketServer(): Promise<void> {
  if (!wss) return;

  // 停止心跳定时器
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  // 关闭所有客户端连接
  Array.from(clients.keys()).forEach((ws) => {
    ws.close();
  });
  clients.clear();

  // 关闭服务器
  return new Promise((resolve) => {
    wss?.close(() => {
      console.log("[WebSocket] 服务器已停止");
      wss = null;
      serverPort = 0;
      resolve();
    });
  });
}

/**
 * 获取服务器信息
 */
export function getServerInfo(): {
  running: boolean;
  port: number;
  clientCount: number;
  pythonConnected: boolean;
} {
  return {
    running: wss !== null,
    port: serverPort,
    clientCount: clients.size,
    pythonConnected: isPythonConnected(),
  };
}

/**
 * 向所有客户端广播消息
 */
export function broadcast(message: WebSocketMessage): void {
  const data = JSON.stringify(message);
  Array.from(clients.keys()).forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

/**
 * 向所有渲染进程客户端广播消息
 */
function broadcastToRenderers(message: WebSocketMessage): void {
  const data = JSON.stringify(message);
  Array.from(clients.entries()).forEach(([ws, info]) => {
    if (info.clientType === "renderer" && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

/**
 * 广播 Python 服务状态
 */
function broadcastPythonStatus(status: "connected" | "disconnected"): void {
  const message = createMessage(MessageType.PYTHON_STATUS, {
    status: status === "connected" ? "running" : "stopped",
  });
  broadcastToRenderers(message);
}

/**
 * 同步模型配置到 Python 服务
 */
export function syncModelConfigsToPython(): void {
  if (!pythonClient || pythonClient.readyState !== WebSocket.OPEN) {
    console.log("[WebSocket] Python 客户端未连接，无法同步模型配置");
    return;
  }

  try {
    // 获取已启用的模型配置
    const configs = getEnabledModelConfigs();

    // 发送模型配置同步消息
    const message = createMessage("model_config_sync" as MessageType, {
      configs: configs.map((config) => {
        // 根据提供商类型提取不同字段
        const baseFields = {
          id: config.id,
          provider: config.provider,
          modelId: config.modelId,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
        };

        if (config.provider === "ollama") {
          const ollamaConfig = config as OllamaModelConfig;
          return {
            ...baseFields,
            host: ollamaConfig.host,
          };
        } else {
          const onlineConfig = config as OnlineModelConfig;
          return {
            ...baseFields,
            apiKey: onlineConfig.apiKey,
            apiBaseUrl: onlineConfig.apiBaseUrl,
          };
        }
      }),
    });

    pythonClient.send(JSON.stringify(message));
    console.log(
      `[WebSocket] 已同步 ${configs.length} 个模型配置到 Python 服务`
    );
  } catch (error) {
    console.error("[WebSocket] 同步模型配置失败:", error);
  }
}

/**
 * 向特定客户端发送消息
 */
export function sendToClient(
  clientId: string,
  message: WebSocketMessage
): boolean {
  const entries = Array.from(clients.entries());
  for (const [ws, info] of entries) {
    if (info.id === clientId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
  }
  return false;
}

/**
 * 检查 Python 客户端是否已连接
 */
export function isPythonConnected(): boolean {
  return pythonClient !== null && pythonClient.readyState === WebSocket.OPEN;
}

/**
 * 处理客户端消息
 */
async function handleClientMessage(ws: WebSocket, data: Buffer): Promise<void> {
  const info = clients.get(ws);
  if (info) {
    info.lastActivity = Date.now();
  }

  try {
    const message = JSON.parse(data.toString()) as WebSocketMessage;
    console.log(`[WebSocket] 收到消息: ${message.type}`, message.id || "");

    // 处理心跳
    if (message.type === MessageType.PING) {
      const pongMessage = createMessage(MessageType.PONG, {});
      ws.send(JSON.stringify(pongMessage));
      return;
    }

    // 处理客户端标识
    if (message.type === MessageType.CLIENT_IDENTIFY) {
      const identifyMsg = message as Extract<
        WebSocketMessage,
        { type: MessageType.CLIENT_IDENTIFY }
      >;
      const clientType = identifyMsg.clientType as ClientType;

      // 更新客户端信息
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        clientInfo.clientType = clientType;
        clientInfo.isRenderer = clientType === "renderer";
        clients.set(ws, clientInfo);
      }

      // 如果是 Python 客户端，保存引用
      if (clientType === "python_agent") {
        pythonClient = ws;
        console.log("[WebSocket] Python 智能体已连接");
        // 通知所有渲染进程
        broadcastPythonStatus("connected");

        // 同步已启用的模型配置到 Python 服务
        syncModelConfigsToPython();
      }

      return;
    }

    // 处理聊天消息 - 转发给 Python 服务或回显
    if (message.type === MessageType.CHAT_MESSAGE) {
      // 如果有 Python 客户端连接，转发消息
      if (pythonClient && pythonClient.readyState === WebSocket.OPEN) {
        pythonClient.send(JSON.stringify(message));
        console.log("[WebSocket] 消息已转发给 Python 服务");
      } else {
        // 没有连接时返回提示
        const response = createMessage(MessageType.CHAT_RESPONSE, {
          content: "Python 服务未连接，消息无法处理。请先启动 Python 服务。",
          conversationId: (message as ChatMessage).conversationId,
          success: false,
        });
        ws.send(JSON.stringify(response));
      }
      return;
    }

    // 处理 Agent 聊天消息 - 转发给 Python 服务
    if (message.type === MessageType.AGENT_CHAT) {
      if (pythonClient && pythonClient.readyState === WebSocket.OPEN) {
        pythonClient.send(JSON.stringify(message));
        console.log("[WebSocket] Agent 消息已转发给 Python 服务");
      } else {
        const response = createMessage(MessageType.CHAT_ERROR, {
          error:
            "Python 服务未连接，Agent 消息无法处理。请先启动 Python 服务。",
          conversationId: (message as AgentChatMessage).conversationId,
        });
        ws.send(JSON.stringify(response));
      }
      return;
    }

    // 处理来自 Python 的响应 - 转发给对应的渲染进程
    if (
      message.type === MessageType.CHAT_RESPONSE ||
      message.type === MessageType.CHAT_STREAM_START ||
      message.type === MessageType.CHAT_STREAM_CHUNK ||
      message.type === MessageType.CHAT_STREAM_END ||
      message.type === MessageType.CHAT_ERROR ||
      message.type === MessageType.AGENT_STEP ||
      message.type === MessageType.AGENT_THOUGHT ||
      message.type === MessageType.AGENT_TOOL_CALL ||
      message.type === MessageType.AGENT_TOOL_RESULT
    ) {
      const clientInfo = clients.get(ws);
      // 确保消息来自 Python 客户端
      if (clientInfo?.clientType === "python_agent") {
        // 广播给所有渲染进程客户端
        broadcastToRenderers(message);
      }
      return;
    }

    // 处理来自 Python 的 Ollama 响应
    if (
      message.type === MessageType.OLLAMA_STATUS_RESPONSE ||
      message.type === MessageType.OLLAMA_MODELS_RESPONSE ||
      message.type === MessageType.OLLAMA_TEST_RESPONSE
    ) {
      const clientInfo = clients.get(ws);
      // 确保消息来自 Python 客户端
      if (clientInfo?.clientType === "python_agent") {
        const msgId = message.id;
        if (msgId) {
          const pending = pendingOllamaRequests.get(msgId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingOllamaRequests.delete(msgId);
            pending.resolve(message);
            console.log(`[WebSocket] Ollama 响应已处理: ${msgId}`);
          } else {
            console.warn(`[WebSocket] 未找到对应的 Ollama 请求: ${msgId}`);
          }
        }
      }
      return;
    }

    // 处理来自 Python 的 Skills 响应
    if (
      message.type === MessageType.SKILL_LIST_RESPONSE ||
      message.type === MessageType.SKILL_EXECUTE_RESPONSE ||
      message.type === MessageType.SKILL_RELOAD_RESPONSE
    ) {
      const clientInfo = clients.get(ws);
      // 确保消息来自 Python 客户端
      if (clientInfo?.clientType === "python_agent") {
        const msgId = message.id;
        if (msgId) {
          const pending = pendingSkillRequests.get(msgId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingSkillRequests.delete(msgId);
            pending.resolve(message);
            console.log(`[WebSocket] Skill 响应已处理: ${msgId}`);
          } else {
            console.warn(`[WebSocket] 未找到对应的 Skill 请求: ${msgId}`);
          }
        }
      }
      return;
    }

    // 处理来自 Python 的 Knowledge 响应
    if (
      message.type === MessageType.KNOWLEDGE_CREATE_RESPONSE ||
      message.type === MessageType.KNOWLEDGE_DELETE_RESPONSE ||
      message.type === MessageType.KNOWLEDGE_LIST_RESPONSE ||
      message.type === MessageType.KNOWLEDGE_GET_RESPONSE ||
      message.type === MessageType.KNOWLEDGE_ADD_DOCUMENT_RESPONSE ||
      message.type === MessageType.KNOWLEDGE_REMOVE_DOCUMENT_RESPONSE ||
      message.type === MessageType.KNOWLEDGE_SEARCH_RESPONSE ||
      message.type === MessageType.KNOWLEDGE_LIST_DOCUMENTS_RESPONSE
    ) {
      const clientInfo = clients.get(ws);
      // 确保消息来自 Python 客户端
      if (clientInfo?.clientType === "python_agent") {
        const msgId = message.id;
        if (msgId) {
          const pending = pendingKnowledgeRequests.get(msgId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingKnowledgeRequests.delete(msgId);
            pending.resolve(message);
            console.log(`[WebSocket] Knowledge 响应已处理: ${msgId}`);
          } else {
            console.warn(`[WebSocket] 未找到对应的 Knowledge 请求: ${msgId}`);
          }
        }
      }
      return;
    }

    // 处理来自 Python 的 Knowledge Sync 请求（Agent 调用时同步 SQLite）
    if (
      message.type === MessageType.KNOWLEDGE_SYNC_CREATE ||
      message.type === MessageType.KNOWLEDGE_SYNC_DELETE
    ) {
      const clientInfo = clients.get(ws);
      // 确保消息来自 Python 客户端
      if (clientInfo?.clientType === "python_agent") {
        console.log(`[WebSocket] 收到 Knowledge Sync 请求: ${message.type}`);

        if (message.type === MessageType.KNOWLEDGE_SYNC_CREATE) {
          // 同步创建知识库 SQLite 记录
          const syncMsg = message as KnowledgeSyncCreateMessage;
          try {
            const knowledge = knowledgeService.createKnowledgeWithId(
              syncMsg.knowledgeId,
              syncMsg.name,
              syncMsg.description || "",
              syncMsg.embeddingModel || "ollama",
              syncMsg.embeddingModelName || "nomic-embed-text"
            );

            // 发送响应
            const response: KnowledgeSyncCreateResponseMessage = {
              type: MessageType.KNOWLEDGE_SYNC_CREATE_RESPONSE,
              id: syncMsg.id,
              timestamp: Date.now(),
              success: !!knowledge,
              knowledgeId: syncMsg.knowledgeId,
              error: knowledge ? undefined : "创建知识库记录失败",
            };
            ws.send(JSON.stringify(response));
            console.log(`[WebSocket] Knowledge Sync Create 成功: ${syncMsg.knowledgeId}`);
          } catch (error) {
            const response: KnowledgeSyncCreateResponseMessage = {
              type: MessageType.KNOWLEDGE_SYNC_CREATE_RESPONSE,
              id: syncMsg.id,
              timestamp: Date.now(),
              success: false,
              knowledgeId: syncMsg.knowledgeId,
              error: String(error),
            };
            ws.send(JSON.stringify(response));
            console.error(`[WebSocket] Knowledge Sync Create 失败:`, error);
          }
        } else if (message.type === MessageType.KNOWLEDGE_SYNC_DELETE) {
          // 同步删除知识库 SQLite 记录
          const syncMsg = message as KnowledgeSyncDeleteMessage;
          try {
            const success = await knowledgeService.deleteKnowledge(syncMsg.knowledgeId);

            const response: KnowledgeSyncDeleteResponseMessage = {
              type: MessageType.KNOWLEDGE_SYNC_DELETE_RESPONSE,
              id: syncMsg.id,
              timestamp: Date.now(),
              success,
              knowledgeId: syncMsg.knowledgeId,
              error: success ? undefined : "删除知识库记录失败",
            };
            ws.send(JSON.stringify(response));
            console.log(`[WebSocket] Knowledge Sync Delete 成功: ${syncMsg.knowledgeId}`);
          } catch (error) {
            const response: KnowledgeSyncDeleteResponseMessage = {
              type: MessageType.KNOWLEDGE_SYNC_DELETE_RESPONSE,
              id: syncMsg.id,
              timestamp: Date.now(),
              success: false,
              knowledgeId: syncMsg.knowledgeId,
              error: String(error),
            };
            ws.send(JSON.stringify(response));
            console.error(`[WebSocket] Knowledge Sync Delete 失败:`, error);
          }
        }
      }
      return;
    }

    // 处理来自 Python 的 Memory 响应
    if (
      message.type === MessageType.MEMORY_GENERATE_SUMMARY_RESPONSE ||
      message.type === MessageType.MEMORY_EXTRACT_RESPONSE
    ) {
      const clientInfo = clients.get(ws);
      // 确保消息来自 Python 客户端
      if (clientInfo?.clientType === "python_agent") {
        const msgId = message.id;
        if (msgId) {
          const pending = pendingMemoryRequests.get(msgId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingMemoryRequests.delete(msgId);
            pending.resolve(message);
            console.log(`[WebSocket] Memory 响应已处理: ${msgId}`);
          } else {
            console.warn(`[WebSocket] 未找到对应的 Memory 请求: ${msgId}`);
          }
        }
      }
      return;
    }

    // 处理来自 Python 的 Frontend Bridge 请求
    if (
      message.type === MessageType.FRONTEND_BRIDGE_REQUEST ||
      message.type === MessageType.FRONTEND_BRIDGE_LIST
    ) {
      const clientInfo = clients.get(ws);
      // 确保消息来自 Python 客户端
      if (clientInfo?.clientType === "python_agent") {
        console.log(`[WebSocket] 收到 Frontend Bridge 请求: ${message.type}`);

        if (message.type === MessageType.FRONTEND_BRIDGE_REQUEST) {
          // 执行桥接方法
          const bridgeMsg = message as FrontendBridgeRequestMessage;
          handleFrontendBridgeRequest(ws, bridgeMsg);
        } else {
          // 返回可用方法列表
          const listMsg = message as FrontendBridgeListMessage;
          handleFrontendBridgeList(ws, listMsg);
        }
      }
      return;
    }
  } catch (error) {
    console.error("[WebSocket] 消息解析错误:", error);
  }
}

/**
 * 启动心跳检测
 */
function startHeartbeat(interval: number): void {
  heartbeatTimer = setInterval(() => {
    const entries = Array.from(clients.entries());
    for (const [ws, info] of entries) {
      // 检查是否超时（超过 2 个心跳周期未活动则断开）
      if (Date.now() - info.lastActivity > interval * 2) {
        console.log(`[WebSocket] 客户端超时断开: ${info.id}`);
        ws.terminate();
        clients.delete(ws);
        continue;
      }

      // 发送心跳
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }
  }, interval);
}

/**
 * 生成客户端 ID
 */
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成消息 ID
 */
function generateMessageId(): string {
  return `ollama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 发送 Ollama 请求并等待响应
 */
async function sendOllamaRequest<T>(
  messageType: MessageType,
  host?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!pythonClient || pythonClient.readyState !== WebSocket.OPEN) {
      reject(new Error("Python 服务未连接"));
      return;
    }

    const messageId = generateMessageId();
    const message = createMessage(messageType as never, { host });

    // 设置超时
    const timeout = setTimeout(() => {
      pendingOllamaRequests.delete(messageId);
      reject(new Error("请求超时"));
    }, OLLAMA_REQUEST_TIMEOUT);

    // 存储等待响应的 Promise
    pendingOllamaRequests.set(messageId, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
    });

    // 发送消息（使用生成的 messageId）
    const messageWithId = {
      ...message,
      id: messageId,
    };
    pythonClient.send(JSON.stringify(messageWithId));
  });
}

/**
 * 获取 Ollama 服务状态
 */
export async function getOllamaStatus(host?: string): Promise<OllamaStatus> {
  try {
    const response = await sendOllamaRequest<OllamaStatusResponseMessage>(
      MessageType.OLLAMA_STATUS,
      host
    );
    return {
      running: response.running,
      host: response.host,
      version: response.version,
      error: response.error,
      models:
        response.models?.map((m) => ({
          name: m.name,
          modifiedAt: m.modifiedAt,
          size: m.size,
          sizeGB: m.sizeGB,
          sizeMB: m.sizeMB,
          digest: m.digest,
        })) || [],
      modelCount: response.modelCount || 0,
    };
  } catch (error) {
    const defaultHost = host || "http://127.0.0.1:11434";
    return {
      running: false,
      host: defaultHost,
      error: error instanceof Error ? error.message : "未知错误",
      models: [],
      modelCount: 0,
    };
  }
}

/**
 * 获取 Ollama 模型列表
 */
export async function getOllamaModels(host?: string): Promise<OllamaModel[]> {
  try {
    const response = await sendOllamaRequest<OllamaModelsResponseMessage>(
      MessageType.OLLAMA_MODELS,
      host
    );
    if (response.success && response.models) {
      return response.models.map((m) => ({
        name: m.name,
        modifiedAt: m.modifiedAt,
        size: m.size,
        sizeGB: m.sizeGB,
        sizeMB: m.sizeMB,
        digest: m.digest,
      }));
    }
    return [];
  } catch (error) {
    console.error("[WebSocket] 获取 Ollama 模型列表失败:", error);
    return [];
  }
}

/**
 * 测试 Ollama 连接
 */
export async function testOllamaConnection(
  host?: string
): Promise<OllamaTestResult> {
  try {
    const response = await sendOllamaRequest<OllamaTestResponseMessage>(
      MessageType.OLLAMA_TEST,
      host
    );
    return {
      success: response.success,
      latency: response.latency,
      host: response.host,
      modelCount: response.modelCount,
      error: response.error,
    };
  } catch (error) {
    return {
      success: false,
      host: host || "http://127.0.0.1:11434",
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

// ==================== Skills 技能相关 ====================

/**
 * 发送 Skills 请求并等待响应
 */
async function sendSkillRequest<T>(
  messageType: MessageType,
  data?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!pythonClient || pythonClient.readyState !== WebSocket.OPEN) {
      reject(new Error("Python 服务未连接"));
      return;
    }

    const messageId = `skill_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const message = createMessage(messageType as never, data || {});

    // 设置超时
    const timeout = setTimeout(() => {
      pendingSkillRequests.delete(messageId);
      reject(new Error("请求超时"));
    }, SKILL_REQUEST_TIMEOUT);

    // 存储等待响应的 Promise
    pendingSkillRequests.set(messageId, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
    });

    // 发送消息（使用生成的 messageId）
    const messageWithId = {
      ...message,
      id: messageId,
    };
    pythonClient.send(JSON.stringify(messageWithId));
  });
}

/**
 * 获取技能列表
 */
export async function getSkillList(): Promise<{
  success: boolean;
  skills: Array<{
    name: string;
    displayName: string;
    description: string;
    type: string;
    trigger: string;
    enabled: boolean;
    tags: string[];
    icon?: string;
    version: string;
    author: string;
  }>;
  count: number;
  error?: string;
}> {
  try {
    const response = await sendSkillRequest<SkillListResponseMessage>(
      MessageType.SKILL_LIST
    );
    return {
      success: response.success,
      skills: response.skills,
      count: response.count,
      error: response.error,
    };
  } catch (error) {
    return {
      success: false,
      skills: [],
      count: 0,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 执行技能
 */
export async function executeSkill(
  skillName: string,
  parameters?: Record<string, unknown>
): Promise<{
  success: boolean;
  skillName: string;
  result?: string;
  error?: string;
}> {
  try {
    const response = await sendSkillRequest<SkillExecuteResponseMessage>(
      MessageType.SKILL_EXECUTE,
      { skillName, parameters: parameters || {} }
    );
    return {
      success: response.success,
      skillName: response.skillName,
      result: response.result,
      error: response.error,
    };
  } catch (error) {
    return {
      success: false,
      skillName,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 重载技能
 */
export async function reloadSkills(skillName?: string): Promise<{
  success: boolean;
  skillName?: string;
  message?: string;
  count?: number;
  error?: string;
}> {
  try {
    const response = await sendSkillRequest<SkillReloadResponseMessage>(
      MessageType.SKILL_RELOAD,
      skillName ? { skillName } : {}
    );
    return {
      success: response.success,
      skillName: response.skillName,
      message: response.message,
      count: response.count,
      error: response.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

// ==================== Knowledge 知识库相关 ====================

/**
 * 发送 Knowledge 请求并等待响应
 */
export async function sendKnowledgeRequest<T>(
  messageType: MessageType,
  data?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!pythonClient || pythonClient.readyState !== WebSocket.OPEN) {
      reject(new Error("Python 服务未连接"));
      return;
    }

    const messageId = `kb_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const message = createMessage(messageType as never, data || {});

    // 设置超时
    const timeout = setTimeout(() => {
      pendingKnowledgeRequests.delete(messageId);
      reject(new Error("请求超时"));
    }, KNOWLEDGE_REQUEST_TIMEOUT);

    // 存储等待响应的 Promise
    pendingKnowledgeRequests.set(messageId, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
    });

    // 发送消息（使用生成的 messageId）
    const messageWithId = {
      ...message,
      id: messageId,
    };
    pythonClient.send(JSON.stringify(messageWithId));
  });
}

// ==================== Memory 记忆相关 ====================

/**
 * 发送 Memory 请求并等待响应
 */
export async function sendMemoryRequest<T>(
  messageType: MessageType,
  data?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!pythonClient || pythonClient.readyState !== WebSocket.OPEN) {
      reject(new Error("Python 服务未连接"));
      return;
    }

    const messageId = `mem_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const message = createMessage(messageType as never, data || {});

    // 设置超时
    const timeout = setTimeout(() => {
      pendingMemoryRequests.delete(messageId);
      reject(new Error("请求超时"));
    }, MEMORY_REQUEST_TIMEOUT);

    // 存储等待响应的 Promise
    pendingMemoryRequests.set(messageId, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout,
    });

    // 发送消息（使用生成的 messageId）
    const messageWithId = {
      ...message,
      id: messageId,
    };
    pythonClient.send(JSON.stringify(messageWithId));
  });
}

/**
 * 生成对话摘要
 */
export async function generateSummary(
  conversationId: number,
  messages: Array<{ role: string; content: string }>,
  modelId?: number
): Promise<{
  success: boolean;
  summary?: string;
  keyTopics?: string[];
  pendingTasks?: string[];
  error?: string;
}> {
  try {
    const response = await sendMemoryRequest<{
      success: boolean;
      conversationId: number;
      summary?: string;
      keyTopics?: string[];
      pendingTasks?: string[];
      error?: string;
    }>(MessageType.MEMORY_GENERATE_SUMMARY, {
      conversationId,
      messages,
      modelId,
    });
    return {
      success: response.success,
      summary: response.summary,
      keyTopics: response.keyTopics,
      pendingTasks: response.pendingTasks,
      error: response.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

// ==================== Frontend Bridge 前端桥接相关 ====================

/**
 * 处理桥接方法调用请求
 */
async function handleFrontendBridgeRequest(
  ws: WebSocket,
  message: FrontendBridgeRequestMessage
): Promise<void> {
  try {
    const { service, method, params, requestId } = message;

    console.log(`[WebSocket] 执行桥接方法: ${service}.${method}`, params);

    // 执行方法
    const result = await executeBridgeMethod(service, method, params);

    // 发送响应
    const response: FrontendBridgeResponseMessage = {
      type: MessageType.FRONTEND_BRIDGE_RESPONSE,
      id: message.id,
      timestamp: Date.now(),
      requestId,
      success: result.success,
      result: result.result,
      error: result.error,
    };

    ws.send(JSON.stringify(response));
    console.log(`[WebSocket] 桥接方法执行完成: ${service}.${method}`);
  } catch (error) {
    console.error("[WebSocket] 桥接方法执行失败:", error);

    const response: FrontendBridgeResponseMessage = {
      type: MessageType.FRONTEND_BRIDGE_RESPONSE,
      id: message.id,
      timestamp: Date.now(),
      requestId: message.requestId,
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };

    ws.send(JSON.stringify(response));
  }
}

/**
 * 处理获取可用方法列表请求
 */
function handleFrontendBridgeList(
  ws: WebSocket,
  message: FrontendBridgeListMessage
): void {
  try {
    const methods = getBridgeMethods(message.service);

    const response: FrontendBridgeListResponseMessage = {
      type: MessageType.FRONTEND_BRIDGE_LIST_RESPONSE,
      id: message.id,
      timestamp: Date.now(),
      success: true,
      methods,
      count: methods.length,
    };

    ws.send(JSON.stringify(response));
    console.log(`[WebSocket] 返回可用方法列表: ${methods.length} 个`);
  } catch (error) {
    console.error("[WebSocket] 获取方法列表失败:", error);

    const response: FrontendBridgeListResponseMessage = {
      type: MessageType.FRONTEND_BRIDGE_LIST_RESPONSE,
      id: message.id,
      timestamp: Date.now(),
      success: false,
      methods: [],
      count: 0,
      error: error instanceof Error ? error.message : "未知错误",
    };

    ws.send(JSON.stringify(response));
  }
}
