import { contextBridge, ipcRenderer } from "electron";
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
  ConnectionState,
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
  OllamaModel,
  OllamaStatus,
  OllamaTestResult,
  // 文件相关类型
  FileMetadata,
  FileSelectResult,
  KnowledgeStorageInfo,
  KnowledgeAllStorageInfo,
  KnowledgeFileResult,
  KnowledgeFilesResult,
  KnowledgeStorageInfoResult,
  KnowledgeAllStorageInfoResult,
} from "./types";
import type { SkillInfo } from "./types/websocket";
import type {
  KnowledgeInfo,
  KnowledgeDocumentInfo,
  KnowledgeSearchResult,
  MemoryGetContextResponseMessage,
  MemorySaveResponseMessage,
  MemoryCreateSummaryResponseMessage,
  MemoryListResponseMessage,
  MemoryDeleteResponseMessage,
  MemoryGenerateSummaryResponseMessage,
} from "./types/websocket";

// WebSocket 服务器信息
export interface WsServerInfo {
  running: boolean;
  port: number;
  clientCount: number;
  pythonConnected: boolean;
}

// Skills 技能相关类型
export interface SkillListResult {
  success: boolean;
  skills: SkillInfo[];
  count: number;
  error?: string;
}

export interface SkillExecuteResult {
  success: boolean;
  skillName: string;
  result?: string;
  error?: string;
}

export interface SkillReloadResult {
  success: boolean;
  skillName?: string;
  message?: string;
  count?: number;
  error?: string;
}

// Knowledge 知识库相关类型
export interface KnowledgeCreateInput {
  name: string;
  description?: string;
  embeddingModel?: "ollama" | "openai";
  embeddingModelName?: string;
}

export interface KnowledgeListResult {
  success: boolean;
  knowledge: KnowledgeInfo[];
  count: number;
  error?: string;
}

export interface KnowledgeAddDocumentResult {
  success: boolean;
  document?: KnowledgeDocumentInfo;
  error?: string;
}

export interface KnowledgeSearchResultData {
  success: boolean;
  results: KnowledgeSearchResult[];
  count: number;
  error?: string;
}

// 重新导出类型供外部使用
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
  ConnectionState,
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
  // 文件相关类型
  FileMetadata,
  FileSelectResult,
  KnowledgeStorageInfo,
  KnowledgeAllStorageInfo,
  KnowledgeFileResult,
  KnowledgeFilesResult,
  KnowledgeStorageInfoResult,
  KnowledgeAllStorageInfoResult,
};

// OCR 相关类型
export interface OcrResult {
  success: boolean;
  text: string;
  blocks: Array<{
    text: string;
    confidence: number;
    box: number[][];
  }>;
  error?: string;
}

export interface OcrStatus {
  available: boolean;
  message: string;
}

export interface OcrSaveToKnowledgeResult {
  success: boolean;
  document_id?: string;
  file_name?: string;
  chunk_count?: number;
  error?: string;
}

// SimplePostman 相关类型
export interface PostmanProject {
  id: number;
  name: string;
  description?: string;
  baseUrl?: string;
  swaggerUrl?: string;
  authConfig?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface PostmanProjectInput {
  name: string;
  description?: string;
  baseUrl?: string;
  swaggerUrl?: string;
  authConfig?: Record<string, unknown>;
}

export interface PostmanGroup {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  baseUrl?: string;
  authConfig?: Record<string, unknown>;
  overrideGlobal: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface PostmanGroupInput {
  projectId: number;
  name: string;
  description?: string;
  baseUrl?: string;
  authConfig?: Record<string, unknown>;
  overrideGlobal?: boolean;
  sortOrder?: number;
}

export interface PostmanRequestParam {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export interface PostmanRequestHeader {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export interface PostmanRequest {
  id: number;
  groupId?: number;
  projectId: number;
  name?: string;
  method: string;
  url: string;
  params?: PostmanRequestParam[];
  headers?: PostmanRequestHeader[];
  bodyType: string;
  body?: string;
  authType: string;
  authConfig?: Record<string, unknown>;
  swaggerInfo?: Record<string, unknown>;
  llmTypes?: string; // LLM 生成的 TypeScript 类型定义
  isFavorite: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface PostmanRequestInput {
  groupId?: number;
  projectId: number;
  name?: string;
  method: string;
  url: string;
  params?: PostmanRequestParam[];
  headers?: PostmanRequestHeader[];
  bodyType?: string;
  body?: string;
  authType?: string;
  authConfig?: Record<string, unknown>;
  swaggerInfo?: Record<string, unknown>;
  isFavorite?: boolean;
  sortOrder?: number;
}

export interface PostmanHistory {
  id: number;
  requestId?: number;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseStatus: number;
  responseStatusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTime: number;
  responseSize: number;
  createdAt: number;
}

export interface PostmanHistoryInput {
  requestId?: number;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseStatus: number;
  responseStatusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTime: number;
  responseSize: number;
}

export interface PostmanSetting {
  id: number;
  key: string;
  value: Record<string, unknown>;
  updatedAt: number;
}

// Swagger 解析相关类型
export interface SwaggerParseResult {
  success: boolean;
  error?: string;
  source?: {
    type: "url" | "file";
    location: string;
  };
  specVersion?: "2.0" | "3.0" | "3.1";
  info?: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
    servers?: Array<{
      url: string;
      description?: string;
    }>;
    basePath?: string;
    host?: string;
  };
  endpoints?: Array<{
    path: string;
    method: string;
    summary?: string;
    description?: string;
    operationId?: string;
    tags: string[];
    deprecated: boolean;
    parameters: Array<{
      name: string;
      in: "query" | "header" | "path" | "cookie";
      description?: string;
      required: boolean;
      type?: string;
      format?: string;
      schema?: Record<string, unknown>;
      example?: unknown;
      defaultValue?: unknown;
      enum?: unknown[];
    }>;
    requestBody?: {
      description?: string;
      required?: boolean;
      content: Array<{
        contentType: string;
        schema?: Record<string, unknown>;
        example?: unknown;
      }>;
    };
    responses: Array<{
      statusCode: string;
      description?: string;
      content?: Array<{
        contentType: string;
        schema?: Record<string, unknown>;
        example?: unknown;
      }>;
    }>;
    security?: Array<Record<string, unknown>>;
  }>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  securitySchemes?: Record<
    string,
    {
      type: string;
      name?: string;
      in?: string;
      description?: string;
      scheme?: string;
      bearerFormat?: string;
    }
  >;
  components?: {
    schemas?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    responses?: Record<string, unknown>;
  };
  definitions?: Record<string, unknown>;
}

// 通过 contextBridge 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
  // 应用环境信息
  isPackaged: (): Promise<boolean> => ipcRenderer.invoke("app:isPackaged"),

  // 用户认证
  login: (credentials: LoginCredentials): Promise<LoginResult> =>
    ipcRenderer.invoke("user:login", credentials),
  register: (data: RegisterData): Promise<LoginResult> =>
    ipcRenderer.invoke("user:register", data),
  logout: (): Promise<boolean> => ipcRenderer.invoke("user:logout"),
  getCurrentUser: (): Promise<User | null> =>
    ipcRenderer.invoke("user:getCurrent"),
  validateToken: (token: string): Promise<User | null> =>
    ipcRenderer.invoke("user:validateToken", token),

  // 用户信息管理
  updateProfile: (data: UpdateProfileData): Promise<User | null> =>
    ipcRenderer.invoke("user:updateProfile", data),
  updatePassword: (
    data: UpdatePasswordData
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("user:updatePassword", data),
  resetPassword: (
    data: ResetPasswordData
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("user:resetPassword", data),

  // 检查状态
  isInitialized: (): Promise<boolean> =>
    ipcRenderer.invoke("user:isInitialized"),
  checkUsername: (username: string): Promise<boolean> =>
    ipcRenderer.invoke("user:checkUsername", username),

  // 存储管理
  getStorageInfo: (): Promise<StorageInfo> =>
    ipcRenderer.invoke("storage:getInfo"),
  clearCache: (): Promise<ClearCacheResult> =>
    ipcRenderer.invoke("storage:clearCache"),

  // 头像管理
  selectAvatar: (): Promise<AvatarSelectResult> =>
    ipcRenderer.invoke("avatar:select"),

  // 媒体权限管理（macOS）
  askMicrophoneAccess: (): Promise<boolean> =>
    ipcRenderer.invoke("media:askMicrophoneAccess"),
  getMicrophoneAccessStatus: (): Promise<string> =>
    ipcRenderer.invoke("media:getMicrophoneAccessStatus"),

  // WebSocket 服务
  getWsInfo: (): Promise<WsServerInfo> => ipcRenderer.invoke("ws:getInfo"),

  // Python 环境检测
  detectPython: (options?: PythonDetectOptions): Promise<PythonEnvironment> =>
    ipcRenderer.invoke("python:detect", options),
  getPythonInstallGuide: (): Promise<PythonInstallGuide> =>
    ipcRenderer.invoke("python:getInstallGuide"),
  checkAIDependencies: (): Promise<{
    installed: string[];
    missing: string[];
  }> => ipcRenderer.invoke("python:checkDependencies"),

  // Python 服务管理
  startPythonService: (
    config?: PythonServiceConfig
  ): Promise<PythonServiceStartResult> =>
    ipcRenderer.invoke("python:service:start", config),
  stopPythonService: (): Promise<PythonServiceStopResult> =>
    ipcRenderer.invoke("python:service:stop"),
  restartPythonService: (
    config?: PythonServiceConfig
  ): Promise<PythonServiceStartResult> =>
    ipcRenderer.invoke("python:service:restart", config),
  getPythonServiceInfo: (): Promise<PythonServiceInfo> =>
    ipcRenderer.invoke("python:service:getInfo"),

  // 模型配置管理
  getModelConfigs: (): Promise<ModelConfigListItem[]> =>
    ipcRenderer.invoke("model:getConfigs"),
  getModelConfigById: (id: number): Promise<ModelConfig | null> =>
    ipcRenderer.invoke("model:getById", id),
  getDefaultModelConfig: (): Promise<ModelConfig | null> =>
    ipcRenderer.invoke("model:getDefault"),
  getEnabledModelConfigs: (): Promise<ModelConfig[]> =>
    ipcRenderer.invoke("model:getEnabled"),
  createModelConfig: (input: CreateModelConfigInput): Promise<ModelConfig> =>
    ipcRenderer.invoke("model:create", input),
  updateModelConfig: (
    id: number,
    input: UpdateModelConfigInput
  ): Promise<ModelConfig | null> =>
    ipcRenderer.invoke("model:update", id, input),
  deleteModelConfig: (id: number): Promise<boolean> =>
    ipcRenderer.invoke("model:delete", id),
  setDefaultModelConfig: (id: number): Promise<boolean> =>
    ipcRenderer.invoke("model:setDefault", id),

  // 对话管理
  getConversationList: (): Promise<ConversationListItem[]> =>
    ipcRenderer.invoke("conversation:getList"),
  getGroupedConversations: (): Promise<ConversationGroup[]> =>
    ipcRenderer.invoke("conversation:getGrouped"),
  getConversationById: (id: number): Promise<Conversation | null> =>
    ipcRenderer.invoke("conversation:getById", id),
  createConversation: (input: CreateConversationInput): Promise<Conversation> =>
    ipcRenderer.invoke("conversation:create", input),
  updateConversation: (
    id: number,
    input: UpdateConversationInput
  ): Promise<Conversation | null> =>
    ipcRenderer.invoke("conversation:update", id, input),
  deleteConversation: (id: number): Promise<boolean> =>
    ipcRenderer.invoke("conversation:delete", id),

  // 消息管理
  addMessage: (input: CreateMessageInput): Promise<Message> =>
    ipcRenderer.invoke("message:add", input),
  autoSetConversationTitle: (conversationId: number): Promise<string | null> =>
    ipcRenderer.invoke("message:autoSetTitle", conversationId),
  getRecentMessages: (
    conversationId: number,
    limit?: number
  ): Promise<Message[]> =>
    ipcRenderer.invoke("message:getRecent", conversationId, limit),

  // Ollama 相关
  getOllamaStatus: (host?: string): Promise<OllamaStatus> =>
    ipcRenderer.invoke("ollama:getStatus", host),
  getOllamaModels: (host?: string): Promise<OllamaModel[]> =>
    ipcRenderer.invoke("ollama:getModels", host),
  testOllamaConnection: (host?: string): Promise<OllamaTestResult> =>
    ipcRenderer.invoke("ollama:testConnection", host),

  // Skills 技能相关
  getSkillList: (): Promise<SkillListResult> =>
    ipcRenderer.invoke("skill:getList"),
  executeSkill: (
    skillName: string,
    parameters?: Record<string, unknown>
  ): Promise<SkillExecuteResult> =>
    ipcRenderer.invoke("skill:execute", skillName, parameters),
  reloadSkills: (skillName?: string): Promise<SkillReloadResult> =>
    ipcRenderer.invoke("skill:reload", skillName),

  // Knowledge 知识库相关
  createKnowledge: (
    input: KnowledgeCreateInput
  ): Promise<KnowledgeListResult> =>
    ipcRenderer.invoke("knowledge:create", input),
  deleteKnowledge: (
    knowledgeId: string
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("knowledge:delete", knowledgeId),
  listKnowledge: (): Promise<KnowledgeListResult> =>
    ipcRenderer.invoke("knowledge:list"),
  getKnowledge: (knowledgeId: string): Promise<KnowledgeListResult> =>
    ipcRenderer.invoke("knowledge:get", knowledgeId),
  addKnowledgeDocument: (
    knowledgeId: string,
    filePath: string,
    originalFileName?: string
  ): Promise<KnowledgeAddDocumentResult> =>
    ipcRenderer.invoke(
      "knowledge:addDocument",
      knowledgeId,
      filePath,
      originalFileName
    ),
  removeKnowledgeDocument: (
    knowledgeId: string,
    documentId: string
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("knowledge:removeDocument", knowledgeId, documentId),
  searchKnowledge: (
    knowledgeId: string,
    query: string,
    topK?: number
  ): Promise<KnowledgeSearchResultData> =>
    ipcRenderer.invoke("knowledge:search", knowledgeId, query, topK),
  listKnowledgeDocuments: (
    knowledgeId: string
  ): Promise<{
    success: boolean;
    documents: KnowledgeDocumentInfo[];
    count: number;
    error?: string;
  }> => ipcRenderer.invoke("knowledge:listDocuments", knowledgeId),
  selectKnowledgeFiles: (): Promise<{
    canceled: boolean;
    filePaths: string[];
  }> => ipcRenderer.invoke("knowledge:selectFiles"),

  // Knowledge Files 知识库文件操作
  selectAndSaveKnowledgeFiles: (
    knowledgeId: string
  ): Promise<KnowledgeFilesResult> =>
    ipcRenderer.invoke("knowledge:selectAndSaveFiles", knowledgeId),
  saveFileToKnowledge: (
    knowledgeId: string,
    filePath: string
  ): Promise<KnowledgeFileResult> =>
    ipcRenderer.invoke("knowledge:saveFile", knowledgeId, filePath),
  saveFilesToKnowledge: (
    knowledgeId: string,
    filePaths: string[]
  ): Promise<KnowledgeFilesResult> =>
    ipcRenderer.invoke("knowledge:saveFiles", knowledgeId, filePaths),
  pasteFileToKnowledge: (knowledgeId: string): Promise<KnowledgeFileResult> =>
    ipcRenderer.invoke("knowledge:pasteFile", knowledgeId),
  deleteKnowledgeFile: (
    knowledgeId: string,
    fileId: string
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("knowledge:deleteFile", knowledgeId, fileId),
  getKnowledgeFileInfo: (
    knowledgeId: string,
    fileId: string
  ): Promise<KnowledgeFileResult> =>
    ipcRenderer.invoke("knowledge:getFileInfo", knowledgeId, fileId),
  getKnowledgeStorageInfo: (
    knowledgeId: string
  ): Promise<KnowledgeStorageInfoResult> =>
    ipcRenderer.invoke("knowledge:getStorageInfo", knowledgeId),
  getAllKnowledgeStorageInfo: (): Promise<KnowledgeAllStorageInfoResult> =>
    ipcRenderer.invoke("knowledge:getAllStorageInfo"),

  // 文件内容读取（用于文件预览）
  readFileContent: (
    filePath: string,
    maxSize?: number
  ): Promise<{
    success: boolean;
    content?: string;
    mimeType?: string;
    error?: string;
    truncated?: boolean;
  }> => ipcRenderer.invoke("file:readContent", filePath, maxSize),

  // Memory 记忆管理
  getMemoryContext: (): Promise<
    Omit<MemoryGetContextResponseMessage, "type" | "id" | "timestamp">
  > => ipcRenderer.invoke("memory:getContext"),
  saveMemory: (
    memoryType: string,
    memoryKey: string,
    memoryValue: string,
    sourceConversationId?: number,
    confidence?: number
  ): Promise<Omit<MemorySaveResponseMessage, "type" | "id" | "timestamp">> =>
    ipcRenderer.invoke(
      "memory:save",
      memoryType,
      memoryKey,
      memoryValue,
      sourceConversationId,
      confidence
    ),
  saveMemories: (
    memories: Array<{
      type: string;
      key: string;
      value: string;
      sourceConversationId?: number;
    }>
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("memory:saveBatch", memories),
  createSummary: (
    conversationId: number,
    startMessageId: number,
    endMessageId: number,
    summary: string,
    keyTopics: string[],
    messageCount: number
  ): Promise<
    Omit<MemoryCreateSummaryResponseMessage, "type" | "id" | "timestamp">
  > =>
    ipcRenderer.invoke(
      "memory:createSummary",
      conversationId,
      startMessageId,
      endMessageId,
      summary,
      keyTopics,
      messageCount
    ),
  listMemories: (
    memoryType?: string
  ): Promise<Omit<MemoryListResponseMessage, "type" | "id" | "timestamp">> =>
    ipcRenderer.invoke("memory:list", memoryType),
  deleteMemory: (
    memoryId: number
  ): Promise<Omit<MemoryDeleteResponseMessage, "type" | "id" | "timestamp">> =>
    ipcRenderer.invoke("memory:delete", memoryId),
  getConversationSummaries: (
    conversationId: number
  ): Promise<{
    success: boolean;
    summaries: Array<{
      id: number;
      conversationId: number;
      summary: string;
      keyTopics: string[];
    }>;
    error?: string;
  }> => ipcRenderer.invoke("memory:getSummaries", conversationId),

  // 生成摘要（通过 Python LLM 服务）
  generateSummary: (
    conversationId: number,
    messages: Array<{ role: string; content: string }>,
    modelId?: number
  ): Promise<
    Omit<MemoryGenerateSummaryResponseMessage, "type" | "id" | "timestamp">
  > =>
    ipcRenderer.invoke(
      "memory:generateSummary",
      conversationId,
      messages,
      modelId
    ),

  // OCR 识别相关
  ocrRecognize: (imageBase64: string): Promise<OcrResult> =>
    ipcRenderer.invoke("ocr:recognize", imageBase64),
  ocrRecognizeFile: (filePath: string): Promise<OcrResult> =>
    ipcRenderer.invoke("ocr:recognizeFile", filePath),
  ocrStatus: (): Promise<OcrStatus> => ipcRenderer.invoke("ocr:status"),
  ocrSaveToKnowledge: (
    knowledgeId: string,
    title: string,
    content: string
  ): Promise<OcrSaveToKnowledgeResult> =>
    ipcRenderer.invoke("ocr:saveToKnowledge", knowledgeId, title, content),

  // Swagger 解析相关
  swaggerParseUrl: (url: string): Promise<SwaggerParseResult> =>
    ipcRenderer.invoke("swagger:parseUrl", url),
  swaggerParseFile: (filePath: string): Promise<SwaggerParseResult> =>
    ipcRenderer.invoke("swagger:parseFile", filePath),
  swaggerParseContent: (
    content: string,
    format?: "json" | "yaml"
  ): Promise<SwaggerParseResult> =>
    ipcRenderer.invoke("swagger:parseContent", content, format),
  swaggerSelectFile: (): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke("swagger:selectFile"),

  // SimplePostman 项目管理
  postmanGetProjects: () => ipcRenderer.invoke("postman:getProjects"),
  postmanGetProjectById: (id: number) =>
    ipcRenderer.invoke("postman:getProjectById", id),
  postmanCreateProject: (input: Record<string, unknown>) =>
    ipcRenderer.invoke("postman:createProject", input),
  postmanUpdateProject: (id: number, input: Record<string, unknown>) =>
    ipcRenderer.invoke("postman:updateProject", id, input),
  postmanDeleteProject: (id: number) =>
    ipcRenderer.invoke("postman:deleteProject", id),

  // SimplePostman 分组管理
  postmanGetGroupsByProjectId: (projectId: number) =>
    ipcRenderer.invoke("postman:getGroupsByProjectId", projectId),
  postmanCreateGroup: (input: Record<string, unknown>) =>
    ipcRenderer.invoke("postman:createGroup", input),
  postmanUpdateGroup: (id: number, input: Record<string, unknown>) =>
    ipcRenderer.invoke("postman:updateGroup", id, input),
  postmanDeleteGroup: (id: number) =>
    ipcRenderer.invoke("postman:deleteGroup", id),

  // SimplePostman 请求管理
  postmanGetRequestsByProjectId: (projectId: number) =>
    ipcRenderer.invoke("postman:getRequestsByProjectId", projectId),
  postmanGetRequestsByGroupId: (groupId: number) =>
    ipcRenderer.invoke("postman:getRequestsByGroupId", groupId),
  postmanGetRequestById: (id: number) =>
    ipcRenderer.invoke("postman:getRequestById", id),
  postmanCreateRequest: (input: Record<string, unknown>) =>
    ipcRenderer.invoke("postman:createRequest", input),
  postmanUpdateRequest: (id: number, input: Record<string, unknown>) =>
    ipcRenderer.invoke("postman:updateRequest", id, input),
  postmanDeleteRequest: (id: number) =>
    ipcRenderer.invoke("postman:deleteRequest", id),
  postmanUpdateRequestLlmTypes: (id: number, llmTypes: string) =>
    ipcRenderer.invoke("postman:updateRequestLlmTypes", id, llmTypes),
  postmanBatchCreateRequests: (requests: Array<Record<string, unknown>>) =>
    ipcRenderer.invoke("postman:batchCreateRequests", requests),

  // SimplePostman 历史记录
  postmanAddHistory: (input: Record<string, unknown>) =>
    ipcRenderer.invoke("postman:addHistory", input),
  postmanGetHistoryList: (limit?: number) =>
    ipcRenderer.invoke("postman:getHistoryList", limit),
  postmanClearHistory: () => ipcRenderer.invoke("postman:clearHistory"),

  // SimplePostman 设置管理
  postmanGetSetting: (key: string) =>
    ipcRenderer.invoke("postman:getSetting", key),
  postmanSaveSetting: (key: string, value: Record<string, unknown>) =>
    ipcRenderer.invoke("postman:saveSetting", key, value),

  // 模块管理
  moduleGetAvailable: () => ipcRenderer.invoke("module:getAvailable"),
  moduleGetStatus: (moduleId: string) =>
    ipcRenderer.invoke("module:getStatus", moduleId),
  moduleGetAllStatus: () => ipcRenderer.invoke("module:getAllStatus"),
  moduleInstall: (moduleId: string) =>
    ipcRenderer.invoke("module:install", moduleId),
  moduleUninstall: (moduleId: string) =>
    ipcRenderer.invoke("module:uninstall", moduleId),
  moduleCancelDownload: (moduleId: string) =>
    ipcRenderer.invoke("module:cancelDownload", moduleId),

  // OCR 模块管理
  moduleStartOcr: () => ipcRenderer.invoke("module:startOcr"),
  moduleStopOcr: () => ipcRenderer.invoke("module:stopOcr"),
  moduleOcrStatus: () => ipcRenderer.invoke("module:ocrStatus"),

  // 模块下载进度监听
  onModuleDownloadProgress: (
    callback: (progress: {
      moduleId: string;
      downloaded: number;
      total: number;
      percent: number;
    }) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: {
        moduleId: string;
        downloaded: number;
        total: number;
        percent: number;
      }
    ) => callback(progress);
    ipcRenderer.on("module:downloadProgress", listener);
    return () => ipcRenderer.removeListener("module:downloadProgress", listener);
  },
});

// 类型声明
export interface ElectronAPI {
  // 应用环境信息
  isPackaged: () => Promise<boolean>;

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

  // Ollama 相关
  getOllamaStatus: (host?: string) => Promise<OllamaStatus>;
  getOllamaModels: (host?: string) => Promise<OllamaModel[]>;
  testOllamaConnection: (host?: string) => Promise<OllamaTestResult>;

  // Skills 技能相关
  getSkillList: () => Promise<SkillListResult>;
  executeSkill: (
    skillName: string,
    parameters?: Record<string, unknown>
  ) => Promise<SkillExecuteResult>;
  reloadSkills: (skillName?: string) => Promise<SkillReloadResult>;

  // Knowledge 知识库相关
  createKnowledge: (
    input: KnowledgeCreateInput
  ) => Promise<KnowledgeListResult>;
  deleteKnowledge: (
    knowledgeId: string
  ) => Promise<{ success: boolean; error?: string }>;
  listKnowledge: () => Promise<KnowledgeListResult>;
  getKnowledge: (knowledgeId: string) => Promise<KnowledgeListResult>;
  addKnowledgeDocument: (
    knowledgeId: string,
    filePath: string,
    originalFileName?: string
  ) => Promise<KnowledgeAddDocumentResult>;
  removeKnowledgeDocument: (
    knowledgeId: string,
    documentId: string
  ) => Promise<{ success: boolean; error?: string }>;
  searchKnowledge: (
    knowledgeId: string,
    query: string,
    topK?: number
  ) => Promise<KnowledgeSearchResultData>;
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

  // Knowledge Files 知识库文件操作
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
  ocrRecognize: (imageBase64: string) => Promise<OcrResult>;
  ocrRecognizeFile: (filePath: string) => Promise<OcrResult>;
  ocrStatus: () => Promise<OcrStatus>;
  ocrSaveToKnowledge: (
    knowledgeId: string,
    title: string,
    content: string
  ) => Promise<OcrSaveToKnowledgeResult>;

  // Swagger 解析相关
  swaggerParseUrl: (url: string) => Promise<SwaggerParseResult>;
  swaggerParseFile: (filePath: string) => Promise<SwaggerParseResult>;
  swaggerParseContent: (
    content: string,
    format?: "json" | "yaml"
  ) => Promise<SwaggerParseResult>;
  swaggerSelectFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;

  // SimplePostman 项目管理
  postmanGetProjects: () => Promise<PostmanProject[]>;
  postmanGetProjectById: (id: number) => Promise<PostmanProject | null>;
  postmanCreateProject: (input: PostmanProjectInput) => Promise<PostmanProject>;
  postmanUpdateProject: (
    id: number,
    input: Partial<PostmanProjectInput>
  ) => Promise<PostmanProject | null>;
  postmanDeleteProject: (id: number) => Promise<boolean>;

  // SimplePostman 分组管理
  postmanGetGroupsByProjectId: (projectId: number) => Promise<PostmanGroup[]>;
  postmanCreateGroup: (input: PostmanGroupInput) => Promise<PostmanGroup>;
  postmanUpdateGroup: (
    id: number,
    input: Partial<PostmanGroupInput>
  ) => Promise<PostmanGroup | null>;
  postmanDeleteGroup: (id: number) => Promise<boolean>;

  // SimplePostman 请求管理
  postmanGetRequestsByProjectId: (
    projectId: number
  ) => Promise<PostmanRequest[]>;
  postmanGetRequestsByGroupId: (groupId: number) => Promise<PostmanRequest[]>;
  postmanGetRequestById: (id: number) => Promise<PostmanRequest | null>;
  postmanCreateRequest: (input: PostmanRequestInput) => Promise<PostmanRequest>;
  postmanUpdateRequest: (
    id: number,
    input: Partial<PostmanRequestInput>
  ) => Promise<PostmanRequest | null>;
  postmanDeleteRequest: (id: number) => Promise<boolean>;
  postmanUpdateRequestLlmTypes: (
    id: number,
    llmTypes: string
  ) => Promise<PostmanRequest | null>;
  postmanBatchCreateRequests: (
    requests: PostmanRequestInput[]
  ) => Promise<PostmanRequest[]>;

  // SimplePostman 历史记录
  postmanAddHistory: (input: PostmanHistoryInput) => Promise<PostmanHistory>;
  postmanGetHistoryList: (limit?: number) => Promise<PostmanHistory[]>;
  postmanClearHistory: () => Promise<boolean>;

  // SimplePostman 设置管理
  postmanGetSetting: (key: string) => Promise<PostmanSetting | null>;
  postmanSaveSetting: (
    key: string,
    value: Record<string, unknown>
  ) => Promise<PostmanSetting>;

  // 模块管理
  moduleGetAvailable: () => Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      size: number;
      capabilities: string[];
      latestVersion: string;
      downloadUrl: string;
    }>
  >;
  moduleGetStatus: (moduleId: string) => Promise<{
    id: string;
    installed: boolean;
    version?: string;
    size?: number;
    downloadProgress?: number;
    status: "not_installed" | "downloading" | "installing" | "installed" | "error";
    error?: string;
  }>;
  moduleGetAllStatus: () => Promise<
    Record<
      string,
      {
        id: string;
        installed: boolean;
        version?: string;
        size?: number;
        status: "not_installed" | "downloading" | "installing" | "installed" | "error";
        error?: string;
      }
    >
  >;
  moduleInstall: (moduleId: string) => Promise<{ success: boolean; error?: string }>;
  moduleUninstall: (moduleId: string) => Promise<{ success: boolean; error?: string }>;
  moduleCancelDownload: (moduleId: string) => Promise<boolean>;

  // OCR 模块管理
  moduleStartOcr: () => Promise<{ success: boolean; port?: number; error?: string }>;
  moduleStopOcr: () => Promise<void>;
  moduleOcrStatus: () => Promise<{
    installed: boolean;
    running: boolean;
    port: number | null;
    version?: string;
  }>;

  // 模块下载进度监听
  onModuleDownloadProgress: (
    callback: (progress: {
      moduleId: string;
      downloaded: number;
      total: number;
      percent: number;
    }) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
