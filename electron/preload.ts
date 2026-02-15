import { contextBridge, ipcRenderer } from "electron";

// 用户信息接口
export interface User {
  id: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  gender: number;
  bio: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  settings: string | null;
}

// 登录结果
export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// 登录凭证
export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

// 注册数据
export interface RegisterData {
  username: string;
  password: string;
  nickname?: string;
}

// 更新资料数据
export interface UpdateProfileData {
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  gender?: number;
  bio?: string;
}

// 更新密码数据
export interface UpdatePasswordData {
  oldPassword: string;
  newPassword: string;
}

// 重置密码数据
export interface ResetPasswordData {
  username: string;
  newPassword: string;
}

// 存储信息接口
export interface StorageInfo {
  cacheSize: number;
  totalSize: number;
  cachePath: string;
  dataSize: number;
  logsSize: number;
}

// 清理缓存结果
export interface ClearCacheResult {
  success: boolean;
  clearedSize: number;
  error?: string;
}

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
