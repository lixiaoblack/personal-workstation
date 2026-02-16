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
  createMessage,
} from "../types/websocket";
import { getEnabledModelConfigs } from "./modelConfigService";
import type {
  OnlineModelConfig,
  OllamaModelConfig,
} from "../types/model";

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
      configs: configs.map(config => {
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
    console.log(`[WebSocket] 已同步 ${configs.length} 个模型配置到 Python 服务`);
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
function handleClientMessage(ws: WebSocket, data: Buffer): void {
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

    // 处理来自 Python 的响应 - 转发给对应的渲染进程
    if (
      message.type === MessageType.CHAT_RESPONSE ||
      message.type === MessageType.CHAT_STREAM ||
      message.type === MessageType.CHAT_ERROR
    ) {
      const clientInfo = clients.get(ws);
      // 确保消息来自 Python 客户端
      if (clientInfo?.clientType === "python_agent") {
        // 广播给所有渲染进程客户端
        broadcastToRenderers(message);
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
