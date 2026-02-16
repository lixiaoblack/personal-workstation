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
} from "./types";

// WebSocket 服务器信息
export interface WsServerInfo {
  running: boolean;
  port: number;
  clientCount: number;
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
  checkAIDependencies: (): Promise<{ installed: string[]; missing: string[] }> =>
    ipcRenderer.invoke("python:checkDependencies"),
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
  checkAIDependencies: () => Promise<{ installed: string[]; missing: string[] }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
