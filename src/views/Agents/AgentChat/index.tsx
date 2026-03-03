/**
 * AgentChat 智能体对话页面
 * 基于 AIChat 页面架构，针对智能体对话进行定制
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Modal, Input, Button } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionState, MessageType } from "@/types/electron";
import type {
  ChatStreamStartMessage,
  ChatStreamChunkMessage,
  ChatStreamEndMessage,
  ChatErrorMessage,
  AgentStepMessage,
} from "@/types/electron";

// 从 preload 导入 Agent 相关类型
import type {
  AgentConfig,
  AgentConversation,
  AgentMessage,
} from "@/../electron/preload";

// 从 AIChat 复用配置
import { DEFAULT_CONTEXT_LIMIT } from "@/views/AIChat/config";
import type { StreamState, AgentStepItem } from "@/views/AIChat/config";

// 样式
import "./index.sass";

const AgentChatPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { connectionState, sendAgentChat, lastMessage } = useWebSocket({
    autoConnect: true,
  });

  // 智能体信息
  const [agent, setAgent] = useState<AgentConfig | null>(null);

  // 对话列表
  const [conversations, setConversations] = useState<AgentConversation[]>([]);

  // 当前对话
  const [activeConversation, setActiveConversation] =
    useState<AgentConversation | null>(null);

  // 消息列表
  const [messages, setMessages] = useState<AgentMessage[]>([]);

  // 流式消息状态
  const [streamState, setStreamState] = useState<StreamState>({
    status: "idle",
    content: "",
    conversationId: null,
  });

  // Agent 步骤状态
  const [agentSteps, setAgentSteps] = useState<AgentStepItem[]>([]);

  // 输入内容
  const [inputValue, setInputValue] = useState("");

  // 编辑对话标题弹窗
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingConversationId, setEditingConversationId] = useState<
    number | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const agentStepsRef = useRef<AgentStepItem[]>([]);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const streamStateRef = useRef<StreamState>(streamState);

  // 同步 streamState 到 ref
  useEffect(() => {
    streamStateRef.current = streamState;
  }, [streamState]);

  // ===== 数据加载 =====

  // 加载智能体信息
  const loadAgent = useCallback(async () => {
    if (!agentId) return;
    try {
      const result = await window.electronAPI.agentGet(agentId);
      if (result.success && result.data) {
        setAgent(result.data);
      } else {
        message.error("智能体不存在");
        navigate("/agents");
      }
    } catch (error) {
      console.error("加载智能体失败:", error);
      message.error("加载智能体失败");
    }
  }, [agentId, navigate]);

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    if (!agentId) return;
    try {
      const result = await window.electronAPI.agentConversationList(agentId);
      if (result.success) {
        setConversations(result.data);
      }
    } catch (error) {
      console.error("加载对话列表失败:", error);
    }
  }, [agentId]);

  // 加载对话消息
  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      const result =
        await window.electronAPI.agentConversationGet(conversationId);
      if (result.success && result.data) {
        setMessages(result.data.messages || []);
        setActiveConversation(result.data);

        // 从最后一条 AI 消息的 metadata 中恢复 Agent 步骤
        const msgs = result.data.messages || [];
        const lastAiMessage = [...msgs]
          .reverse()
          .find((m) => m.role === "assistant");
        if (lastAiMessage?.metadata?.agentSteps) {
          const steps = lastAiMessage.metadata.agentSteps as AgentStepItem[];
          setAgentSteps(steps);
          agentStepsRef.current = steps;
        } else {
          setAgentSteps([]);
          agentStepsRef.current = [];
        }
      }
    } catch (error) {
      console.error("加载消息列表失败:", error);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadAgent();
    loadConversations();
  }, [loadAgent, loadConversations]);

  // 自动滚动到底部
  useEffect(() => {
    if (streamState.content || messages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages, streamState.content]);

  // ===== WebSocket 消息处理 =====

  useEffect(() => {
    if (!lastMessage) return;

    // 流式内容块
    if (lastMessage.type === MessageType.CHAT_STREAM_CHUNK) {
      const chunk = lastMessage as ChatStreamChunkMessage;
      setStreamState((prev) => ({
        ...prev,
        content: prev.content + chunk.content,
      }));
      return;
    }

    // 防止重复处理同一消息
    const messageId = (lastMessage as { id?: string }).id;
    if (messageId) {
      if (processedMessageIdsRef.current.has(messageId)) {
        return;
      }
      processedMessageIdsRef.current.add(messageId);
    }

    // 流式开始
    if (lastMessage.type === MessageType.CHAT_STREAM_START) {
      const streamStart = lastMessage as ChatStreamStartMessage;
      setStreamState({
        status: "streaming",
        content: "",
        conversationId: streamStart.conversationId,
      });
      setAgentSteps([]);
      agentStepsRef.current = [];
      return;
    }

    // 流式结束
    if (lastMessage.type === MessageType.CHAT_STREAM_END) {
      const streamEnd = lastMessage as ChatStreamEndMessage;
      const fullContent = streamEnd.fullContent;
      const savedAgentSteps = [...agentStepsRef.current];
      const cid =
        streamEnd.conversationId || streamStateRef.current.conversationId;

      // 重置状态
      setStreamState({
        status: "done",
        content: "",
        conversationId: null,
      });
      setAgentSteps([]);
      agentStepsRef.current = [];
      loadingRef.current = false;

      // 保存 AI 消息
      if (cid && fullContent) {
        (async () => {
          try {
            const metadata =
              savedAgentSteps.length > 0
                ? { agentSteps: savedAgentSteps }
                : undefined;

            await window.electronAPI.agentMessageAdd({
              conversation_id: cid,
              role: "assistant",
              content: fullContent,
              tokens_used: streamEnd.tokensUsed,
              timestamp: Date.now(),
              metadata,
            });
            await loadMessages(cid);
            await loadConversations();

            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
            }, 100);
          } catch (error) {
            console.error("保存 AI 消息失败:", error);
          }
        })();
      }
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
      setAgentSteps([]);
      agentStepsRef.current = [];
      loadingRef.current = false;
      return;
    }

    // Agent 步骤消息
    if (lastMessage.type === MessageType.AGENT_STEP) {
      const agentStep = lastMessage as AgentStepMessage;

      if (agentStep.stepType === "progress") {
        setAgentSteps((prev) => {
          const lastProgressIndex = [...prev]
            .reverse()
            .findIndex(
              (s) => s.type === "progress" && s.toolName === agentStep.toolName
            );

          if (lastProgressIndex !== -1) {
            const actualIndex = prev.length - 1 - lastProgressIndex;
            const newSteps = [...prev];
            newSteps[actualIndex] = {
              ...newSteps[actualIndex],
              content: agentStep.content,
              progress: agentStep.progress,
              stage: agentStep.stage,
              timestamp: agentStep.timestamp,
            };
            agentStepsRef.current = newSteps;
            return newSteps;
          } else {
            const newSteps = [
              ...prev,
              {
                type: agentStep.stepType,
                content: agentStep.content,
                toolCall: agentStep.toolCall,
                iteration: agentStep.iteration,
                timestamp: agentStep.timestamp,
                progress: agentStep.progress,
                stage: agentStep.stage,
                toolName: agentStep.toolName,
              },
            ];
            agentStepsRef.current = newSteps;
            return newSteps;
          }
        });
      } else {
        setAgentSteps((prev) => {
          const newSteps = [
            ...prev,
            {
              type: agentStep.stepType,
              content: agentStep.content,
              toolCall: agentStep.toolCall,
              iteration: agentStep.iteration,
              timestamp: agentStep.timestamp,
            },
          ];
          agentStepsRef.current = newSteps;
          return newSteps;
        });
      }
    }
  }, [lastMessage, loadMessages, loadConversations]);

  // ===== 对话管理 =====

  // 创建新对话
  const handleNewConversation = useCallback(async () => {
    if (!agentId) return;
    try {
      const result = await window.electronAPI.agentConversationCreate(agentId);
      if (result.success && result.data) {
        setActiveConversation(result.data);
        setMessages([]);
        setAgentSteps([]);
        agentStepsRef.current = [];
        await loadConversations();
      }
    } catch (error) {
      console.error("创建对话失败:", error);
      message.error("创建对话失败");
    }
  }, [agentId, loadConversations]);

  // 删除对话
  const handleDeleteConversation = useCallback(
    async (conversationId: number) => {
      try {
        await window.electronAPI.agentConversationDelete(conversationId);
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
    [activeConversation, loadConversations]
  );

  // 打开编辑标题弹窗
  const handleEditTitle = useCallback((conversation: AgentConversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title || "");
    setEditModalOpen(true);
  }, []);

  // 保存标题
  const handleSaveTitle = useCallback(async () => {
    if (!editingConversationId || !editingTitle.trim()) return;
    try {
      await window.electronAPI.agentConversationUpdateTitle(
        editingConversationId,
        editingTitle.trim()
      );
      await loadConversations();
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
      if (streamStateRef.current.status === "streaming") {
        message.warning("正在生成回复，请稍后再切换对话");
        return;
      }
      await loadMessages(conversationId);
    },
    [loadMessages]
  );

  // ===== 发送消息 =====

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || connectionState !== ConnectionState.CONNECTED) return;
    if (!agent) {
      message.warning("智能体信息加载中");
      return;
    }
    if (streamStateRef.current.status === "streaming") {
      message.warning("正在生成回复，请稍后再发送");
      return;
    }

    // 如果没有当前对话，创建新对话
    let conversationId = activeConversation?.id;
    if (!conversationId) {
      try {
        const result = await window.electronAPI.agentConversationCreate(
          agentId!
        );
        if (result.success && result.data) {
          conversationId = result.data.id;
          setActiveConversation(result.data);
          await loadConversations();
        }
      } catch (error) {
        console.error("创建对话失败:", error);
        message.error("创建对话失败");
        return;
      }
    }

    loadingRef.current = true;
    setAgentSteps([]);
    agentStepsRef.current = [];

    // 添加用户消息
    const userMessage: AgentMessage = {
      id: Date.now(),
      conversation_id: conversationId!,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // 保存用户消息到数据库
    try {
      await window.electronAPI.agentMessageAdd({
        conversation_id: conversationId!,
        role: "user",
        content,
        timestamp: Date.now(),
      });
      // 自动设置标题
      await window.electronAPI.agentConversationAutoTitle(conversationId!);
      await loadConversations();
    } catch (error) {
      console.error("保存用户消息失败:", error);
    }

    // 获取历史消息
    let history: { role: "user" | "assistant" | "system"; content: string }[] =
      [];
    try {
      const result = await window.electronAPI.agentMessageRecent(
        conversationId!,
        DEFAULT_CONTEXT_LIMIT
      );
      if (result.success && result.data) {
        history = result.data
          .filter((msg) => msg.id !== userMessage.id)
          .map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          }));
      }
    } catch (error) {
      console.error("获取历史消息失败:", error);
    }

    // 发送 Agent 聊天请求
    sendAgentChat({
      content,
      conversationId: String(conversationId),
      modelId: agent.model_id || undefined,
      history,
      // 智能体特有参数
      agentId: agentId!,
      agentConfig: {
        name: agent.name,
        description: agent.description || undefined,
        systemPrompt: agent.system_prompt || undefined,
        modelId: agent.model_id || undefined,
        tools: agent.tools.length > 0 ? agent.tools : undefined,
        knowledgeIds:
          agent.knowledge_ids.length > 0 ? agent.knowledge_ids : undefined,
      },
    });
  }, [
    inputValue,
    connectionState,
    agent,
    activeConversation,
    agentId,
    loadConversations,
    sendAgentChat,
  ]);

  // 返回智能体列表
  const handleBack = () => {
    navigate("/agents");
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!agent) {
    return (
      <div className="agent-chat-loading">
        <div className="loading-spinner" />
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="agent-chat-container">
      {/* 侧边栏 */}
      <div className="agent-chat-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeftOutlined />
            <span>返回</span>
          </button>
          <button className="new-chat-btn" onClick={handleNewConversation}>
            <PlusOutlined /> 新对话
          </button>
        </div>

        <div className="sidebar-agent-info">
          <div className="agent-avatar">{agent.avatar || "🤖"}</div>
          <div className="agent-name">{agent.name}</div>
          {agent.description && (
            <div className="agent-description">{agent.description}</div>
          )}
        </div>

        <div className="sidebar-conversations">
          <div className="conversations-title">历史对话</div>
          {conversations.length === 0 ? (
            <div className="no-conversations">暂无对话记录</div>
          ) : (
            <div className="conversations-list">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${
                    activeConversation?.id === conv.id ? "active" : ""
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="conversation-title">
                    {conv.title || "未命名对话"}
                  </div>
                  <div className="conversation-time">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                  <div className="conversation-actions">
                    <button
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTitle(conv);
                      }}
                    >
                      编辑
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="agent-chat-main">
        {/* 消息列表 */}
        <div className="agent-chat-messages">
          {messages.length === 0 && streamState.status === "idle" ? (
            <div className="empty-state">
              <div className="empty-icon">{agent.avatar || "🤖"}</div>
              <div className="empty-title">{agent.name}</div>
              <div className="empty-hint">发送消息开始与智能体对话</div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.role === "user" ? "user" : "assistant"}`}
                >
                  <div className="message-avatar">
                    {msg.role === "user" ? "👤" : agent.avatar || "🤖"}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">
                        {msg.role === "user" ? "你" : agent.name}
                      </span>
                      <span className="message-time">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div className="message-text">{msg.content}</div>
                  </div>
                </div>
              ))}
              {/* 流式消息 */}
              {streamState.status === "streaming" && (
                <div className="chat-message assistant">
                  <div className="message-avatar">{agent.avatar || "🤖"}</div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">{agent.name}</span>
                      <span className="message-time">生成中...</span>
                    </div>
                    <div className="message-text">{streamState.content}</div>
                    {agentSteps.length > 0 && (
                      <div className="agent-steps">
                        {agentSteps.map((step, idx) => (
                          <div key={idx} className={`step-item ${step.type}`}>
                            <span className="step-icon">
                              {step.type === "thought"
                                ? "💭"
                                : step.type === "tool_call"
                                  ? "🔧"
                                  : step.type === "tool_result"
                                    ? "📊"
                                    : "📝"}
                            </span>
                            <span className="step-content">
                              {step.type === "tool_call" && step.toolCall
                                ? `${step.toolCall.name}`
                                : step.content?.substring(0, 100)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div className="agent-chat-input">
          <div className="input-wrapper">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`发送消息给 ${agent.name}...`}
              disabled={connectionState !== ConnectionState.CONNECTED}
              rows={1}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={
                !inputValue.trim() ||
                connectionState !== ConnectionState.CONNECTED ||
                streamState.status === "streaming"
              }
              loading={streamState.status === "streaming"}
            >
              发送
            </Button>
          </div>
        </div>
      </div>

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
          maxLength={50}
        />
      </Modal>
    </div>
  );
};

export default AgentChatPage;
