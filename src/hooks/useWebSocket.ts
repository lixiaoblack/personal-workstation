/**
 * useWebSocket Hook
 * 用于渲染进程连接 WebSocket 服务器
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { MessageType, ConnectionState, createMessage } from "@/types/electron";
import type {
  WebSocketMessage,
  ChatMessage,
  AgentChatMessage,
  HistoryMessageItem,
} from "@/types/electron";

interface UseWebSocketOptions {
  autoConnect?: boolean; // 自动连接，默认 true
  reconnectAttempts?: number; // 重连次数，默认 5
  reconnectInterval?: number; // 重连间隔（毫秒），默认 3000
}

interface SendChatOptions {
  content: string;
  conversationId?: string;
  modelId?: number;
  history?: HistoryMessageItem[];
  stream?: boolean;
  knowledgeId?: string; // 知识库 ID（可选，用于知识检索）
  knowledgeMetadata?: Record<string, { name: string; description: string }>; // 知识库元数据
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  clientId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: WebSocketMessage) => boolean;
  sendChat: (options: SendChatOptions) => boolean;
  sendAgentChat: (options: SendChatOptions) => boolean;
  lastMessage: WebSocketMessage | null;
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理重连定时器
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // 连接 WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);

      // 获取服务器端口
      const wsInfo = await window.electronAPI.getWsInfo();
      if (!wsInfo.running) {
        throw new Error("WebSocket 服务器未运行");
      }

      const ws = new WebSocket(`ws://127.0.0.1:${wsInfo.port}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WebSocket] 已连接");
        setConnectionState(ConnectionState.CONNECTED);
        reconnectCountRef.current = 0;
      };

      ws.onclose = () => {
        console.log("[WebSocket] 连接已关闭");
        setConnectionState(ConnectionState.DISCONNECTED);
        setClientId(null);

        // 尝试重连
        if (reconnectCountRef.current < reconnectAttempts) {
          setConnectionState(ConnectionState.RECONNECTING);
          reconnectCountRef.current++;
          console.log(
            `[WebSocket] 尝试重连 (${reconnectCountRef.current}/${reconnectAttempts})`
          );
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] 连接错误:", error);
        setConnectionState(ConnectionState.ERROR);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(message);

          // 处理连接确认
          if (message.type === MessageType.CONNECTION_ACK) {
            const ackMsg = message as Extract<
              WebSocketMessage,
              { type: MessageType.CONNECTION_ACK }
            >;
            setClientId(ackMsg.clientId);
            console.log(`[WebSocket] 客户端 ID: ${ackMsg.clientId}`);
          }

          // 处理心跳响应
          if (message.type === MessageType.PONG) {
            // 心跳响应，无需特殊处理
          }
        } catch (error) {
          console.error("[WebSocket] 消息解析错误:", error);
        }
      };
    } catch (error) {
      console.error("[WebSocket] 连接失败:", error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [reconnectAttempts, reconnectInterval]);

  // 断开连接
  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState(ConnectionState.DISCONNECTED);
    setClientId(null);
  }, [clearReconnectTimer]);

  // 发送消息
  const send = useCallback((message: WebSocketMessage): boolean => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.error("[WebSocket] 连接未建立，无法发送消息");
      return false;
    }
    wsRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  // 发送聊天消息
  const sendChat = useCallback(
    (options: SendChatOptions): boolean => {
      const {
        content,
        conversationId,
        modelId,
        history,
        stream = true,
      } = options;
      const message = createMessage<ChatMessage>(MessageType.CHAT_MESSAGE, {
        content,
        conversationId,
        modelId,
        history,
        stream,
      });
      return send(message);
    },
    [send]
  );

  // 发送 Agent 聊天消息（触发 ReAct 智能体）
  const sendAgentChat = useCallback(
    (options: SendChatOptions): boolean => {
      const { content, conversationId, modelId, history, knowledgeId, knowledgeMetadata } =
        options;
      const message = createMessage<AgentChatMessage>(MessageType.AGENT_CHAT, {
        content,
        conversationId,
        modelId,
        history,
        knowledgeId,
        knowledgeMetadata,
      });
      return send(message);
    },
    [send]
  );

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connectionState,
    clientId,
    connect,
    disconnect,
    send,
    sendChat,
    sendAgentChat,
    lastMessage,
  };
}

// 导出类型
export type { UseWebSocketReturn };
