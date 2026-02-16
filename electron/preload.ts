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
} from "./types";

// WebSocket 服务器信息
export interface WsServerInfo {
  running: boolean;
  port: number;
  clientCount: number;
  pythonConnected: boolean;
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
};

// 通过 contextBridge 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
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

  // Ollama 相关
  getOllamaStatus: (host?: string): Promise<OllamaStatus> =>
    ipcRenderer.invoke("ollama:getStatus", host),
  getOllamaModels: (host?: string): Promise<OllamaModel[]> =>
    ipcRenderer.invoke("ollama:getModels", host),
  testOllamaConnection: (host?: string): Promise<OllamaTestResult> =>
    ipcRenderer.invoke("ollama:testConnection", host),
});

// 类型声明
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

  // Ollama 相关
  getOllamaStatus: (host?: string) => Promise<OllamaStatus>;
  getOllamaModels: (host?: string) => Promise<OllamaModel[]>;
  testOllamaConnection: (host?: string) => Promise<OllamaTestResult>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
