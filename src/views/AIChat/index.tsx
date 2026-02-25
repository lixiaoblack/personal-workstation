/**
 * AIChat AI 聊天页面
 * 基于 ant-design-x 构建的专业 AI 对话界面
 * 支持流式传输、对话历史、模型选择、Markdown 渲染
 * 使用 MobX 管理模型状态
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Modal, Input, message } from "antd";
import { observer } from "mobx-react-lite";
import { useWebSocket } from "@/hooks/useWebSocket";
import { modelStore } from "@/stores";
import { MessageType, ConnectionState } from "@/types/electron";
import type {
  ChatStreamStartMessage,
  ChatStreamChunkMessage,
  ChatStreamEndMessage,
  ChatResponseMessage,
  ChatErrorMessage,
  AgentStepMessage,
  Conversation,
  Message,
  KnowledgeInfo,
  KnowledgeAskAddMessage,
  AttachmentInfo,
  KnowledgeOption,
} from "@/types/electron";

// 配置和类型
import { DEFAULT_CONTEXT_LIMIT } from "./config";
import type { StreamState, AgentStepItem } from "./config";

// 子组件
import AIChatSidebar from "./components/AIChatSidebar";
import AIChatHeader from "./components/AIChatHeader";
import AIChatMessage from "./components/AIChatMessage";
import AIChatStreamingMessage from "./components/AIChatStreamingMessage";
import AIChatEmptyState from "./components/AIChatEmptyState";
import AIChatInput, { TagItem, AttachmentFile } from "./components/AIChatInput";
import KnowledgeSelectCard from "./components/KnowledgeSelectCard";
import CreateKnowledgeModal from "../Knowledge/components/CreateKnowledgeModal";
import type { ModelConfigListItem } from "@/types/electron";

const AIChatComponent: React.FC = () => {
  const { connectionState, sendChat, sendAgentChat, lastMessage } =
    useWebSocket({
      autoConnect: true,
    });

  // 从 MobX Store 获取模型状态
  const { models, currentModel, setCurrentModel } = modelStore;
  // 只筛选 LLM 模型（过滤掉嵌入模型）
  const llmModels = models.filter((m) => m.usageType === "llm" || !m.usageType);

  // Agent 模式开关
  const [agentMode, setAgentMode] = useState(true);

  // 知识库列表和选中状态
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeInfo[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);

  // 对话分组列表
  const [conversationGroups, setConversationGroups] = useState<
    import("@/types/electron").ConversationGroup[]
  >([]);

  // 当前选中的对话
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);

  // 当前对话的消息列表
  const [messages, setMessages] = useState<Message[]>([]);

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

  // 附件文件列表
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // 知识库添加询问状态
  const [knowledgeAskAddState, setKnowledgeAskAddState] = useState<{
    [attachmentId: string]: {
      attachment: AttachmentInfo;
      selected: boolean;
      selectedKnowledge?: { id: string; name: string; selectedAt: number };
      processing: boolean;
      addResult?: {
        success: boolean;
        documentName?: string;
        chunkCount?: number;
        error?: string;
      };
    };
  }>({});

  // 编辑对话标题弹窗
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingConversationId, setEditingConversationId] = useState<
    number | null
  >(null);

  // 创建知识库弹窗
  const [createKnowledgeModalVisible, setCreateKnowledgeModalVisible] =
    useState(false);
  const [embeddingModels, setEmbeddingModels] = useState<
    ModelConfigListItem[]
  >([]);
  const [embeddingModelsLoading, setEmbeddingModelsLoading] = useState(false);
  const [pendingAttachmentIdForCreate, setPendingAttachmentIdForCreate] =
    useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const agentStepsRef = useRef<AgentStepItem[]>([]);
  const processedMessageIdsRef = useRef<Set<string>>(new Set()); // 已处理的消息 ID
  const streamStateRef = useRef<StreamState>(streamState); // 追踪流状态的 ref

  // 同步 streamState 到 ref
  useEffect(() => {
    streamStateRef.current = streamState;
  }, [streamState]);

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

          // 从最后一条 AI 消息的 metadata 中恢复 Agent 步骤
          const msgs = conversation.messages || [];
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
    },
    [models, setCurrentModel]
  );

  // 初始化加载
  useEffect(() => {
    modelStore.loadModels();
    loadConversations();
    // 加载知识库列表
    (async () => {
      try {
        const result = await window.electronAPI.listKnowledge();
        console.log("[AIChat] listKnowledge 结果:", result);
        if (result.success && result.knowledge) {
          console.log(
            "[AIChat] 知识库列表:",
            result.knowledge.length,
            result.knowledge
          );
          setKnowledgeList(result.knowledge);
        } else {
          console.log("[AIChat] 知识库加载失败:", result.error);
        }
      } catch (error) {
        console.error("加载知识库列表失败:", error);
      }
    })();
    // 加载嵌入模型列表
    (async () => {
      try {
        setEmbeddingModelsLoading(true);
        const models = await window.electronAPI.getModelConfigs();
        if (models && models.length > 0) {
          // 只筛选嵌入模型且已启用的
          const embedding = models.filter(
            (m: ModelConfigListItem) =>
              m.usageType === "embedding" && m.enabled
          );
          setEmbeddingModels(embedding);
        }
      } catch (error) {
        console.error("加载嵌入模型失败:", error);
      } finally {
        setEmbeddingModelsLoading(false);
      }
    })();
  }, [loadConversations]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamState.content]);

  // ===== 摘要生成机制 =====

  const SUMMARY_THRESHOLD = 10; // 每10条消息生成一次摘要

  const checkAndGenerateSummary = useCallback(
    async (conversationId: number) => {
      try {
        // 获取当前对话的消息数量
        const recentMessages = await window.electronAPI.getRecentMessages(
          conversationId,
          100 // 获取足够多的消息来计算
        );
        const messageCount = recentMessages.length;

        // 获取已有的摘要
        const summariesResult =
          await window.electronAPI.getConversationSummaries(conversationId);
        const existingSummaries = summariesResult.success
          ? summariesResult.summaries
          : [];

        // 计算已摘要的消息数量（通过 endMessageId 判断）
        let summarizedMessageCount = 0;
        if (existingSummaries.length > 0) {
          // 获取最新摘要
          const lastSummary = existingSummaries[0];
          // 尝试获取 endMessageId（需要从后端返回）
          const summaryData = lastSummary as unknown as {
            endMessageId?: number;
          };
          if (summaryData.endMessageId) {
            // 找到这个消息在 recentMessages 中的位置
            const lastSummaryIndex = recentMessages.findIndex(
              (m) => m.id <= summaryData.endMessageId!
            );
            if (lastSummaryIndex >= 0) {
              summarizedMessageCount = lastSummaryIndex + 1;
            }
          }
        }

        // 计算未摘要的消息数量
        const unsummarizedCount = messageCount - summarizedMessageCount;

        // 检查是否需要生成新摘要
        if (unsummarizedCount >= SUMMARY_THRESHOLD) {
          console.log(
            "[AIChat] 触发摘要生成，未摘要消息数量:",
            unsummarizedCount
          );

          // 获取需要摘要的消息（未摘要的部分）
          const messagesToSummarize = recentMessages
            .slice(summarizedMessageCount)
            .map((m) => ({
              role: m.role,
              content: m.content,
            }));

          if (messagesToSummarize.length >= SUMMARY_THRESHOLD) {
            // 调用 Python 服务生成摘要
            const result = await window.electronAPI.generateSummary(
              conversationId,
              messagesToSummarize,
              currentModel?.id
            );

            if (result.success) {
              console.log(
                "[AIChat] 摘要生成成功:",
                result.summary?.substring(0, 50)
              );
            } else {
              console.error("[AIChat] 摘要生成失败:", result.error);
            }
          }
        }
      } catch (error) {
        console.error("检查摘要生成失败:", error);
      }
    },
    [currentModel?.id]
  );

  // ===== WebSocket 消息处理 =====

  useEffect(() => {
    if (!lastMessage) return;

    // 详细日志：打印收到的消息
    console.log("[AIChat] 收到 WebSocket 消息:", {
      type: lastMessage.type,
      id: (lastMessage as { id?: string }).id,
      timestamp: Date.now(),
      currentStreamStateRef: streamStateRef.current,
      currentAgentSteps: agentStepsRef.current.length,
    });

    // 防止重复处理同一消息
    const messageId = (lastMessage as { id?: string }).id;
    if (messageId) {
      if (processedMessageIdsRef.current.has(messageId)) {
        console.log("[AIChat] 跳过重复消息:", messageId);
        return; // 已处理过，跳过
      }
      processedMessageIdsRef.current.add(messageId);

      // 限制集合大小，防止内存泄漏
      if (processedMessageIdsRef.current.size > 1000) {
        const iterator = processedMessageIdsRef.current.values();
        const first = iterator.next();
        if (!first.done) {
          processedMessageIdsRef.current.delete(first.value);
        }
      }
    }

    // 流式开始
    if (lastMessage.type === MessageType.CHAT_STREAM_START) {
      const streamStart = lastMessage as ChatStreamStartMessage;
      console.log("[AIChat] CHAT_STREAM_START:", {
        conversationId: streamStart.conversationId,
        previousContent: streamStateRef.current.content,
        previousAgentSteps: agentStepsRef.current.length,
      });
      // 重置所有流式状态，确保是全新的
      setStreamState({
        status: "streaming",
        content: "",
        conversationId: streamStart.conversationId,
      });
      // 清空之前的 Agent 步骤
      setAgentSteps([]);
      agentStepsRef.current = [];
      console.log("[AIChat] 状态已重置，开始新的流式传输");
      return;
    }

    // 流式内容块
    if (lastMessage.type === MessageType.CHAT_STREAM_CHUNK) {
      const chunk = lastMessage as ChatStreamChunkMessage;
      console.log("[AIChat] CHAT_STREAM_CHUNK:", {
        contentLength: chunk.content?.length || 0,
        contentPreview: chunk.content?.substring(0, 50),
        currentStreamContent: streamStateRef.current.content?.length || 0,
      });
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

      console.log("[AIChat] CHAT_STREAM_END:", {
        conversationId: streamEnd.conversationId,
        fullContentLength: fullContent?.length || 0,
        fullContentPreview: fullContent?.substring(0, 100),
        agentStepsCount: agentStepsRef.current.length,
        currentStreamStateRef: streamStateRef.current,
      });

      // 先保存 agentSteps，然后重置状态
      const savedAgentSteps = [...agentStepsRef.current];
      const cid =
        streamEnd.conversationId || streamStateRef.current.conversationId;

      console.log(
        "[AIChat] 准备重置状态，保存的 agentSteps:",
        savedAgentSteps.length,
        "cid:",
        cid
      );

      // 立即重置所有流式状态，防止新消息显示旧内容
      setStreamState({
        status: "done",
        content: "",
        conversationId: null,
      });
      setAgentSteps([]);
      agentStepsRef.current = [];
      loadingRef.current = false;

      console.log("[AIChat] 状态已重置");

      // 保存 AI 消息到数据库（附带保存的 Agent 步骤）
      if (cid && fullContent) {
        (async () => {
          try {
            const metadata =
              savedAgentSteps.length > 0
                ? { agentSteps: savedAgentSteps }
                : undefined;

            await window.electronAPI.addMessage({
              conversationId: cid,
              role: "assistant",
              content: fullContent,
              tokensUsed: streamEnd.tokensUsed,
              timestamp: Date.now(),
              metadata,
            });
            await loadMessages(cid);
            await loadConversations();

            // 检查是否需要生成摘要（每10条消息触发一次）
            await checkAndGenerateSummary(cid);
          } catch (error) {
            console.error("保存 AI 消息失败:", error);
          }
        })();
      }
      return;
    }

    // 非流式响应
    if (lastMessage.type === MessageType.CHAT_RESPONSE) {
      const response = lastMessage as ChatResponseMessage;
      if (response.success && response.content) {
        const activeConvId = activeConversation?.id;
        if (activeConvId) {
          (async () => {
            try {
              await window.electronAPI.addMessage({
                conversationId: activeConvId,
                role: "assistant",
                content: response.content,
                timestamp: Date.now(),
              });
              await loadMessages(activeConvId);
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
      setAgentSteps([]);
      agentStepsRef.current = [];
      loadingRef.current = false;
      return;
    }

    // Agent 步骤消息
    if (lastMessage.type === MessageType.AGENT_STEP) {
      const agentStep = lastMessage as AgentStepMessage;
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

    // 知识库添加询问消息
    if (lastMessage.type === MessageType.KNOWLEDGE_ASK_ADD) {
      const askAddMsg = lastMessage as KnowledgeAskAddMessage;
      console.log("[AIChat] 收到 knowledge_ask_add 消息:", askAddMsg);
      setKnowledgeAskAddState((prev) => ({
        ...prev,
        [askAddMsg.attachment.id]: {
          attachment: askAddMsg.attachment,
          selected: false,
          processing: false,
        },
      }));
    }
  }, [
    lastMessage,
    loadMessages,
    loadConversations,
    activeConversation?.id,
    checkAndGenerateSummary,
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
      setAgentSteps([]);
      agentStepsRef.current = [];
      await loadConversations();
    } catch (error) {
      console.error("创建对话失败:", error);
      message.error("创建对话失败");
    }
  }, [currentModel, loadConversations]);

  // 删除对话
  const handleDeleteConversation = useCallback(
    async (conversationId: number) => {
      try {
        await window.electronAPI.deleteConversation(conversationId);
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
    if (!currentModel) {
      message.warning("请先配置模型");
      return;
    }
    if (streamStateRef.current.status === "streaming") {
      message.warning("正在生成回复，请稍后再发送");
      return;
    }

    console.log("[AIChat] handleSend 开始:", {
      content: content.substring(0, 50),
      currentStreamStateRef: streamStateRef.current,
      currentAgentSteps: agentStepsRef.current.length,
      activeConversationId: activeConversation?.id,
    });

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

    // 清空之前的 Agent 步骤
    setAgentSteps([]);
    agentStepsRef.current = [];

    console.log("[AIChat] 准备发送消息，conversationId:", conversationId);

    // 构建消息内容（附件信息通过 metadata 传递，不在内容中显示）
    const messageContent = content;
    const currentAttachments = [...attachments];

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now(),
      conversationId: conversationId!,
      role: "user",
      content: messageContent,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      metadata:
        currentAttachments.length > 0
          ? { attachments: currentAttachments }
          : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    // 清空附件列表
    setAttachments([]);

    // 保存用户消息到数据库
    try {
      await window.electronAPI.addMessage({
        conversationId: conversationId!,
        role: "user",
        content,
        timestamp: Date.now(),
        metadata:
          currentAttachments.length > 0
            ? { attachments: currentAttachments }
            : undefined,
      });
      await window.electronAPI.autoSetConversationTitle(conversationId!);
      await loadConversations();
    } catch (error) {
      console.error("保存用户消息失败:", error);
    }

    // 获取历史消息
    let history: { role: "user" | "assistant" | "system"; content: string }[] =
      [];
    try {
      const recentMessages = await window.electronAPI.getRecentMessages(
        conversationId!,
        DEFAULT_CONTEXT_LIMIT
      );
      history = recentMessages
        .filter((msg) => msg.id !== userMessage.id)
        .map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        }));
    } catch (error) {
      console.error("获取历史消息失败:", error);
    }

    // 获取记忆上下文（长期记忆 + 历史摘要）
    let memoryContext = "";
    try {
      const memoryResult = await window.electronAPI.getMemoryContext();
      if (memoryResult.success && memoryResult.contextPrompt) {
        memoryContext = memoryResult.contextPrompt;
        console.log(
          "[AIChat] 已加载记忆上下文:",
          memoryContext.substring(0, 100)
        );
      }
    } catch (error) {
      console.error("获取记忆上下文失败:", error);
    }

    // 如果有记忆上下文，注入到历史消息开头
    if (memoryContext) {
      history = [
        {
          role: "system" as const,
          content: `以下是用户的背景信息，请参考这些信息回答问题：\n\n${memoryContext}`,
        },
        ...history,
      ];
    }

    // 根据 agentMode 选择发送方式
    if (agentMode) {
      // 构建知识库元数据（用于智能匹配）
      const knowledgeMetadata: Record<
        string,
        { name: string; description: string }
      > = {};
      knowledgeList.forEach((kb) => {
        knowledgeMetadata[kb.id] = {
          name: kb.name,
          description: kb.description || "",
        };
      });

      // 从 selectedTags 中获取知识库 ID
      const knowledgeTag = selectedTags.find((t) => t.type === "knowledge");
      const knowledgeId = knowledgeTag?.id || undefined;

      console.log("[AIChat] 发送 Agent 消息:", {
        content: content.substring(0, 50),
        conversationId: String(conversationId),
        modelId: currentModel.id,
        knowledgeId,
      });

      sendAgentChat({
        content: messageContent,
        conversationId: String(conversationId),
        modelId: currentModel.id,
        history,
        knowledgeId,
        knowledgeMetadata,
        attachments:
          currentAttachments.length > 0
            ? currentAttachments.map((a) => ({
                name: a.name,
                path: a.path,
                type: a.type,
                size: a.size,
                mimeType: a.mimeType,
              }))
            : undefined,
      });
    } else {
      console.log("[AIChat] 发送普通聊天消息:", {
        content: content.substring(0, 50),
        conversationId: String(conversationId),
        modelId: currentModel.id,
      });

      sendChat({
        content: messageContent,
        conversationId: String(conversationId),
        modelId: currentModel.id,
        history,
        stream: true,
      });
    }
  }, [
    inputValue,
    connectionState,
    currentModel,
    activeConversation,
    sendChat,
    sendAgentChat,
    agentMode,
    selectedTags,
    knowledgeList,
    loadConversations,
    attachments,
  ]);

  // 知识库添加询问相关回调
  const handleAskAddToKnowledge = useCallback((attachmentId: string) => {
    // 用户点击添加到知识库，显示知识库列表（组件内部处理）
    console.log("[AIChat] 用户请求添加附件到知识库:", attachmentId);
  }, []);

  const handleSkipAddToKnowledge = useCallback((attachmentId: string) => {
    // 用户跳过添加
    setKnowledgeAskAddState((prev) => {
      const newState = { ...prev };
      delete newState[attachmentId];
      return newState;
    });
  }, []);

  const handleSelectKnowledgeForAdd = useCallback(
    async (attachmentId: string, knowledgeId: string) => {
      const state = knowledgeAskAddState[attachmentId];
      if (!state) return;

      const kb = knowledgeList.find((k) => k.id === knowledgeId);
      if (!kb) return;

      // 更新状态为处理中
      setKnowledgeAskAddState((prev) => ({
        ...prev,
        [attachmentId]: {
          ...prev[attachmentId],
          processing: true,
          selected: true,
          selectedKnowledge: {
            id: knowledgeId,
            name: kb.name,
            selectedAt: Date.now(),
          },
        },
      }));

      try {
        // 调用 API 添加文档到知识库
        const result = await window.electronAPI.addKnowledgeDocument(
          knowledgeId,
          state.attachment.path || "",
          state.attachment.name
        );

        if (result.success) {
          setKnowledgeAskAddState((prev) => ({
            ...prev,
            [attachmentId]: {
              ...prev[attachmentId],
              processing: false,
              addResult: {
                success: true,
                documentName: result.document?.fileName,
                chunkCount: result.document?.chunkCount,
              },
            },
          }));
          message.success(`文件已添加到「${kb.name}」知识库`);
        } else {
          setKnowledgeAskAddState((prev) => ({
            ...prev,
            [attachmentId]: {
              ...prev[attachmentId],
              processing: false,
              addResult: {
                success: false,
                error: result.error || "添加失败",
              },
            },
          }));
          message.error(result.error || "添加到知识库失败");
        }
      } catch (error) {
        console.error("添加文档到知识库失败:", error);
        setKnowledgeAskAddState((prev) => ({
          ...prev,
          [attachmentId]: {
            ...prev[attachmentId],
            processing: false,
            addResult: {
              success: false,
              error: "添加失败，请重试",
            },
          },
        }));
        message.error("添加到知识库失败");
      }
    },
    [knowledgeAskAddState, knowledgeList]
  );

  // 将知识库列表转换为 KnowledgeOption 格式
  const knowledgeOptions: KnowledgeOption[] = knowledgeList.map((kb) => ({
    id: kb.id,
    name: kb.name,
    description: kb.description,
    documentCount: kb.documentCount || 0,
  }));

  // 处理点击新建知识库
  const handleCreateKnowledgeClick = useCallback((attachmentId: string) => {
    setPendingAttachmentIdForCreate(attachmentId);
    setCreateKnowledgeModalVisible(true);
  }, []);

  // 处理创建知识库
  const handleCreateKnowledge = useCallback(
    async (values: {
      name: string;
      description?: string;
      embeddingModelConfigId: number;
    }) => {
      const selectedModel = embeddingModels.find(
        (m) => m.id === values.embeddingModelConfigId
      );
      if (!selectedModel) {
        message.error("请选择有效的嵌入模型");
        return;
      }

      try {
        const result = await window.electronAPI.createKnowledge({
          name: values.name,
          description: values.description,
          embeddingModel:
            selectedModel.provider === "ollama" ? "ollama" : "openai",
          embeddingModelName: selectedModel.modelId,
        });

        if (result.success) {
          message.success("知识库创建成功");
          setCreateKnowledgeModalVisible(false);

          // 重新加载知识库列表
          const listResult = await window.electronAPI.listKnowledge();
          if (listResult.success && listResult.knowledge) {
            setKnowledgeList(listResult.knowledge);
          }

          // 如果有待处理的附件，自动选择新创建的知识库
          if (
            pendingAttachmentIdForCreate &&
            result.knowledge &&
            result.knowledge.length > 0
          ) {
            handleSelectKnowledgeForAdd(
              pendingAttachmentIdForCreate,
              result.knowledge[0].id
            );
            setPendingAttachmentIdForCreate(null);
          }
        } else {
          message.error(result.error || "创建知识库失败");
        }
      } catch (error) {
        console.error("创建知识库失败:", error);
        message.error("创建知识库失败");
      }
    },
    [
      embeddingModels,
      pendingAttachmentIdForCreate,
      handleSelectKnowledgeForAdd,
    ]
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* 对话历史侧边栏 */}
      <AIChatSidebar
        conversationGroups={conversationGroups}
        activeConversation={activeConversation}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onEditTitle={handleEditTitle}
      />

      {/* 主聊天区域 */}
      <main className="flex-1 flex flex-col relative bg-bg-primary">
        {/* 头部栏 */}
        <AIChatHeader
          currentModel={currentModel}
          llmModels={llmModels}
          connectionState={connectionState}
          onSelectModel={setCurrentModel}
        />

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-4xl mx-auto w-full">
          {messages.length === 0 &&
          streamState.status !== "streaming" &&
          agentSteps.length === 0 ? (
            <AIChatEmptyState
              llmModels={llmModels}
              onSelectSuggestion={setInputValue}
            />
          ) : (
            <div className="space-y-8">
              {messages.map((msg) => (
                <AIChatMessage
                  key={msg.id}
                  message={msg}
                  currentModel={currentModel}
                />
              ))}

              {/* 知识库添加询问卡片 */}
              {Object.entries(knowledgeAskAddState).map(
                ([attachmentId, state]) => (
                  <div key={attachmentId} className="flex justify-start mb-6">
                    <KnowledgeSelectCard
                      attachment={state.attachment}
                      knowledgeList={knowledgeOptions}
                      selected={state.selected}
                      selectedKnowledge={state.selectedKnowledge}
                      addResult={state.addResult}
                      processing={state.processing}
                      onAskAdd={() => handleAskAddToKnowledge(attachmentId)}
                      onSkip={() => handleSkipAddToKnowledge(attachmentId)}
                      onSelectKnowledge={(knowledgeId) =>
                        handleSelectKnowledgeForAdd(attachmentId, knowledgeId)
                      }
                      onCreateKnowledge={() =>
                        handleCreateKnowledgeClick(attachmentId)
                      }
                    />
                  </div>
                )
              )}

              {streamState.status === "streaming" && (
                <AIChatStreamingMessage
                  content={streamState.content}
                  currentModel={currentModel}
                  agentSteps={agentSteps}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <AIChatInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          currentModel={currentModel}
          connectionState={connectionState}
          streamState={streamState}
          agentMode={agentMode}
          onAgentModeChange={setAgentMode}
          onSend={handleSend}
          knowledgeList={knowledgeList}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
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

      {/* 创建知识库弹窗 */}
      <CreateKnowledgeModal
        visible={createKnowledgeModalVisible}
        embeddingModels={embeddingModels}
        embeddingModelsLoading={embeddingModelsLoading}
        onCancel={() => setCreateKnowledgeModalVisible(false)}
        onSubmit={handleCreateKnowledge}
      />
    </div>
  );
};

export const AIChat = observer(AIChatComponent);
