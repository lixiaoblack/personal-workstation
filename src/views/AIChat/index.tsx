/**
 * AIChat AI 聊天页面
 * 基于 ant-design-x 构建的专业 AI 对话界面
 * 支持流式传输、对话历史、模型选择、Markdown 渲染
 * 使用 MobX 管理模型状态
 */
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Input, message, Dropdown, Tag, Tooltip } from "antd";
import { Bubble } from "@ant-design/x";
import { observer } from "mobx-react-lite";
import { useWebSocket } from "@/hooks/useWebSocket";
import { modelStore } from "@/stores";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ConnectionState, MessageType } from "@/types/electron";
import type {
  ChatStreamStartMessage,
  ChatStreamChunkMessage,
  ChatStreamEndMessage,
  ChatResponseMessage,
  ChatErrorMessage,
  ModelConfig,
  OllamaModelConfig,
  ConversationGroup,
  Conversation,
  Message,
  StreamStatus,
  HistoryMessageItem,
} from "@/types/electron";

// 提供商显示名称映射
const PROVIDER_LABELS: Record<string, { name: string; color: string }> = {
  openai: { name: "OpenAI", color: "processing" },
  bailian: { name: "百炼", color: "cyan" },
  zhipu: { name: "智谱", color: "purple" },
  ollama: { name: "Ollama", color: "success" },
  custom: { name: "自定义", color: "default" },
};

// 上下文配置：默认保留最近 N 条消息
const DEFAULT_CONTEXT_LIMIT = 20;

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 检查是否为 Ollama 模型配置
const isOllamaModel = (model: ModelConfig): model is OllamaModelConfig => {
  return model.provider === "ollama";
};

const AIChatComponent: React.FC = () => {
  const navigate = useNavigate();
  const { connectionState, sendChat, lastMessage } = useWebSocket({
    autoConnect: true,
  });

  // 从 MobX Store 获取模型状态
  const { models, currentModel, setCurrentModel } = modelStore;

  // 对话分组列表
  const [conversationGroups, setConversationGroups] = useState<
    ConversationGroup[]
  >([]);
  // 当前选中的对话
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  // 当前对话的消息列表
  const [messages, setMessages] = useState<Message[]>([]);

  // 流式消息状态
  const [streamState, setStreamState] = useState<{
    status: StreamStatus;
    content: string;
    conversationId: number | null;
  }>({
    status: "idle",
    content: "",
    conversationId: null,
  });

  // 输入内容
  const [inputValue, setInputValue] = useState("");
  // 编辑对话标题弹窗
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingConversationId, setEditingConversationId] = useState<
    number | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingRef = useRef(false);

  // ===== 数据加载 =====
  // 加载对话分组列表
  const loadConversations = useCallback(async () => {
    try {
      const groups = await window.electronAPI.getGroupedConversations();
      setConversationGroups(groups);
    } catch (error) {
      console.error("加载对话列表失败:", error);
    }
  }, []);

  // 加载对话的消息列表
  const loadMessages = useCallback(
    async (conversationId: number) => {
      try {
        const conversation = await window.electronAPI.getConversationById(
          conversationId
        );
        if (conversation) {
          setMessages(conversation.messages || []);
          setActiveConversation(conversation);
          // 设置模型
          if (conversation.modelId) {
            const model = models.find((m) => m.id === conversation.modelId);
            if (model) setCurrentModel(model);
          }
        }
      } catch (error) {
        console.error("加载消息列表失败:", error);
      }
    },
    [models]
  );

  // 初始化加载
  useEffect(() => {
    modelStore.loadModels();
    loadConversations();
  }, [loadConversations]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.content]);

  // ===== WebSocket 消息处理 =====
  // 处理流式消息
  useEffect(() => {
    if (!lastMessage) return;

    // 流式开始
    if (lastMessage.type === MessageType.CHAT_STREAM_START) {
      const streamStart = lastMessage as ChatStreamStartMessage;
      setStreamState({
        status: "streaming",
        content: "",
        conversationId: streamStart.conversationId,
      });
      return;
    }

    // 流式内容块
    if (lastMessage.type === MessageType.CHAT_STREAM_CHUNK) {
      const chunk = lastMessage as ChatStreamChunkMessage;
      setStreamState((prev) => ({
        ...prev,
        content: prev.content + chunk.content,
      }));
      return;
    }

    // 流式结束
    if (lastMessage.type === MessageType.CHAT_STREAM_END) {
      const streamEnd = lastMessage as ChatStreamEndMessage;
      const fullContent = streamEnd.fullContent;

      // 保存 AI 消息到数据库
      const cid = streamState.conversationId;
      if (cid && fullContent) {
        (async () => {
          try {
            await window.electronAPI.addMessage({
              conversationId: cid,
              role: "assistant",
              content: fullContent,
              tokensUsed: streamEnd.tokensUsed,
              timestamp: Date.now(),
            });
            // 刷新消息列表
            await loadMessages(cid);
            // 刷新对话列表
            await loadConversations();
          } catch (error) {
            console.error("保存 AI 消息失败:", error);
          }
        })();
      }

      setStreamState({
        status: "done",
        content: "",
        conversationId: null,
      });
      loadingRef.current = false;
      return;
    }

    // 非流式响应（备用处理）
    if (lastMessage.type === MessageType.CHAT_RESPONSE) {
      const response = lastMessage as ChatResponseMessage;
      if (response.success && response.content) {
        const activeConvId = activeConversation?.id;
        // 保存 AI 消息到数据库
        if (activeConvId) {
          (async () => {
            try {
              await window.electronAPI.addMessage({
                conversationId: activeConvId,
                role: "assistant",
                content: response.content,
                timestamp: Date.now(),
              });
              // 刷新消息列表
              await loadMessages(activeConvId);
              // 刷新对话列表
              await loadConversations();
            } catch (error) {
              console.error("保存 AI 消息失败:", error);
            }
          })();
        }
      }
      loadingRef.current = false;
      return;
    }

    // 错误消息
    if (lastMessage.type === MessageType.CHAT_ERROR) {
      const error = lastMessage as ChatErrorMessage;
      message.error(error.error || "发送消息失败");
      setStreamState({
        status: "error",
        content: "",
        conversationId: null,
      });
      loadingRef.current = false;
      return;
    }
  }, [
    lastMessage,
    streamState.conversationId,
    loadMessages,
    loadConversations,
    activeConversation?.id,
  ]);

  // ===== 对话管理 =====
  // 创建新对话
  const handleNewConversation = useCallback(async () => {
    if (!currentModel) {
      message.warning("请先配置模型");
      return;
    }
    try {
      const conversation = await window.electronAPI.createConversation({
        modelId: currentModel.id,
        modelName: currentModel.name,
      });
      setActiveConversation(conversation);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      console.error("创建对话失败:", error);
      message.error("创建对话失败");
    }
  }, [currentModel, loadConversations]);

  // 删除对话
  const handleDeleteConversation = useCallback(
    async (conversationId: number) => {
      Modal.confirm({
        title: "删除对话",
        content: "确定要删除这个对话吗？",
        okText: "删除",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await window.electronAPI.deleteConversation(conversationId);
            // 如果删除的是当前对话，清空消息
            if (activeConversation?.id === conversationId) {
              setActiveConversation(null);
              setMessages([]);
            }
            await loadConversations();
            message.success("对话已删除");
          } catch (error) {
            console.error("删除对话失败:", error);
            message.error("删除对话失败");
          }
        },
      });
    },
    [activeConversation, loadConversations]
  );

  // 打开编辑标题弹窗
  const handleEditTitle = useCallback((conversation: Conversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title || "");
    setEditModalOpen(true);
  }, []);

  // 保存标题
  const handleSaveTitle = useCallback(async () => {
    if (!editingConversationId || !editingTitle.trim()) return;
    try {
      await window.electronAPI.updateConversation(editingConversationId, {
        title: editingTitle.trim(),
      });
      await loadConversations();
      // 如果是当前对话，更新状态
      if (activeConversation?.id === editingConversationId) {
        setActiveConversation({
          ...activeConversation,
          title: editingTitle.trim(),
        });
      }
      setEditModalOpen(false);
      message.success("标题已更新");
    } catch (error) {
      console.error("更新标题失败:", error);
      message.error("更新标题失败");
    }
  }, [
    editingConversationId,
    editingTitle,
    activeConversation,
    loadConversations,
  ]);

  // 选择对话
  const handleSelectConversation = useCallback(
    async (conversationId: number) => {
      if (streamState.status === "streaming") {
        message.warning("正在生成回复，请稍后再切换对话");
        return;
      }
      await loadMessages(conversationId);
    },
    [loadMessages, streamState.status]
  );

  // ===== 发送消息 =====
  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || connectionState !== ConnectionState.CONNECTED) return;
    if (!currentModel) {
      message.warning("请先配置模型");
      return;
    }
    if (streamState.status === "streaming") {
      message.warning("正在生成回复，请稍后再发送");
      return;
    }

    // 如果没有当前对话，创建新对话
    let conversationId = activeConversation?.id;
    if (!conversationId) {
      try {
        const conversation = await window.electronAPI.createConversation({
          modelId: currentModel.id,
          modelName: currentModel.name,
        });
        conversationId = conversation.id;
        setActiveConversation(conversation);
        await loadConversations();
      } catch (error) {
        console.error("创建对话失败:", error);
        message.error("创建对话失败");
        return;
      }
    }

    loadingRef.current = true;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now(), // 临时 ID
      conversationId: conversationId!,
      role: "user",
      content,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // 保存用户消息到数据库
    try {
      await window.electronAPI.addMessage({
        conversationId: conversationId!,
        role: "user",
        content,
        timestamp: Date.now(),
      });
      // 自动设置标题（如果是第一条消息）
      await window.electronAPI.autoSetConversationTitle(conversationId!);
      // 刷新对话列表
      await loadConversations();
    } catch (error) {
      console.error("保存用户消息失败:", error);
    }

    // 获取历史消息（滑动窗口策略）
    let history: HistoryMessageItem[] = [];
    try {
      const recentMessages = await window.electronAPI.getRecentMessages(
        conversationId!,
        DEFAULT_CONTEXT_LIMIT
      );
      // 转换为 WebSocket 消息格式（排除当前用户消息，因为已经单独发送）
      history = recentMessages
        .filter((msg) => msg.id !== userMessage.id)
        .map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        }));
    } catch (error) {
      console.error("获取历史消息失败:", error);
    }

    // 发送到 WebSocket（携带历史消息）
    sendChat({
      content,
      conversationId: String(conversationId),
      modelId: currentModel.id,
      history,
      stream: true,
    });
  }, [
    inputValue,
    connectionState,
    currentModel,
    activeConversation,
    streamState.status,
    sendChat,
    loadConversations,
  ]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 模型选择下拉菜单
  const modelMenuItems = useMemo(() => {
    return models.map((model) => {
      const providerInfo = PROVIDER_LABELS[model.provider] || {
        name: model.provider,
        color: "default",
      };
      const isOllama = isOllamaModel(model);

      return {
        key: String(model.id),
        label: (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{model.name}</span>
              <Tag
                color={providerInfo.color}
                className="text-[10px] leading-tight px-1.5 py-0 m-0"
              >
                {providerInfo.name}
              </Tag>
              {isOllama && (
                <Tooltip title={`本地运行: ${model.host}`}>
                  <span className="material-symbols-outlined text-xs text-success">
                    offline_bolt
                  </span>
                </Tooltip>
              )}
            </div>
            {model.isDefault && (
              <span className="text-xs text-primary">默认</span>
            )}
          </div>
        ),
        onClick: () => setCurrentModel(model),
      };
    });
  }, [models]);

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
        <button
          className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg border border-dashed border-border hover:border-primary hover:text-primary transition-all text-text-tertiary text-sm"
          onClick={handleNewConversation}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>新建对话</span>
        </button>

        {/* 对话分组 */}
        {conversationGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 text-[10px] uppercase font-bold text-text-tertiary mb-2 tracking-widest">
              {group.label}
            </p>
            {group.conversations.map((conv) => (
              <Dropdown
                key={conv.id}
                trigger={["contextMenu"]}
                menu={{
                  items: [
                    {
                      key: "edit",
                      label: "编辑标题",
                      icon: (
                        <span className="material-symbols-outlined text-sm">
                          edit
                        </span>
                      ),
                      onClick: () =>
                        handleEditTitle({
                          id: conv.id,
                          title: conv.title,
                          modelId: null,
                          modelName: conv.modelName,
                          messageCount: conv.messageCount,
                          createdAt: conv.createdAt,
                          updatedAt: conv.updatedAt,
                        } as Conversation),
                    },
                    {
                      key: "delete",
                      label: "删除对话",
                      icon: (
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                      ),
                      danger: true,
                      onClick: () => handleDeleteConversation(conv.id),
                    },
                  ],
                }}
              >
                <div
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    activeConversation?.id === conv.id
                      ? "bg-bg-tertiary border border-border"
                      : "hover:bg-bg-hover"
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${
                      activeConversation?.id === conv.id
                        ? "text-primary"
                        : "text-text-tertiary"
                    }`}
                  >
                    chat_bubble
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        activeConversation?.id === conv.id
                          ? "text-text-primary"
                          : "text-text-secondary"
                      }`}
                    >
                      {conv.title || "新对话"}
                    </p>
                    <p className="text-text-tertiary text-[11px]">
                      {conv.messageCount}条消息
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-text-tertiary text-lg opacity-0 group-hover:opacity-100 hover:text-error transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                  >
                    delete
                  </span>
                </div>
              </Dropdown>
            ))}
          </div>
        ))}

        {/* 空状态 */}
        {conversationGroups.length === 0 && (
          <div className="text-center py-8 text-text-tertiary text-sm">
            暂无对话记录
          </div>
        )}
      </div>
    </aside>
  );

  // 渲染消息
  const renderMessage = (msg: Message) => {
    const isUser = msg.role === "user";

    return (
      <div
        key={msg.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}
      >
        <div className={`flex gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : ""}`}>
          {/* 头像 */}
          <div
            className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
              isUser
                ? "bg-primary/10 border border-primary/20"
                : "bg-bg-tertiary border border-border"
            }`}
          >
            <span
              className={`material-symbols-outlined text-lg ${
                isUser ? "text-primary" : "text-text-secondary"
              }`}
            >
              {isUser ? "person" : "smart_toy"}
            </span>
          </div>

          {/* 消息内容 */}
          <div className="flex flex-col gap-1">
            {/* 时间戳 */}
            <div
              className={`flex items-center gap-2 text-[11px] font-medium text-text-tertiary ${
                isUser ? "justify-end" : ""
              }`}
            >
              {isUser ? (
                <>
                  <span>{formatTime(msg.timestamp)}</span>
                  <span>我</span>
                </>
              ) : (
                <>
                  <span className="text-primary">
                    AI 助手 ({currentModel?.name || "未知模型"})
                  </span>
                  <span>{formatTime(msg.timestamp)}</span>
                </>
              )}
            </div>

            {/* 消息气泡 */}
            <Bubble
              placement={isUser ? "end" : "start"}
              variant="filled"
              shape="default"
              content={msg.content}
              contentRender={(content) => {
                if (isUser) {
                  return <span className="whitespace-pre-wrap">{content}</span>;
                }
                return <MarkdownRenderer content={content as string} />;
              }}
              styles={{
                content: isUser
                  ? { backgroundColor: "var(--color-primary)", color: "#fff" }
                  : {
                      backgroundColor: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                    },
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // 渲染流式消息（正在生成中）
  const renderStreamingMessage = () => {
    if (streamState.status !== "streaming" || !streamState.content) return null;

    return (
      <div className="flex justify-start mb-6">
        <div className="flex gap-3 max-w-[85%]">
          {/* AI 头像 */}
          <div className="size-8 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg text-text-secondary">
              smart_toy
            </span>
          </div>

          {/* 消息内容 */}
          <div className="flex flex-col gap-1">
            {/* 时间戳 */}
            <div className="flex items-center gap-2 text-[11px] font-medium text-text-tertiary">
              <span className="text-primary">
                AI 助手 ({currentModel?.name || "未知模型"})
              </span>
              <span className="animate-pulse">正在生成...</span>
            </div>

            {/* 流式消息气泡 */}
            <Bubble
              placement="start"
              variant="filled"
              shape="default"
              streaming
              content={streamState.content}
              contentRender={(content) => (
                <MarkdownRenderer content={content as string} />
              )}
              styles={{
                content: {
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                },
              }}
            />
          </div>
        </div>
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
        {models.length > 0
          ? "我是一个智能助手，可以帮助您解答问题、编写代码、分析数据等。"
          : "请先在设置中配置模型，才能开始对话。"}
      </p>
      {models.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            "帮我写一段 Python 代码",
            "解释什么是闭包",
            "如何优化 SQL 查询",
          ].map((suggestion) => (
            <button
              key={suggestion}
              className="px-4 py-2 rounded-full border border-border hover:border-primary hover:text-primary text-text-tertiary text-sm transition-all"
              onClick={() => setInputValue(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      {models.length === 0 && (
        <button
          className="px-6 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-hover transition-colors"
          onClick={() => navigate("/settings/ai")}
        >
          前往配置模型
        </button>
      )}
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
              {currentModel && (
                <Dropdown menu={{ items: modelMenuItems }} trigger={["click"]}>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-bg-tertiary rounded-full border border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-tighter">
                      {currentModel.name}
                    </span>
                    <Tag
                      color={
                        PROVIDER_LABELS[currentModel.provider]?.color ||
                        "default"
                      }
                      className="text-[9px] leading-tight px-1 py-0 m-0"
                    >
                      {PROVIDER_LABELS[currentModel.provider]?.name ||
                        currentModel.provider}
                    </Tag>
                    <span className="material-symbols-outlined text-base text-text-tertiary">
                      expand_more
                    </span>
                  </div>
                </Dropdown>
              )}
              {/* 其他模型快捷入口 */}
              <div className="flex items-center gap-3 text-xs font-medium text-text-tertiary">
                {models
                  .filter((m) => m.id !== currentModel?.id)
                  .slice(0, 3)
                  .map((model) => {
                    const isOllama = isOllamaModel(model);
                    return (
                      <button
                        key={model.id}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                        onClick={() => setCurrentModel(model)}
                      >
                        <span>{model.name}</span>
                        {isOllama && (
                          <Tooltip title="本地模型">
                            <span className="material-symbols-outlined text-[10px] text-success">
                              offline_bolt
                            </span>
                          </Tooltip>
                        )}
                      </button>
                    );
                  })}
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
          {messages.length === 0 && streamState.status !== "streaming" ? (
            renderEmptyState()
          ) : (
            <div className="space-y-8">
              {messages.map(renderMessage)}
              {renderStreamingMessage()}
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
                  disabled={
                    connectionState !== ConnectionState.CONNECTED ||
                    streamState.status === "streaming"
                  }
                />
                <button
                  className={`p-3 rounded-xl flex items-center justify-center transition-all shadow-lg shrink-0 ${
                    inputValue.trim() &&
                    connectionState === ConnectionState.CONNECTED &&
                    streamState.status !== "streaming" &&
                    currentModel
                      ? "bg-primary hover:bg-primary-hover text-white shadow-primary/20"
                      : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
                  }`}
                  onClick={handleSend}
                  disabled={
                    !inputValue.trim() ||
                    connectionState !== ConnectionState.CONNECTED ||
                    streamState.status === "streaming" ||
                    !currentModel
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

      {/* 编辑标题弹窗 */}
      <Modal
        title="编辑对话标题"
        open={editModalOpen}
        onOk={handleSaveTitle}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          placeholder="请输入对话标题"
          maxLength={100}
          onPressEnter={handleSaveTitle}
        />
      </Modal>
    </div>
  );
};

export const AIChat = observer(AIChatComponent);
