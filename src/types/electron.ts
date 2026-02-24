/**
 * Electron API 类型声明
 * 用于渲染进程访问主进程暴露的 API
 */

// 从主进程类型定义导入类型
export type {
  User,
  LoginResult,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  UpdatePasswordData,
  ResetPasswordData,
  StorageInfo,
  ClearCacheResult,
  AvatarSelectResult,
  WebSocketMessage,
  ChatMessage,
  AgentChatMessage,
  ChatResponseMessage,
  ChatStreamStartMessage,
  ChatStreamChunkMessage,
  ChatStreamEndMessage,
  ChatErrorMessage,
  HistoryMessageItem,
  // Agent 相关类型
  AgentStepType,
  AgentToolCallInfo,
  AgentStepMessage,
  AgentThoughtMessage,
  AgentToolCallMessage,
  AgentToolResultMessage,
  // 消息元数据类型
  MessageMetadata,
  AgentStepData,
  PythonEnvironment,
  PythonDetectOptions,
  PythonInstallGuide,
  PythonServiceConfig,
  PythonServiceInfo,
  PythonServiceStartResult,
  PythonServiceStopResult,
  ModelConfig,
  ModelConfigListItem,
  OnlineModelConfig,
  OllamaModelConfig,
  ModelProvider,
  ModelConfigStatus,
  ModelUsageType,
  CreateModelConfigInput,
  UpdateModelConfigInput,
  Conversation,
  ConversationListItem,
  ConversationGroup,
  CreateConversationInput,
  UpdateConversationInput,
  Message,
  CreateMessageInput,
  MessageRole,
  StreamStatus,
  StreamState,
  OllamaModel,
  OllamaStatus,
  OllamaTestResult,
  // Skills 技能相关类型
  SkillInfo,
  SkillType,
  SkillTrigger,
  // Knowledge 知识库相关类型
  KnowledgeInfo,
  KnowledgeDocumentInfo,
  KnowledgeSearchResult,
  OcrBlock,
  // Knowledge Selection 知识库选择相关类型
  AttachmentInfo,
  AttachmentType,
  KnowledgeOption,
  // Ask 通用交互模块类型
  AskType,
  AskOption,
  AskApiConfig,
  AskInputConfig,
  AskMessage,
  AskResponseMessage,
  AskResultMessage,
  // Memory 记忆相关类型
  MemoryGetContextResponseMessage,
  MemorySaveResponseMessage,
  MemoryCreateSummaryResponseMessage,
  MemoryListResponseMessage,
  MemoryDeleteResponseMessage,
  MemoryGenerateSummaryResponseMessage,
  // 文件相关类型
  FileMetadata,
  FileSelectResult,
  KnowledgeStorageInfo,
  KnowledgeAllStorageInfo,
  KnowledgeFileResult,
  KnowledgeFilesResult,
  KnowledgeStorageInfoResult,
  KnowledgeAllStorageInfoResult,
} from "../../electron/types";

// 枚举需要重新导出（因为需要作为值使用）
export { MessageType, ConnectionState } from "../../electron/types";

// 辅助函数导出
export { createMessage } from "../../electron/types/websocket";

// 从主进程导入类型用于 ElectronAPI 定义
import type {
  User,
  LoginResult,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  UpdatePasswordData,
  ResetPasswordData,
  StorageInfo,
  ClearCacheResult,
  AvatarSelectResult,
  PythonEnvironment,
  PythonDetectOptions,
  PythonInstallGuide,
  PythonServiceConfig,
  PythonServiceInfo,
  PythonServiceStartResult,
  PythonServiceStopResult,
  ModelConfig,
  ModelConfigListItem,
  CreateModelConfigInput,
  UpdateModelConfigInput,
  Conversation,
  ConversationListItem,
  ConversationGroup,
  CreateConversationInput,
  UpdateConversationInput,
  Message,
  CreateMessageInput,
  OllamaStatus,
  OllamaModel,
  OllamaTestResult,
  SkillInfo,
  KnowledgeInfo,
  KnowledgeDocumentInfo,
  KnowledgeSearchResult,
  MemoryGetContextResponseMessage,
  MemorySaveResponseMessage,
  MemoryCreateSummaryResponseMessage,
  MemoryListResponseMessage,
  MemoryDeleteResponseMessage,
  MemoryGenerateSummaryResponseMessage,
  // 文件相关类型
  KnowledgeFileResult,
  KnowledgeFilesResult,
  KnowledgeStorageInfoResult,
  KnowledgeAllStorageInfoResult,
} from "../../electron/types";

// WebSocket 服务器信息
export interface WsServerInfo {
  running: boolean;
  port: number;
  clientCount: number;
  pythonConnected: boolean;
}

// Electron API 接口
export interface ElectronAPI {
  // 用户认证
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<LoginResult>;
  logout: () => Promise<boolean>;
  getCurrentUser: () => Promise<User | null>;
  validateToken: (token: string) => Promise<User | null>;

  // 用户信息管理
  updateProfile: (data: UpdateProfileData) => Promise<User | null>;
  updatePassword: (
    data: UpdatePasswordData
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    data: ResetPasswordData
  ) => Promise<{ success: boolean; error?: string }>;

  // 检查状态
  isInitialized: () => Promise<boolean>;
  checkUsername: (username: string) => Promise<boolean>;

  // 存储管理
  getStorageInfo: () => Promise<StorageInfo>;
  clearCache: () => Promise<ClearCacheResult>;

  // 头像管理
  selectAvatar: () => Promise<AvatarSelectResult>;

  // 媒体权限管理（macOS）
  askMicrophoneAccess: () => Promise<boolean>;
  getMicrophoneAccessStatus: () => Promise<string>;

  // WebSocket 服务
  getWsInfo: () => Promise<WsServerInfo>;

  // Python 环境检测
  detectPython: (options?: PythonDetectOptions) => Promise<PythonEnvironment>;
  getPythonInstallGuide: () => Promise<PythonInstallGuide>;
  checkAIDependencies: () => Promise<{
    installed: string[];
    missing: string[];
  }>;

  // Python 服务管理
  startPythonService: (
    config?: PythonServiceConfig
  ) => Promise<PythonServiceStartResult>;
  stopPythonService: () => Promise<PythonServiceStopResult>;
  restartPythonService: (
    config?: PythonServiceConfig
  ) => Promise<PythonServiceStartResult>;
  getPythonServiceInfo: () => Promise<PythonServiceInfo>;

  // 模型配置管理
  getModelConfigs: () => Promise<ModelConfigListItem[]>;
  getModelConfigById: (id: number) => Promise<ModelConfig | null>;
  getDefaultModelConfig: () => Promise<ModelConfig | null>;
  getEnabledModelConfigs: () => Promise<ModelConfig[]>;
  createModelConfig: (input: CreateModelConfigInput) => Promise<ModelConfig>;
  updateModelConfig: (
    id: number,
    input: UpdateModelConfigInput
  ) => Promise<ModelConfig | null>;
  deleteModelConfig: (id: number) => Promise<boolean>;
  setDefaultModelConfig: (id: number) => Promise<boolean>;

  // 对话管理
  getConversationList: () => Promise<ConversationListItem[]>;
  getGroupedConversations: () => Promise<ConversationGroup[]>;
  getConversationById: (id: number) => Promise<Conversation | null>;
  createConversation: (input: CreateConversationInput) => Promise<Conversation>;
  updateConversation: (
    id: number,
    input: UpdateConversationInput
  ) => Promise<Conversation | null>;
  deleteConversation: (id: number) => Promise<boolean>;

  // 消息管理
  addMessage: (input: CreateMessageInput) => Promise<Message>;
  autoSetConversationTitle: (conversationId: number) => Promise<string | null>;
  getRecentMessages: (
    conversationId: number,
    limit?: number
  ) => Promise<Message[]>;

  // Ollama 相关 API
  getOllamaStatus: (host?: string) => Promise<OllamaStatus>;
  getOllamaModels: (host?: string) => Promise<OllamaModel[]>;
  testOllamaConnection: (host?: string) => Promise<OllamaTestResult>;

  // Skills 技能相关 API
  getSkillList: () => Promise<{
    success: boolean;
    skills: SkillInfo[];
    count: number;
    error?: string;
  }>;
  executeSkill: (
    skillName: string,
    parameters?: Record<string, unknown>
  ) => Promise<{
    success: boolean;
    skillName: string;
    result?: string;
    error?: string;
  }>;
  reloadSkills: (skillName?: string) => Promise<{
    success: boolean;
    skillName?: string;
    message?: string;
    count?: number;
    error?: string;
  }>;

  // Knowledge 知识库相关 API
  createKnowledge: (input: {
    name: string;
    description?: string;
    embeddingModel?: "ollama" | "openai";
    embeddingModelName?: string;
  }) => Promise<{
    success: boolean;
    knowledge: KnowledgeInfo[];
    count: number;
    error?: string;
  }>;
  deleteKnowledge: (
    knowledgeId: string
  ) => Promise<{ success: boolean; error?: string }>;
  listKnowledge: () => Promise<{
    success: boolean;
    knowledge: KnowledgeInfo[];
    count: number;
    error?: string;
  }>;
  getKnowledge: (knowledgeId: string) => Promise<{
    success: boolean;
    knowledge: KnowledgeInfo[];
    count: number;
    error?: string;
  }>;
  addKnowledgeDocument: (
    knowledgeId: string,
    filePath: string,
    originalFileName?: string
  ) => Promise<{
    success: boolean;
    document?: KnowledgeDocumentInfo;
    error?: string;
    warning?: string;
  }>;
  removeKnowledgeDocument: (
    knowledgeId: string,
    documentId: string
  ) => Promise<{ success: boolean; error?: string }>;
  searchKnowledge: (
    knowledgeId: string,
    query: string,
    topK?: number
  ) => Promise<{
    success: boolean;
    results: KnowledgeSearchResult[];
    count: number;
    error?: string;
  }>;
  listKnowledgeDocuments: (knowledgeId: string) => Promise<{
    success: boolean;
    documents: KnowledgeDocumentInfo[];
    count: number;
    error?: string;
  }>;
  selectKnowledgeFiles: () => Promise<{
    canceled: boolean;
    filePaths: string[];
  }>;

  // Knowledge Files 知识库文件操作 API
  selectAndSaveKnowledgeFiles: (
    knowledgeId: string
  ) => Promise<KnowledgeFilesResult>;
  saveFileToKnowledge: (
    knowledgeId: string,
    filePath: string
  ) => Promise<KnowledgeFileResult>;
  saveFilesToKnowledge: (
    knowledgeId: string,
    filePaths: string[]
  ) => Promise<KnowledgeFilesResult>;
  pasteFileToKnowledge: (knowledgeId: string) => Promise<KnowledgeFileResult>;
  deleteKnowledgeFile: (
    knowledgeId: string,
    fileId: string
  ) => Promise<{ success: boolean; error?: string }>;
  getKnowledgeFileInfo: (
    knowledgeId: string,
    fileId: string
  ) => Promise<KnowledgeFileResult>;
  getKnowledgeStorageInfo: (
    knowledgeId: string
  ) => Promise<KnowledgeStorageInfoResult>;
  getAllKnowledgeStorageInfo: () => Promise<KnowledgeAllStorageInfoResult>;

  // 文件内容读取（用于文件预览）
  readFileContent: (
    filePath: string,
    maxSize?: number
  ) => Promise<{
    success: boolean;
    content?: string;
    mimeType?: string;
    error?: string;
    truncated?: boolean;
  }>;

  // Memory 记忆管理
  getMemoryContext: () => Promise<
    Omit<MemoryGetContextResponseMessage, "type" | "id" | "timestamp">
  >;
  saveMemory: (
    memoryType: string,
    memoryKey: string,
    memoryValue: string,
    sourceConversationId?: number,
    confidence?: number
  ) => Promise<Omit<MemorySaveResponseMessage, "type" | "id" | "timestamp">>;
  saveMemories: (
    memories: Array<{
      type: string;
      key: string;
      value: string;
      sourceConversationId?: number;
    }>
  ) => Promise<{ success: boolean; error?: string }>;
  createSummary: (
    conversationId: number,
    startMessageId: number,
    endMessageId: number,
    summary: string,
    keyTopics: string[],
    messageCount: number
  ) => Promise<
    Omit<MemoryCreateSummaryResponseMessage, "type" | "id" | "timestamp">
  >;
  listMemories: (
    memoryType?: string
  ) => Promise<Omit<MemoryListResponseMessage, "type" | "id" | "timestamp">>;
  deleteMemory: (
    memoryId: number
  ) => Promise<Omit<MemoryDeleteResponseMessage, "type" | "id" | "timestamp">>;
  getConversationSummaries: (conversationId: number) => Promise<{
    success: boolean;
    summaries: Array<{
      id: number;
      conversationId: number;
      summary: string;
      keyTopics: string[];
    }>;
    error?: string;
  }>;
  generateSummary: (
    conversationId: number,
    messages: Array<{ role: string; content: string }>,
    modelId?: number
  ) => Promise<
    Omit<MemoryGenerateSummaryResponseMessage, "type" | "id" | "timestamp">
  >;

  // OCR 识别相关
  ocrRecognize: (imageBase64: string) => Promise<{
    success: boolean;
    text: string;
    blocks: Array<{
      text: string;
      confidence: number;
      box: number[][];
    }>;
    error?: string;
  }>;
  ocrRecognizeFile: (filePath: string) => Promise<{
    success: boolean;
    text: string;
    blocks: Array<{
      text: string;
      confidence: number;
      box: number[][];
    }>;
    error?: string;
  }>;
  ocrStatus: () => Promise<{
    available: boolean;
    message: string;
  }>;
  ocrSaveToKnowledge: (
    knowledgeId: string,
    title: string,
    content: string
  ) => Promise<{
    success: boolean;
    document_id?: string;
    file_name?: string;
    chunk_count?: number;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
