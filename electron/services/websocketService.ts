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
  createMessage,
} from "../types/websocket";

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
        isRenderer: true, // 默认为渲染进程连接
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
} {
  return {
    running: wss !== null,
    port: serverPort,
    clientCount: clients.size,
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

    // 处理聊天消息 - 简单回显（后续会接入 Python 服务）
    if (message.type === MessageType.CHAT_MESSAGE) {
      const chatMsg = message as Extract<
        WebSocketMessage,
        { type: MessageType.CHAT_MESSAGE }
      >;

      // 模拟响应（后续替换为实际 AI 响应）
      const response = createMessage(MessageType.CHAT_RESPONSE, {
        content: `收到消息: ${chatMsg.content}`,
        conversationId: chatMsg.conversationId,
        success: true,
      });
      ws.send(JSON.stringify(response));
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
