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
  executeSkill: (skillName: string, parameters?: Record<string, unknown>) => Promise<{
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
