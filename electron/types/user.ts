/**
 * 用户相关类型定义
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
