/**
 * WebSocket 消息协议类型定义
 * 用于渲染进程、主进程和 Python 智能体服务之间的通信
 */

// 消息类型枚举
export enum MessageType {
  // 连接相关
  CONNECTION_ACK = "connection_ack", // 连接确认
  PING = "ping", // 心跳请求
  PONG = "pong", // 心跳响应
  CLIENT_IDENTIFY = "client_identify", // 客户端标识

  // 聊天相关
  CHAT_MESSAGE = "chat_message", // 聊天消息
  CHAT_RESPONSE = "chat_response", // 聊天响应（非流式）
  CHAT_ERROR = "chat_error", // 聊天错误

  // 流式响应
  CHAT_STREAM_START = "chat_stream_start", // 流式开始
  CHAT_STREAM_CHUNK = "chat_stream_chunk", // 流式内容块
  CHAT_STREAM_END = "chat_stream_end", // 流式结束

  // Agent 相关（ReAct 模式）
  AGENT_CHAT = "agent_chat", // Agent 聊天消息（触发智能体）
  AGENT_THOUGHT = "agent_thought", // Agent 思考过程
  AGENT_TOOL_CALL = "agent_tool_call", // Agent 工具调用
  AGENT_TOOL_RESULT = "agent_tool_result", // 工具执行结果
  AGENT_STEP = "agent_step", // Agent 步骤更新（通用）

  // 系统相关
  SYSTEM_STATUS = "system_status", // 系统状态
  SYSTEM_ERROR = "system_error", // 系统错误

  // Python 服务相关
  PYTHON_STATUS = "python_status", // Python 服务状态
  PYTHON_LOG = "python_log", // Python 日志

  // Ollama 相关
  OLLAMA_STATUS = "ollama_status", // Ollama 状态查询
  OLLAMA_STATUS_RESPONSE = "ollama_status_response", // Ollama 状态响应
  OLLAMA_MODELS = "ollama_models", // Ollama 模型列表查询
  OLLAMA_MODELS_RESPONSE = "ollama_models_response", // Ollama 模型列表响应
  OLLAMA_TEST = "ollama_test", // Ollama 连接测试
  OLLAMA_TEST_RESPONSE = "ollama_test_response", // Ollama 测试响应

  // Skills 技能相关
  SKILL_LIST = "skill_list", // 技能列表查询
  SKILL_LIST_RESPONSE = "skill_list_response", // 技能列表响应
  SKILL_EXECUTE = "skill_execute", // 技能执行请求
  SKILL_EXECUTE_RESPONSE = "skill_execute_response", // 技能执行响应
  SKILL_RELOAD = "skill_reload", // 技能重载请求
  SKILL_RELOAD_RESPONSE = "skill_reload_response", // 技能重载响应

  // Knowledge 知识库相关
  KNOWLEDGE_CREATE = "knowledge_create", // 创建知识库
  KNOWLEDGE_CREATE_RESPONSE = "knowledge_create_response", // 创建知识库响应
  KNOWLEDGE_DELETE = "knowledge_delete", // 删除知识库
  KNOWLEDGE_DELETE_RESPONSE = "knowledge_delete_response", // 删除知识库响应
  KNOWLEDGE_LIST = "knowledge_list", // 知识库列表
  KNOWLEDGE_LIST_RESPONSE = "knowledge_list_response", // 知识库列表响应
  KNOWLEDGE_GET = "knowledge_get", // 获取知识库详情
  KNOWLEDGE_GET_RESPONSE = "knowledge_get_response", // 获取知识库详情响应
  KNOWLEDGE_ADD_DOCUMENT = "knowledge_add_document", // 添加文档
  KNOWLEDGE_ADD_DOCUMENT_RESPONSE = "knowledge_add_document_response", // 添加文档响应
  KNOWLEDGE_REMOVE_DOCUMENT = "knowledge_remove_document", // 删除文档
  KNOWLEDGE_REMOVE_DOCUMENT_RESPONSE = "knowledge_remove_document_response", // 删除文档响应
  KNOWLEDGE_SEARCH = "knowledge_search", // 搜索知识库
  KNOWLEDGE_SEARCH_RESPONSE = "knowledge_search_response", // 搜索知识库响应
  KNOWLEDGE_LIST_DOCUMENTS = "knowledge_list_documents", // 列出知识库文档
  KNOWLEDGE_LIST_DOCUMENTS_RESPONSE = "knowledge_list_documents_response", // 列出知识库文档响应

  // Knowledge Sync 知识库同步（Python -> Electron）
  KNOWLEDGE_SYNC_CREATE = "knowledge_sync_create", // 同步创建知识库（Agent 调用）
  KNOWLEDGE_SYNC_CREATE_RESPONSE = "knowledge_sync_create_response", // 同步创建响应
  KNOWLEDGE_SYNC_DELETE = "knowledge_sync_delete", // 同步删除知识库（Agent 调用）
  KNOWLEDGE_SYNC_DELETE_RESPONSE = "knowledge_sync_delete_response", // 同步删除响应

  // Memory 记忆相关
  MEMORY_GET_CONTEXT = "memory_get_context", // 获取记忆上下文
  MEMORY_GET_CONTEXT_RESPONSE = "memory_get_context_response", // 获取记忆上下文响应
  MEMORY_SAVE = "memory_save", // 保存记忆
  MEMORY_SAVE_RESPONSE = "memory_save_response", // 保存记忆响应
  MEMORY_CREATE_SUMMARY = "memory_create_summary", // 创建摘要
  MEMORY_CREATE_SUMMARY_RESPONSE = "memory_create_summary_response", // 创建摘要响应
  MEMORY_LIST = "memory_list", // 获取记忆列表
  MEMORY_LIST_RESPONSE = "memory_list_response", // 获取记忆列表响应
  MEMORY_DELETE = "memory_delete", // 删除记忆
  MEMORY_DELETE_RESPONSE = "memory_delete_response", // 删除记忆响应
  MEMORY_GENERATE_SUMMARY = "memory_generate_summary", // 生成摘要（通过 LLM）
  MEMORY_GENERATE_SUMMARY_RESPONSE = "memory_generate_summary_response", // 生成摘要响应
  MEMORY_EXTRACT = "memory_extract", // 提取记忆（通过 LLM）
  MEMORY_EXTRACT_RESPONSE = "memory_extract_response", // 提取记忆响应

  // Web Crawl 网页采集相关
  WEB_CRAWL = "web_crawl", // 网页采集请求
  WEB_CRAWL_RESPONSE = "web_crawl_response", // 网页采集响应
  WEB_FETCH = "web_fetch", // 网页内容获取请求
  WEB_FETCH_RESPONSE = "web_fetch_response", // 网页内容获取响应

  // Frontend Bridge 前端桥接（Agent -> Electron）
  FRONTEND_BRIDGE_REQUEST = "frontend_bridge_request", // 桥接调用请求
  FRONTEND_BRIDGE_RESPONSE = "frontend_bridge_response", // 桥接调用响应
  FRONTEND_BRIDGE_LIST = "frontend_bridge_list", // 获取可用方法列表
  FRONTEND_BRIDGE_LIST_RESPONSE = "frontend_bridge_list_response", // 方法列表响应

  // Knowledge Selection 知识库选择相关（聊天内嵌交互）
  KNOWLEDGE_ASK_ADD = "knowledge_ask_add", // Agent 询问是否添加到知识库
  KNOWLEDGE_SELECT_REQUEST = "knowledge_select_request", // 请求选择知识库
  KNOWLEDGE_SELECT_RESPONSE = "knowledge_select_response", // 用户选择结果
  KNOWLEDGE_ADD_RESULT = "knowledge_add_result", // 添加结果通知

  // ==================== 通用 Ask 交互模块 ====================
  // 用于前后端交互式确认、选择、输入等场景
  ASK = "ask", // 后端发起询问
  ASK_RESPONSE = "ask_response", // 用户响应询问
  ASK_RESULT = "ask_result", // 询问处理结果
}

// 基础消息结构
export interface BaseMessage {
  type: MessageType;
  id?: string; // 消息唯一 ID
  timestamp: number; // 时间戳
}

// 连接确认消息
export interface ConnectionAckMessage extends BaseMessage {
  type: MessageType.CONNECTION_ACK;
  clientId: string;
}

// 心跳消息
export interface PingMessage extends BaseMessage {
  type: MessageType.PING;
}

export interface PongMessage extends BaseMessage {
  type: MessageType.PONG;
}

// 历史消息项（用于上下文传递）
export interface HistoryMessageItem {
  role: "user" | "assistant" | "system";
  content: string;
}

// 聊天消息
export interface ChatMessage extends BaseMessage {
  type: MessageType.CHAT_MESSAGE;
  content: string;
  conversationId?: string; // 会话 ID
  modelId?: number; // 模型配置 ID
  stream?: boolean; // 是否流式输出，默认 false
  history?: HistoryMessageItem[]; // 历史消息（滑动窗口）
  maxHistoryTokens?: number; // 最大上下文 token 数（可选）
  useTools?: boolean; // 是否启用工具（Function Calling），默认 false
  metadata?: Record<string, unknown>; // 额外元数据
}

// Agent 聊天消息（触发 ReAct 智能体）
export interface AgentChatMessage extends BaseMessage {
  type: MessageType.AGENT_CHAT;
  content: string;
  conversationId?: string; // 会话 ID
  modelId?: number; // 模型配置 ID
  history?: HistoryMessageItem[]; // 历史消息（滑动窗口）
  maxIterations?: number; // 最大迭代次数，默认 5
  knowledgeId?: string; // 知识库 ID（可选，用于知识检索）
  knowledgeMetadata?: Record<string, { name: string; description: string }>; // 知识库元数据（用于智能匹配）
}

// 聊天响应
export interface ChatResponseMessage extends BaseMessage {
  type: MessageType.CHAT_RESPONSE;
  content: string;
  conversationId?: string;
  success: boolean;
}

// 流式响应开始
export interface ChatStreamStartMessage extends BaseMessage {
  type: MessageType.CHAT_STREAM_START;
  conversationId: number;
  modelId?: number;
  modelName?: string;
}

// 流式响应内容块
export interface ChatStreamChunkMessage extends BaseMessage {
  type: MessageType.CHAT_STREAM_CHUNK;
  conversationId: number;
  content: string; // 内容块
  chunkIndex: number; // 块索引
}

// 流式响应结束
export interface ChatStreamEndMessage extends BaseMessage {
  type: MessageType.CHAT_STREAM_END;
  conversationId: number;
  fullContent: string; // 完整内容
  tokensUsed?: number; // 消耗的 token 数
}

// 聊天错误
export interface ChatErrorMessage extends BaseMessage {
  type: MessageType.CHAT_ERROR;
  error: string;
  code?: string;
  conversationId?: string;
}

// 系统状态
export interface SystemStatusMessage extends BaseMessage {
  type: MessageType.SYSTEM_STATUS;
  status: "ready" | "busy" | "error";
  message?: string;
}

// Python 服务状态
export interface PythonStatusMessage extends BaseMessage {
  type: MessageType.PYTHON_STATUS;
  status: "running" | "stopped" | "error";
  version?: string;
  pid?: number;
}

// Python 日志
export interface PythonLogMessage extends BaseMessage {
  type: MessageType.PYTHON_LOG;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

// Ollama 状态查询消息
export interface OllamaStatusMessage extends BaseMessage {
  type: MessageType.OLLAMA_STATUS;
  host?: string;
}

// Ollama 状态响应消息
export interface OllamaStatusResponseMessage extends BaseMessage {
  type: MessageType.OLLAMA_STATUS_RESPONSE;
  running: boolean;
  host: string;
  version?: string;
  error?: string;
  models?: Array<{
    name: string;
    modifiedAt: string;
    size: number;
    sizeGB: number;
    sizeMB: number;
    digest: string;
  }>;
  modelCount?: number;
}

// Ollama 模型列表查询消息
export interface OllamaModelsMessage extends BaseMessage {
  type: MessageType.OLLAMA_MODELS;
  host?: string;
}

// Ollama 模型列表响应消息
export interface OllamaModelsResponseMessage extends BaseMessage {
  type: MessageType.OLLAMA_MODELS_RESPONSE;
  success: boolean;
  host: string;
  models?: Array<{
    name: string;
    modifiedAt: string;
    size: number;
    sizeGB: number;
    sizeMB: number;
    digest: string;
  }>;
  count?: number;
  error?: string;
}

// Ollama 连接测试消息
export interface OllamaTestMessage extends BaseMessage {
  type: MessageType.OLLAMA_TEST;
  host?: string;
}

// Ollama 测试响应消息
export interface OllamaTestResponseMessage extends BaseMessage {
  type: MessageType.OLLAMA_TEST_RESPONSE;
  success: boolean;
  host: string;
  latency?: number;
  modelCount?: number;
  error?: string;
}

// ==================== Skills 技能相关消息类型 ====================

/**
 * 技能类型
 */
export type SkillType = "builtin" | "custom" | "composite";

/**
 * 技能触发方式
 */
export type SkillTrigger = "manual" | "keyword" | "intent";

/**
 * 技能信息
 */
export interface SkillInfo {
  name: string;
  displayName: string;
  description: string;
  type: SkillType;
  trigger: SkillTrigger;
  enabled: boolean;
  tags: string[];
  icon?: string;
  version: string;
  author: string;
}

/**
 * 技能列表查询消息
 */
export interface SkillListMessage extends BaseMessage {
  type: MessageType.SKILL_LIST;
}

/**
 * 技能列表响应消息
 */
export interface SkillListResponseMessage extends BaseMessage {
  type: MessageType.SKILL_LIST_RESPONSE;
  success: boolean;
  skills: SkillInfo[];
  count: number;
  error?: string;
}

/**
 * 技能执行请求消息
 */
export interface SkillExecuteMessage extends BaseMessage {
  type: MessageType.SKILL_EXECUTE;
  skillName: string;
  parameters: Record<string, unknown>;
}

/**
 * 技能执行响应消息
 */
export interface SkillExecuteResponseMessage extends BaseMessage {
  type: MessageType.SKILL_EXECUTE_RESPONSE;
  success: boolean;
  skillName: string;
  result?: string;
  error?: string;
}

/**
 * 技能重载请求消息
 */
export interface SkillReloadMessage extends BaseMessage {
  type: MessageType.SKILL_RELOAD;
  skillName?: string; // 如果为空，重载所有技能
}

/**
 * 技能重载响应消息
 */
export interface SkillReloadResponseMessage extends BaseMessage {
  type: MessageType.SKILL_RELOAD_RESPONSE;
  success: boolean;
  skillName?: string;
  message?: string;
  count?: number;
  error?: string;
}

// ==================== Knowledge 知识库相关消息类型 ====================

/**
 * 知识库信息
 */
export interface KnowledgeInfo {
  id: string;
  name: string;
  description?: string;
  embeddingModel: string;
  embeddingModelName: string;
  documentCount: number;
  totalChunks: number;
  storagePath?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 知识库文档信息
 */
export interface KnowledgeDocumentInfo {
  id: string;
  knowledgeId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  chunkCount: number;
  createdAt: number;
}

/**
 * 搜索结果
 */
export interface KnowledgeSearchResult {
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  retrievalMethod: string;
}

/**
 * 创建知识库请求消息
 */
export interface KnowledgeCreateMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_CREATE;
  name: string;
  description?: string;
  embeddingModel?: "ollama" | "openai";
  embeddingModelName?: string;
}

/**
 * 创建知识库响应消息
 */
export interface KnowledgeCreateResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_CREATE_RESPONSE;
  success: boolean;
  knowledge?: KnowledgeInfo;
  error?: string;
}

/**
 * 删除知识库请求消息
 */
export interface KnowledgeDeleteMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_DELETE;
  knowledgeId: string;
}

/**
 * 删除知识库响应消息
 */
export interface KnowledgeDeleteResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_DELETE_RESPONSE;
  success: boolean;
  knowledgeId: string;
  error?: string;
}

/**
 * 知识库列表请求消息
 */
export interface KnowledgeListMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_LIST;
}

/**
 * 知识库列表响应消息
 */
export interface KnowledgeListResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_LIST_RESPONSE;
  success: boolean;
  knowledge: KnowledgeInfo[];
  count: number;
  error?: string;
}

/**
 * 获取知识库详情请求消息
 */
export interface KnowledgeGetMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_GET;
  knowledgeId: string;
}

/**
 * 获取知识库详情响应消息
 */
export interface KnowledgeGetResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_GET_RESPONSE;
  success: boolean;
  knowledge?: KnowledgeInfo;
  error?: string;
}

/**
 * 添加文档请求消息
 */
export interface KnowledgeAddDocumentMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_ADD_DOCUMENT;
  knowledgeId: string;
  filePath: string;
}

/**
 * 添加文档响应消息
 */
export interface KnowledgeAddDocumentResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_ADD_DOCUMENT_RESPONSE;
  success: boolean;
  document?: KnowledgeDocumentInfo;
  error?: string;
}

/**
 * 删除文档请求消息
 */
export interface KnowledgeRemoveDocumentMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_REMOVE_DOCUMENT;
  knowledgeId: string;
  documentId: string;
}

/**
 * 删除文档响应消息
 */
export interface KnowledgeRemoveDocumentResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_REMOVE_DOCUMENT_RESPONSE;
  success: boolean;
  documentId: string;
  error?: string;
}

/**
 * 搜索知识库请求消息
 */
export interface KnowledgeSearchMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_SEARCH;
  knowledgeId: string;
  query: string;
  topK?: number;
  method?: "vector" | "keyword" | "hybrid";
}

/**
 * 搜索知识库响应消息
 */
export interface KnowledgeSearchResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_SEARCH_RESPONSE;
  success: boolean;
  results: KnowledgeSearchResult[];
  count: number;
  error?: string;
}

/**
 * 列出知识库文档请求消息
 */
export interface KnowledgeListDocumentsMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_LIST_DOCUMENTS;
  knowledgeId: string;
}

/**
 * 列出知识库文档响应消息
 */
export interface KnowledgeListDocumentsResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_LIST_DOCUMENTS_RESPONSE;
  success: boolean;
  documents: KnowledgeDocumentInfo[];
  count: number;
  error?: string;
}

// ==================== Knowledge Sync 消息类型 ====================

/**
 * 同步创建知识库请求（Python -> Electron）
 *
 * Agent 调用时，Python 创建 LanceDB 后通知 Electron 创建 SQLite 记录
 */
export interface KnowledgeSyncCreateMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_SYNC_CREATE;
  knowledgeId: string;
  name: string;
  description?: string;
  embeddingModel?: string;
  embeddingModelName?: string;
}

/**
 * 同步创建知识库响应
 */
export interface KnowledgeSyncCreateResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_SYNC_CREATE_RESPONSE;
  success: boolean;
  knowledgeId: string;
  error?: string;
}

/**
 * 同步删除知识库请求（Python -> Electron）
 */
export interface KnowledgeSyncDeleteMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_SYNC_DELETE;
  knowledgeId: string;
}

/**
 * 同步删除知识库响应
 */
export interface KnowledgeSyncDeleteResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_SYNC_DELETE_RESPONSE;
  success: boolean;
  knowledgeId: string;
  error?: string;
}

// ==================== Agent 相关消息类型 ====================

// 从 conversation.ts 重新导出，避免重复定义
export type { AgentStepType, AgentToolCallInfo } from "./conversation";

import type { AgentStepType, AgentToolCallInfo } from "./conversation";

/**
 * Agent 步骤消息（通用）
 *
 * 用于通知前端 Agent 的执行进度。
 * 每一步思考、工具调用、结果都会通过这个消息发送。
 */
export interface AgentStepMessage extends BaseMessage {
  type: MessageType.AGENT_STEP;
  /** 会话 ID */
  conversationId: string;
  /** 步骤类型 */
  stepType: AgentStepType;
  /** 步骤内容（人类可读的描述） */
  content: string;
  /** 工具调用信息（仅 tool_call 和 tool_result 类型时有值） */
  toolCall?: AgentToolCallInfo;
  /** 当前迭代次数 */
  iteration?: number;
}

/**
 * Agent 思考消息
 *
 * Agent 在执行过程中的思考内容
 */
export interface AgentThoughtMessage extends BaseMessage {
  type: MessageType.AGENT_THOUGHT;
  conversationId: string;
  /** 思考内容 */
  thought: string;
  /** 当前迭代次数 */
  iteration: number;
}

/**
 * Agent 工具调用消息
 *
 * Agent 决定调用某个工具时发送
 */
export interface AgentToolCallMessage extends BaseMessage {
  type: MessageType.AGENT_TOOL_CALL;
  conversationId: string;
  /** 工具调用信息 */
  toolCall: AgentToolCallInfo;
  /** 当前迭代次数 */
  iteration: number;
}

/**
 * Agent 工具结果消息
 *
 * 工具执行完毕后发送
 */
export interface AgentToolResultMessage extends BaseMessage {
  type: MessageType.AGENT_TOOL_RESULT;
  conversationId: string;
  /** 工具调用信息（包含结果） */
  toolCall: AgentToolCallInfo;
  /** 当前迭代次数 */
  iteration: number;
}

// ========== Memory 记忆消息 ==========

// 获取记忆上下文
export interface MemoryGetContextMessage extends BaseMessage {
  type: MessageType.MEMORY_GET_CONTEXT;
}

export interface MemoryGetContextResponseMessage extends BaseMessage {
  type: MessageType.MEMORY_GET_CONTEXT_RESPONSE;
  success: boolean;
  memories: Array<{
    id: number;
    memoryType: string;
    memoryKey: string;
    memoryValue: string;
    confidence: number;
  }>;
  summaries: Array<{
    id: number;
    conversationId: number;
    summary: string;
    keyTopics: string[];
  }>;
  contextPrompt: string;
}

// ========== Web Crawl 网页采集消息 ==========

/**
 * 网页采集请求消息
 */
export interface WebCrawlMessage extends BaseMessage {
  type: MessageType.WEB_CRAWL;
  url: string;
  knowledgeId: string;
  title?: string;
  chunkSize?: number;
}

/**
 * 网页采集响应消息
 */
export interface WebCrawlResponseMessage extends BaseMessage {
  type: MessageType.WEB_CRAWL_RESPONSE;
  success: boolean;
  url?: string;
  title?: string;
  chunks?: number;
  knowledgeId?: string;
  documentCount?: number;
  error?: string;
}

/**
 * 网页内容获取请求消息
 */
export interface WebFetchMessage extends BaseMessage {
  type: MessageType.WEB_FETCH;
  url: string;
  maxLength?: number;
}

/**
 * 网页内容获取响应消息
 */
export interface WebFetchResponseMessage extends BaseMessage {
  type: MessageType.WEB_FETCH_RESPONSE;
  success: boolean;
  url?: string;
  title?: string;
  content?: string;
  error?: string;
}

// ==================== Frontend Bridge 前端桥接消息类型 ====================

/**
 * 服务方法参数定义
 */
export interface BridgeMethodParam {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
  default?: unknown;
}

/**
 * 服务方法定义
 */
export interface BridgeMethod {
  service: string;
  method: string;
  description: string;
  params: BridgeMethodParam[];
  returns: string;
  example?: string;
}

/**
 * 桥接调用请求消息
 */
export interface FrontendBridgeRequestMessage extends BaseMessage {
  type: MessageType.FRONTEND_BRIDGE_REQUEST;
  /** 服务名称，如 'knowledgeService' */
  service: string;
  /** 方法名称，如 'createKnowledge' */
  method: string;
  /** 调用参数 */
  params: Record<string, unknown>;
  /** 请求 ID（用于响应匹配） */
  requestId: string;
}

/**
 * 桥接调用响应消息
 */
export interface FrontendBridgeResponseMessage extends BaseMessage {
  type: MessageType.FRONTEND_BRIDGE_RESPONSE;
  success: boolean;
  /** 请求 ID */
  requestId: string;
  /** 调用结果 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
}

/**
 * 获取可用方法列表请求消息
 */
export interface FrontendBridgeListMessage extends BaseMessage {
  type: MessageType.FRONTEND_BRIDGE_LIST;
  /** 可选：筛选指定服务 */
  service?: string;
  /** 请求 ID（用于响应匹配） */
  requestId: string;
}

/**
 * 可用方法列表响应消息
 */
export interface FrontendBridgeListResponseMessage extends BaseMessage {
  type: MessageType.FRONTEND_BRIDGE_LIST_RESPONSE;
  success: boolean;
  /** 请求 ID */
  requestId: string;
  /** 可用方法列表 */
  methods: BridgeMethod[];
  /** 方法数量 */
  count: number;
  error?: string;
}

// ==================== Knowledge Selection 知识库选择消息类型 ====================

/**
 * 附件类型
 */
export type AttachmentType = "file" | "image" | "url";

/**
 * 附件信息
 */
export interface AttachmentInfo {
  /** 附件 ID */
  id: string;
  /** 附件类型 */
  type: AttachmentType;
  /** 显示名称 */
  name: string;
  /** 文件大小（字节） */
  size?: number;
  /** MIME 类型 */
  mimeType?: string;
  /** 文件路径（本地文件） */
  path?: string;
  /** URL 地址 */
  url?: string;
  /** 缩略图（Base64 或 URL） */
  thumbnail?: string;
}

/**
 * Agent 询问是否添加到知识库消息
 *
 * 当 Agent 检测到用户粘贴了文件/图片或输入了 URL 时，
 * 先进行分析处理，然后询问用户是否需要添加到知识库
 */
export interface KnowledgeAskAddMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_ASK_ADD;
  /** 会话 ID */
  conversationId: string;
  /** 分析结果文本（AI 对文件/URL 的概要描述） */
  content: string;
  /** 附件信息 */
  attachment: AttachmentInfo;
}

/**
 * 知识库选项（用于选择卡片渲染）
 */
export interface KnowledgeOption {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  icon?: string;
}

/**
 * 请求选择知识库消息
 *
 * 用户确认要添加到知识库后，返回知识库列表供用户选择
 */
export interface KnowledgeSelectRequestMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_SELECT_REQUEST;
  /** 会话 ID */
  conversationId: string;
  /** 关联的附件 ID */
  attachmentId: string;
  /** 知识库列表 */
  knowledgeList: KnowledgeOption[];
  /** 是否允许新建知识库 */
  allowCreate?: boolean;
}

/**
 * 用户选择知识库响应消息
 *
 * 用户在前端选择知识库后，发送给后端
 * 选择后记录到消息 metadata，不可修改
 */
export interface KnowledgeSelectResponseMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_SELECT_RESPONSE;
  /** 会话 ID */
  conversationId: string;
  /** 关联的附件 ID */
  attachmentId: string;
  /** 选择的知识库 ID */
  knowledgeId: string;
  /** 选择的知识库名称 */
  knowledgeName: string;
  /** 选择时间戳 */
  selectedAt: number;
}

/**
 * 知识库添加结果消息
 *
 * 后端处理完成后通知前端结果
 */
export interface KnowledgeAddResultMessage extends BaseMessage {
  type: MessageType.KNOWLEDGE_ADD_RESULT;
  /** 会话 ID */
  conversationId: string;
  /** 是否成功 */
  success: boolean;
  /** 关联的附件 ID */
  attachmentId: string;
  /** 知识库 ID */
  knowledgeId: string;
  /** 知识库名称 */
  knowledgeName: string;
  /** 文档 ID（成功时返回） */
  documentId?: string;
  /** 文档名称 */
  documentName?: string;
  /** 分块数量 */
  chunkCount?: number;
  /** 错误信息 */
  error?: string;
}

// ==================== 通用 Ask 交互模块 ====================

/**
 * Ask 交互类型
 */
export type AskType =
  | "select" // 单选
  | "multi" // 多选
  | "confirm" // 确认（是/否）
  | "input" // 文本输入
  | "cascade" // 级联选择
  | "api_select"; // API 动态选项

/**
 * Ask 选项
 */
export interface AskOption {
  /** 选项 ID */
  id: string;
  /** 显示文本 */
  label: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 分组 */
  group?: string;
  /** 子选项（级联选择） */
  children?: AskOption[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * API 动态选项配置
 */
export interface AskApiConfig {
  /** API 端点 */
  endpoint: string;
  /** HTTP 方法 */
  method?: "GET" | "POST";
  /** 请求参数 */
  params?: Record<string, unknown>;
  /** 结果映射 */
  resultMapping?: {
    /** ID 字段路径 */
    id: string;
    /** label 字段路径 */
    label: string;
    /** 描述字段路径 */
    description?: string;
  };
}

/**
 * 输入配置
 */
export interface AskInputConfig {
  /** 占位符 */
  placeholder?: string;
  /** 默认值 */
  defaultValue?: string;
  /** 是否必填 */
  required?: boolean;
  /** 校验规则（正则表达式） */
  validate?: string;
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
}

/**
 * 后端发起询问消息
 *
 * 通用交互模式：后端发起询问 → 前端展示卡片 → 用户操作 → 返回结果
 */
export interface AskMessage extends BaseMessage {
  type: MessageType.ASK;
  /** 询问唯一标识 */
  askId: string;
  /** 交互类型 */
  askType: AskType;
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 会话 ID（可选，用于关联聊天） */
  conversationId?: string;
  /** 静态选项列表 */
  options?: AskOption[];
  /** API 动态选项配置 */
  apiConfig?: AskApiConfig;
  /** 输入配置（input 类型） */
  inputConfig?: AskInputConfig;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否只读（展示结果用） */
  readonly?: boolean;
  /** 默认值 */
  defaultValue?: string | string[] | boolean;
  /** 上下文数据（后端处理用） */
  context?: Record<string, unknown>;
}

/**
 * 用户响应询问消息
 */
export interface AskResponseMessage extends BaseMessage {
  type: MessageType.ASK_RESPONSE;
  /** 关联的询问 ID */
  askId: string;
  /** 操作类型 */
  action: "submit" | "cancel" | "timeout";
  /** 响应值
   * - select: string (选中的 ID)
   * - multi: string[] (选中的 ID 列表)
   * - confirm: boolean
   * - input: string (输入的文本)
   * - cascade: string[] (选中的路径)
   * - api_select: string
   */
  value?: string | string[] | boolean | Record<string, unknown>;
}

/**
 * 询问处理结果消息
 */
export interface AskResultMessage extends BaseMessage {
  type: MessageType.ASK_RESULT;
  /** 关联的询问 ID */
  askId: string;
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message?: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

// 保存记忆
export interface MemorySaveMessage extends BaseMessage {
  type: MessageType.MEMORY_SAVE;
  memoryType: "preference" | "project" | "task" | "fact" | "context";
  memoryKey: string;
  memoryValue: string;
  sourceConversationId?: number;
  confidence?: number;
}

export interface MemorySaveResponseMessage extends BaseMessage {
  type: MessageType.MEMORY_SAVE_RESPONSE;
  success: boolean;
  memory?: {
    id: number;
    memoryType: string;
    memoryKey: string;
    memoryValue: string;
  };
  error?: string;
}

// 创建摘要
export interface MemoryCreateSummaryMessage extends BaseMessage {
  type: MessageType.MEMORY_CREATE_SUMMARY;
  conversationId: number;
  startMessageId: number;
  endMessageId: number;
  summary: string;
  keyTopics: string[];
  messageCount: number;
}

export interface MemoryCreateSummaryResponseMessage extends BaseMessage {
  type: MessageType.MEMORY_CREATE_SUMMARY_RESPONSE;
  success: boolean;
  summary?: {
    id: number;
    conversationId: number;
    summary: string;
  };
  error?: string;
}

// 获取记忆列表
export interface MemoryListMessage extends BaseMessage {
  type: MessageType.MEMORY_LIST;
  memoryType?: "preference" | "project" | "task" | "fact" | "context";
}

export interface MemoryListResponseMessage extends BaseMessage {
  type: MessageType.MEMORY_LIST_RESPONSE;
  success: boolean;
  memories: Array<{
    id: number;
    memoryType: string;
    memoryKey: string;
    memoryValue: string;
    confidence: number;
    createdAt: number;
    updatedAt: number;
  }>;
}

// 删除记忆
export interface MemoryDeleteMessage extends BaseMessage {
  type: MessageType.MEMORY_DELETE;
  memoryId: number;
}

export interface MemoryDeleteResponseMessage extends BaseMessage {
  type: MessageType.MEMORY_DELETE_RESPONSE;
  success: boolean;
  error?: string;
}

// 生成摘要（通过 LLM）
export interface MemoryGenerateSummaryMessage extends BaseMessage {
  type: MessageType.MEMORY_GENERATE_SUMMARY;
  conversationId: number;
  messages: Array<{ role: string; content: string }>;
  modelId?: number;
}

export interface MemoryGenerateSummaryResponseMessage extends BaseMessage {
  type: MessageType.MEMORY_GENERATE_SUMMARY_RESPONSE;
  success: boolean;
  conversationId: number;
  summary?: string;
  keyTopics?: string[];
  pendingTasks?: string[];
  error?: string;
}

// 提取记忆（通过 LLM）
export interface MemoryExtractMessage extends BaseMessage {
  type: MessageType.MEMORY_EXTRACT;
  conversationId?: number;
  messages: Array<{ role: string; content: string }>;
  modelId?: number;
}

export interface MemoryExtractResponseMessage extends BaseMessage {
  type: MessageType.MEMORY_EXTRACT_RESPONSE;
  success: boolean;
  conversationId?: number;
  memories?: {
    preferences?: Record<string, string>;
    projects?: Record<string, string>;
    tasks?: Record<string, string>;
    facts?: Record<string, string>;
  };
  error?: string;
}

// 联合类型
export type WebSocketMessage =
  | ConnectionAckMessage
  | PingMessage
  | PongMessage
  | ClientIdentifyMessage
  | ChatMessage
  | AgentChatMessage
  | ChatResponseMessage
  | ChatStreamStartMessage
  | ChatStreamChunkMessage
  | ChatStreamEndMessage
  | ChatErrorMessage
  | AgentStepMessage
  | AgentThoughtMessage
  | AgentToolCallMessage
  | AgentToolResultMessage
  | SystemStatusMessage
  | PythonStatusMessage
  | PythonLogMessage
  | OllamaStatusMessage
  | OllamaStatusResponseMessage
  | OllamaModelsMessage
  | OllamaModelsResponseMessage
  | OllamaTestMessage
  | OllamaTestResponseMessage
  | SkillListMessage
  | SkillListResponseMessage
  | SkillExecuteMessage
  | SkillExecuteResponseMessage
  | SkillReloadMessage
  | SkillReloadResponseMessage
  | KnowledgeCreateMessage
  | KnowledgeCreateResponseMessage
  | KnowledgeDeleteMessage
  | KnowledgeDeleteResponseMessage
  | KnowledgeListMessage
  | KnowledgeListResponseMessage
  | KnowledgeGetMessage
  | KnowledgeGetResponseMessage
  | KnowledgeAddDocumentMessage
  | KnowledgeAddDocumentResponseMessage
  | KnowledgeRemoveDocumentMessage
  | KnowledgeRemoveDocumentResponseMessage
  | KnowledgeSearchMessage
  | KnowledgeSearchResponseMessage
  | KnowledgeListDocumentsMessage
  | KnowledgeListDocumentsResponseMessage
  | KnowledgeSyncCreateMessage
  | KnowledgeSyncCreateResponseMessage
  | KnowledgeSyncDeleteMessage
  | KnowledgeSyncDeleteResponseMessage
  | MemoryGetContextMessage
  | MemoryGetContextResponseMessage
  | MemorySaveMessage
  | MemorySaveResponseMessage
  | MemoryCreateSummaryMessage
  | MemoryCreateSummaryResponseMessage
  | MemoryListMessage
  | MemoryListResponseMessage
  | MemoryDeleteMessage
  | MemoryDeleteResponseMessage
  | MemoryGenerateSummaryMessage
  | MemoryGenerateSummaryResponseMessage
  | MemoryExtractMessage
  | MemoryExtractResponseMessage
  | WebCrawlMessage
  | WebCrawlResponseMessage
  | WebFetchMessage
  | WebFetchResponseMessage
  | FrontendBridgeRequestMessage
  | FrontendBridgeResponseMessage
  | FrontendBridgeListMessage
  | FrontendBridgeListResponseMessage
  | KnowledgeAskAddMessage
  | KnowledgeSelectRequestMessage
  | KnowledgeSelectResponseMessage
  | KnowledgeAddResultMessage
  // Ask 通用交互模块
  | AskMessage
  | AskResponseMessage
  | AskResultMessage;

// WebSocket 连接状态
export enum ConnectionState {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

// WebSocket 客户端类型
export type ClientType = "renderer" | "python_agent";

// WebSocket 客户端信息
export interface WebSocketClientInfo {
  id: string;
  clientType: ClientType; // 客户端类型
  isRenderer: boolean; // 是否是渲染进程（兼容旧字段）
  connectedAt: number;
  lastActivity: number;
}

// 客户端标识消息
export interface ClientIdentifyMessage extends BaseMessage {
  type: MessageType.CLIENT_IDENTIFY;
  clientType: ClientType;
}

// 生成唯一 ID
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 创建消息的辅助函数
export function createMessage<T extends WebSocketMessage>(
  type: MessageType,
  data: Omit<T, "type" | "timestamp" | "id">
): T {
  return {
    type,
    id: generateMessageId(),
    timestamp: Date.now(),
    ...data,
  } as T;
}
