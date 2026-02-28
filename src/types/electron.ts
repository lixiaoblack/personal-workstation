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
  KnowledgeAskAddMessage,
  KnowledgeSelectRequestMessage,
  KnowledgeSelectResponseMessage,
  KnowledgeAddResultMessage,
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
    status:
      | "not_installed"
      | "downloading"
      | "installing"
      | "installed"
      | "error";
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
        status:
          | "not_installed"
          | "downloading"
          | "installing"
          | "installed"
          | "error";
        error?: string;
      }
    >
  >;
  moduleInstall: (
    moduleId: string
  ) => Promise<{ success: boolean; error?: string }>;
  moduleUninstall: (
    moduleId: string
  ) => Promise<{ success: boolean; error?: string }>;
  moduleCancelDownload: (moduleId: string) => Promise<boolean>;

  // OCR 模块管理
  moduleStartOcr: () => Promise<{
    success: boolean;
    port?: number;
    error?: string;
  }>;
  moduleStopOcr: () => Promise<void>;
  moduleOcrStatus: () => Promise<{
    installed: boolean;
    running: boolean;
    port: number | null;
    version?: string;
    ocrAvailable?: boolean;
    error?: string;
  }>;

  // ========== Notes 笔记模块 ==========

  // 设置管理
  notesGetSetting: (key: string) => Promise<string | null>;
  notesSaveSetting: (key: string, value: string) => Promise<boolean>;
  notesGetRootPath: () => Promise<string | null>;
  notesSetRootPath: (rootPath: string) => Promise<boolean>;
  notesHasRootPath: () => Promise<boolean>;

  // 文件夹选择
  notesSelectFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  notesValidateFolder: (
    folderPath: string
  ) => Promise<{ valid: boolean; error?: string }>;

  // 文件扫描
  notesScanFolder: (rootPath: string) => Promise<{
    success: boolean;
    fileCount: number;
    folderCount: number;
    error?: string;
  }>;
  notesGetFileTree: () => Promise<NotesFileTreeNode[]>;

  // 文件操作
  notesCreateFolder: (
    parentPath: string | null,
    folderName: string
  ) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
    exists?: boolean;
  }>;
  notesCreateFolderForce: (
    parentPath: string | null,
    folderName: string,
    mode: "overwrite" | "copy"
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  notesCreateNote: (
    parentPath: string | null,
    fileName: string,
    content?: string
  ) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
    exists?: boolean;
  }>;
  notesCreateNoteForce: (
    parentPath: string | null,
    fileName: string,
    mode: "overwrite" | "copy",
    content?: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  notesReadFile: (
    filePath: string
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
  notesSaveFile: (
    filePath: string,
    content: string
  ) => Promise<{ success: boolean; error?: string }>;
  notesRenameItem: (
    oldPath: string,
    newName: string
  ) => Promise<{ success: boolean; newPath?: string; error?: string }>;
  notesDeleteItem: (
    itemPath: string
  ) => Promise<{ success: boolean; error?: string }>;
  notesGetFileInfo: (
    filePath: string
  ) => Promise<{ success: boolean; file?: NotesFileMetadata; error?: string }>;

  // ========== Todo 待办模块 ==========

  // 分类管理
  todoListCategories: () => Promise<TodoCategory[]>;
  todoGetCategory: (id: number) => Promise<TodoCategory | null>;
  todoCreateCategory: (
    input: TodoCategoryInput
  ) => Promise<TodoCategory | null>;
  todoUpdateCategory: (
    id: number,
    input: Partial<TodoCategoryInput>
  ) => Promise<TodoCategory | null>;
  todoDeleteCategory: (id: number) => Promise<boolean>;
  todoGetCategoryStats: () => Promise<
    Array<{ categoryId: number | null; count: number }>
  >;

  // Todo 管理
  todoListTodos: (filter?: TodoFilter) => Promise<Todo[]>;
  todoGetTodo: (id: number) => Promise<Todo | null>;
  todoCreateTodo: (input: TodoInput) => Promise<Todo | null>;
  todoUpdateTodo: (id: number, input: TodoUpdateInput) => Promise<Todo | null>;
  todoDeleteTodo: (id: number) => Promise<boolean>;
  todoBatchUpdateStatus: (ids: number[], status: TodoStatus) => Promise<number>;
  todoBatchDelete: (ids: number[]) => Promise<number>;
  todoGetSubTasks: (parentId: number) => Promise<Todo[]>;
  todoGetTodayTodos: () => Promise<Todo[]>;
  todoGetOverdueTodos: () => Promise<Todo[]>;
  todoGetUpcomingTodos: (days?: number) => Promise<Todo[]>;
  todoGetStats: () => Promise<TodoStats>;
  todoTestNotification: () => Promise<boolean>;

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

// Swagger 解析结果类型
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
        generatedExample?: Record<string, unknown>;
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

// Notes 笔记模块相关类型
export interface NotesFileTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: NotesFileTreeNode[];
  expanded?: boolean;
  active?: boolean;
}

export interface NotesFileMetadata {
  id: number;
  path: string;
  name: string;
  parentPath: string | null;
  type: "file" | "folder";
  contentHash: string | null;
  fileMtime: number | null;
  vectorDocIds: string | null;
  chunkCount: number;
  lastSyncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// Todo 待办模块相关类型
export type TodoPriority = "low" | "medium" | "high" | "urgent";
export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TodoRepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface TodoCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface TodoCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export interface Todo {
  id: number;
  title: string;
  description?: string;
  categoryId?: number;
  category?: TodoCategory;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate?: number;
  reminderTime?: number;
  repeatType: TodoRepeatType;
  repeatConfig?: Record<string, unknown>;
  parentId?: number;
  tags?: string[];
  sortOrder: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  subTasks?: Todo[];
}

export interface TodoInput {
  title: string;
  description?: string;
  categoryId?: number;
  priority?: TodoPriority;
  status?: TodoStatus;
  dueDate?: number;
  reminderTime?: number;
  repeatType?: TodoRepeatType;
  repeatConfig?: Record<string, unknown>;
  parentId?: number;
  tags?: string[];
  sortOrder?: number;
}

export interface TodoUpdateInput {
  title?: string;
  description?: string;
  categoryId?: number;
  priority?: TodoPriority;
  status?: TodoStatus;
  dueDate?: number;
  reminderTime?: number;
  repeatType?: TodoRepeatType;
  repeatConfig?: Record<string, unknown>;
  parentId?: number;
  tags?: string[];
  sortOrder?: number;
}

export interface TodoFilter {
  status?: TodoStatus;
  priority?: TodoPriority;
  categoryId?: number;
  parentId?: number;
  dueDateFrom?: number;
  dueDateTo?: number;
  search?: string;
}

export interface TodoStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  todayDue: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
