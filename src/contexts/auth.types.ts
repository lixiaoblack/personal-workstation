/**
 * 认证上下文类型定义
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

// 认证上下文值
export interface AuthContextValue {
  // 状态
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // 方法
  login: (
    credentials: LoginCredentials
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    data: RegisterData
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (
    data: UpdateProfileData
  ) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (
    data: UpdatePasswordData
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    data: ResetPasswordData
  ) => Promise<{ success: boolean; error?: string }>;
  checkUsername: (username: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

// Token 存储键
export const AUTH_TOKEN_KEY = "auth_token";
