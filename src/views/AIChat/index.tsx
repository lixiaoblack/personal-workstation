/**
 * AIChat AI 聊天页面
 * 与 AI 智能体进行对话交互
 */
import React, { useState, useRef, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionState, MessageType } from "@/types/electron";
import type { ChatResponseMessage } from "@/types/electron";

// 消息类型
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  status?: "sending" | "sent" | "error";
}

// 生成唯一 ID
const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const AIChat: React.FC = () => {
  const { connectionState, sendChat, lastMessage } = useWebSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 处理收到的消息
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === MessageType.CHAT_RESPONSE) {
      const response = lastMessage as ChatResponseMessage;
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: response.content,
          timestamp: response.timestamp,
          status: "sent",
        },
      ]);
      setIsSending(false);
    }
  }, [lastMessage]);

  // 发送消息
  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
      status: "sending",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    // 发送到 WebSocket
    const success = sendChat(content);
    if (!success) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id ? { ...m, status: "error" } : m
        )
      );
      setIsSending(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 连接状态指示器
  const renderConnectionStatus = () => {
    const statusMap: Record<ConnectionState, { color: string; text: string }> = {
      [ConnectionState.CONNECTED]: { color: "bg-success", text: "已连接" },
      [ConnectionState.CONNECTING]: { color: "bg-warning animate-pulse", text: "连接中" },
      [ConnectionState.DISCONNECTED]: { color: "bg-error", text: "已断开" },
      [ConnectionState.RECONNECTING]: { color: "bg-warning animate-pulse", text: "重连中" },
      [ConnectionState.ERROR]: { color: "bg-error", text: "连接错误" },
    };
    const status = statusMap[connectionState];

    return (
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
        <span>{status.text}</span>
      </div>
    );
  };

  // 渲染消息
  const renderMessage = (message: Message) => {
    const isUser = message.role === "user";

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}
        >
          {!isUser && (
            <div className="flex items-center gap-2 mb-1">
              <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-xs text-primary">
                  smart_toy
                </span>
              </div>
              <span className="text-xs text-text-tertiary">AI 助手</span>
            </div>
          )}
          <div
            className={`px-4 py-2.5 rounded-2xl ${
              isUser
                ? "bg-primary text-white rounded-br-md"
                : "bg-bg-secondary border border-border text-text-primary rounded-bl-md"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className={`flex items-center gap-2 mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
            <span className="text-[10px] text-text-tertiary">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            {message.status === "sending" && (
              <span className="material-symbols-outlined text-xs text-text-tertiary animate-spin">
                progress_activity
              </span>
            )}
            {message.status === "error" && (
              <span className="text-xs text-error">发送失败</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 空状态
  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl text-primary">
          smart_toy
        </span>
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        开始与 AI 对话
      </h3>
      <p className="text-sm text-text-tertiary max-w-md">
        我是一个智能助手，可以帮助您解答问题、编写代码、分析数据等。
        在下方输入框中输入您的问题开始对话。
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">smart_toy</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">AI 助手</h1>
            {renderConnectionStatus()}
          </div>
        </div>
        <button className="p-2 hover:bg-bg-hover rounded-lg transition-colors text-text-secondary">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div className="px-6 py-4 border-t border-border bg-bg-secondary">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/50 outline-none transition-all text-text-primary placeholder:text-text-tertiary"
              rows={1}
              style={{ maxHeight: "120px" }}
              disabled={connectionState !== ConnectionState.CONNECTED || isSending}
            />
          </div>
          <button
            className={`p-3 rounded-xl transition-all flex items-center justify-center ${
              inputValue.trim() && connectionState === ConnectionState.CONNECTED && !isSending
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
            }`}
            onClick={handleSend}
            disabled={!inputValue.trim() || connectionState !== ConnectionState.CONNECTED || isSending}
          >
            {isSending ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">send</span>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
          <span>按 Enter 发送，Shift+Enter 换行</span>
          <span>{inputValue.length} 字符</span>
        </div>
      </div>
    </div>
  );
};

export { AIChat };
