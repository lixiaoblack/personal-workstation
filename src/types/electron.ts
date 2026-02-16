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
  type WebSocketMessage,
  type ChatMessage,
  type ChatResponseMessage,
  type ChatStreamMessage,
  type ChatErrorMessage,
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
} from "../../electron/types";

// WebSocket 服务器信息
export interface WsServerInfo {
  running: boolean;
  port: number;
  clientCount: number;
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
