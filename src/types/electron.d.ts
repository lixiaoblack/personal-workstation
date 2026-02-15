/**
 * Electron API 类型声明
 * 用于渲染进程访问主进程暴露的 API
 */

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
