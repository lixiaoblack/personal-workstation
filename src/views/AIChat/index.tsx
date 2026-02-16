/**
 * AIChat AI 聊天页面
 * 基于 ant-design-x 构建的专业 AI 对话界面
 */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionState, MessageType } from "@/types/electron";
import type { ChatResponseMessage } from "@/types/electron";

// 对话历史项
interface ConversationItem {
  id: string;
  title: string;
  time: string;
  messageCount: number;
  timestamp: number;
}

// 消息类型
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// 生成唯一 ID
const generateId = () =>
  `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 格式化日期
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return `${date.getMonth() + 1}天前`;
};

const AIChat: React.FC = () => {
  const navigate = useNavigate();
  const { connectionState, sendChat, lastMessage } = useWebSocket({
    autoConnect: true,
  });

  // 消息列表
  const [messages, setMessages] = useState<Message[]>([]);
  // 输入内容
  const [inputValue, setInputValue] = useState("");
  // 对话历史
  const [conversations] = useState<ConversationItem[]>([
    {
      id: "1",
      title: "如何优化 SQL 查询",
      time: "14:30",
      messageCount: 12,
      timestamp: Date.now(),
    },
    {
      id: "2",
      title: "Python 数据分析脚本",
      time: "09:15",
      messageCount: 5,
      timestamp: Date.now() - 86400000,
    },
    {
      id: "3",
      title: "React 组件优化建议",
      time: "昨天 18:20",
      messageCount: 24,
      timestamp: Date.now() - 86400000,
    },
    {
      id: "4",
      title: "地理空间数据处理流程",
      time: "4天前",
      messageCount: 8,
      timestamp: Date.now() - 345600000,
    },
  ]);
  // 当前选中的对话
  const [activeConversation, setActiveConversation] = useState<string>("1");
  // 当前选中的模型
  const [currentModel, setCurrentModel] = useState("GPT-4o");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 模型列表
  const models = useMemo(
    () => ["GPT-4o", "Claude 3.5", "Qwen-Max", "DeepSeek"],
    []
  );

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
        },
      ]);
    }
  }, [lastMessage]);

  // 发送消息
  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || connectionState !== ConnectionState.CONNECTED) return;

    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // 发送到 WebSocket
    sendChat(content);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 连接状态渲染
  const renderConnectionStatus = () => {
    const statusConfig: Record<
      ConnectionState,
      { color: string; text: string; animate: boolean }
    > = {
      [ConnectionState.CONNECTED]: {
        color: "bg-success",
        text: "已连接",
        animate: false,
      },
      [ConnectionState.CONNECTING]: {
        color: "bg-warning",
        text: "连接中",
        animate: true,
      },
      [ConnectionState.DISCONNECTED]: {
        color: "bg-error",
        text: "已断开",
        animate: false,
      },
      [ConnectionState.RECONNECTING]: {
        color: "bg-warning",
        text: "重连中",
        animate: true,
      },
      [ConnectionState.ERROR]: {
        color: "bg-error",
        text: "连接错误",
        animate: false,
      },
    };
    const config = statusConfig[connectionState];

    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-success/10 rounded-full border border-success/20">
        <span
          className={`flex h-2 w-2 rounded-full ${config.color} ${
            config.animate ? "animate-pulse" : ""
          }`}
        ></span>
        <span className="text-xs text-success font-medium tracking-wide">
          {config.text}
        </span>
      </div>
    );
  };

  // 渲染对话历史侧边栏
  const renderSidebar = () => (
    <aside className="w-72 flex flex-col border-r border-border bg-bg-secondary/50 shrink-0">
      {/* 头部 */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-text-primary font-bold text-sm tracking-wide">
          最近对话
        </h3>
        <button className="text-text-tertiary hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">search</span>
        </button>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {/* 新建对话按钮 */}
        <button className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg border border-dashed border-border hover:border-primary hover:text-primary transition-all text-text-tertiary text-sm">
          <span className="material-symbols-outlined text-lg">add</span>
          <span>新建对话</span>
        </button>

        {/* 今天 */}
        <div className="mb-4">
          <p className="px-3 text-[10px] uppercase font-bold text-text-tertiary mb-2 tracking-widest">
            今天
          </p>
          {conversations
            .filter((c) => formatDate(c.timestamp) === "今天")
            .map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  activeConversation === conv.id
                    ? "bg-bg-tertiary border border-border"
                    : "hover:bg-bg-hover"
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <span
                  className={`material-symbols-outlined text-lg ${
                    activeConversation === conv.id
                      ? "text-primary"
                      : "text-text-tertiary"
                  }`}
                >
                  chat_bubble
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      activeConversation === conv.id
                        ? "text-text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {conv.title}
                  </p>
                  <p className="text-text-tertiary text-[11px]">
                    {conv.time} · {conv.messageCount}条消息
                  </p>
                </div>
                <span className="material-symbols-outlined text-text-tertiary text-lg opacity-0 group-hover:opacity-100 hover:text-error transition-all">
                  delete
                </span>
              </div>
            ))}
        </div>

        {/* 昨天 */}
        <div className="mb-4">
          <p className="px-3 text-[10px] uppercase font-bold text-text-tertiary mb-2 tracking-widest">
            昨天
          </p>
          {conversations
            .filter((c) => formatDate(c.timestamp) === "昨天")
            .map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-hover cursor-pointer transition-colors"
                onClick={() => setActiveConversation(conv.id)}
              >
                <span className="material-symbols-outlined text-text-tertiary text-lg">
                  chat_bubble
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-text-secondary text-sm font-medium truncate">
                    {conv.title}
                  </p>
                  <p className="text-text-tertiary text-[11px]">
                    {conv.time} · {conv.messageCount}条消息
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </aside>
  );

  // 渲染消息
  const renderMessage = (msg: Message) => {
    const isUser = msg.role === "user";

    return (
      <div
        key={msg.id}
        className={`flex flex-col ${
          isUser ? "items-end" : "items-start"
        } gap-2`}
      >
        {/* 时间戳 */}
        <div
          className={`flex items-center gap-2 text-[11px] font-medium text-text-tertiary ${
            isUser ? "mr-2" : "ml-2"
          }`}
        >
          {isUser ? (
            <>
              <span>{formatTime(msg.timestamp)}</span>
              <span>我</span>
            </>
          ) : (
            <>
              <span className="text-primary">AI 助手 ({currentModel})</span>
              <span>{formatTime(msg.timestamp)}</span>
            </>
          )}
        </div>

        {isUser ? (
          // 用户消息
          <div className="max-w-[80%] bg-primary px-5 py-3 rounded-2xl rounded-tr-none text-white text-sm shadow-lg shadow-primary/10 leading-relaxed">
            {msg.content}
          </div>
        ) : (
          // AI 消息
          <div className="max-w-[90%] flex gap-4">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-lg">
                smart_toy
              </span>
            </div>
            <div className="flex flex-col gap-3 text-text-primary text-sm leading-relaxed">
              <p>{msg.content}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染空状态
  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-4xl text-primary">
          smart_toy
        </span>
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        开始与 AI 对话
      </h3>
      <p className="text-sm text-text-tertiary max-w-md mb-6">
        我是一个智能助手，可以帮助您解答问题、编写代码、分析数据等。
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {["帮我写一段 Python 代码", "解释什么是闭包", "如何优化 SQL 查询"].map(
          (suggestion) => (
            <button
              key={suggestion}
              className="px-4 py-2 rounded-full border border-border hover:border-primary hover:text-primary text-text-tertiary text-sm transition-all"
              onClick={() => setInputValue(suggestion)}
            >
              {suggestion}
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* 对话历史侧边栏 */}
      {renderSidebar()}

      {/* 主聊天区域 */}
      <main className="flex-1 flex flex-col relative bg-bg-primary">
        {/* 头部栏 */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-bg-secondary/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                smart_toy
              </span>
              <h2 className="text-text-primary font-bold tracking-tight">
                AI 助手
              </h2>
            </div>
            <div className="h-6 w-[1px] bg-border"></div>
            <div className="flex items-center gap-4">
              {/* 模型选择 */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-bg-tertiary rounded-full border border-border cursor-pointer hover:border-primary/50 transition-colors">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-tighter">
                  {currentModel}
                </span>
                <span className="material-symbols-outlined text-base text-text-tertiary">
                  expand_more
                </span>
              </div>
              {/* 其他模型快捷入口 */}
              <div className="flex items-center gap-4 text-xs font-medium text-text-tertiary">
                {models
                  .filter((m) => m !== currentModel)
                  .map((model) => (
                    <button
                      key={model}
                      className="hover:text-primary transition-colors"
                      onClick={() => setCurrentModel(model)}
                    >
                      {model}
                    </button>
                  ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {renderConnectionStatus()}
            <div className="flex items-center gap-1">
              <button
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-all"
                onClick={() => navigate("/settings/ai")}
              >
                <span className="material-symbols-outlined text-xl">
                  settings
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="space-y-8">
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="p-6 bg-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="bg-bg-secondary border border-border rounded-2xl shadow-xl focus-within:border-primary/50 transition-all p-2">
              {/* 工具栏 */}
              <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border/50">
                <div className="flex items-center gap-1">
                  <button
                    className="p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="添加附件"
                  >
                    <span className="material-symbols-outlined text-lg">
                      attach_file
                    </span>
                  </button>
                  <button
                    className="p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="上传图片"
                  >
                    <span className="material-symbols-outlined text-lg">
                      image
                    </span>
                  </button>
                  <div className="h-4 w-[1px] bg-border mx-1"></div>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all text-xs font-medium"
                    title="快捷模板"
                  >
                    <span className="material-symbols-outlined text-base">
                      temp_preferences_custom
                    </span>
                    <span>快捷模板</span>
                  </button>
                </div>
                <div className="text-[10px] text-text-tertiary font-medium">
                  按 Enter 发送，Shift + Enter 换行
                </div>
              </div>

              {/* 输入框和发送按钮 */}
              <div className="flex items-end gap-3 px-2 py-2">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="在这里输入您的问题，例如：'如何使用 Python 处理地理栅格数据？'"
                  className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary text-sm placeholder:text-text-tertiary resize-none custom-scrollbar py-1 outline-none"
                  rows={3}
                  disabled={connectionState !== ConnectionState.CONNECTED}
                />
                <button
                  className={`p-3 rounded-xl flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    inputValue.trim() &&
                    connectionState === ConnectionState.CONNECTED
                      ? "bg-primary hover:bg-primary-hover text-white shadow-primary/20"
                      : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
                  }`}
                  onClick={handleSend}
                  disabled={
                    !inputValue.trim() ||
                    connectionState !== ConnectionState.CONNECTED
                  }
                >
                  <span className="material-symbols-outlined text-2xl">
                    send
                  </span>
                </button>
              </div>
            </div>

            {/* 底部提示 */}
            <div className="mt-4 flex justify-center">
              <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                <span className="material-symbols-outlined text-base">
                  info
                </span>
                <span>AI 可能会产生错误，请核实重要信息</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export { AIChat };
