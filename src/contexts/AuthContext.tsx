/**
 * 认证上下文
 * 管理用户认证状态，提供登录、注册、登出等功能
 */
import React, { createContext, useEffect, useState, useCallback } from "react";
import type {
  User,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  UpdatePasswordData,
  ResetPasswordData,
  AuthContextValue,
} from "./auth.types";
import { AUTH_TOKEN_KEY } from "./auth.types";

// 创建上下文
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * 认证提供者组件
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 状态
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // 检查系统是否已初始化
  const checkInitialized = useCallback(async () => {
    try {
      const initialized = await window.electronAPI.isInitialized();
      setIsInitialized(initialized);
      return initialized;
    } catch {
      setIsInitialized(false);
      return false;
    }
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await window.electronAPI.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  }, []);

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // 检查是否已初始化
        const initialized = await checkInitialized();
        
        if (initialized) {
          // 尝试从本地存储恢复 token
          const token = localStorage.getItem(AUTH_TOKEN_KEY);
          if (token) {
            const validatedUser = await window.electronAPI.validateToken(token);
            if (validatedUser) {
              setUser(validatedUser);
            } else {
              // Token 无效，清除
              localStorage.removeItem(AUTH_TOKEN_KEY);
            }
          }
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [checkInitialized]);

  // 登录
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const result = await window.electronAPI.login(credentials);
      
      if (result.success && result.user && result.token) {
        setUser(result.user);
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
        return { success: true };
      }
      
      return { success: false, error: result.error || '登录失败' };
    } catch (error) {
      return { success: false, error: '登录过程中发生错误' };
    }
  }, []);

  // 注册
  const register = useCallback(async (data: RegisterData) => {
    try {
      const result = await window.electronAPI.register(data);
      
      if (result.success && result.user && result.token) {
        setUser(result.user);
        localStorage.setItem(AUTH_TOKEN_KEY, result.token);
        setIsInitialized(true);
        return { success: true };
      }
      
      return { success: false, error: result.error || '注册失败' };
    } catch (error) {
      return { success: false, error: '注册过程中发生错误' };
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      await window.electronAPI.logout();
    } catch {
      // 忽略登出错误
    } finally {
      setUser(null);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, []);

  // 更新资料
  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    try {
      const updatedUser = await window.electronAPI.updateProfile(data);
      
      if (updatedUser) {
        setUser(updatedUser);
        return { success: true };
      }
      
      return { success: false, error: '更新失败' };
    } catch (error) {
      return { success: false, error: '更新过程中发生错误' };
    }
  }, []);

  // 更新密码
  const updatePassword = useCallback(async (data: UpdatePasswordData) => {
    try {
      const result = await window.electronAPI.updatePassword(data);
      
      if (result.success) {
        // 密码更新成功，需要重新登录
        setUser(null);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      
      return result;
    } catch (error) {
      return { success: false, error: '更新密码过程中发生错误' };
    }
  }, []);

  // 重置密码
  const resetPassword = useCallback(async (data: ResetPasswordData) => {
    try {
      return await window.electronAPI.resetPassword(data);
    } catch (error) {
      return { success: false, error: '重置密码过程中发生错误' };
    }
  }, []);

  // 检查用户名是否存在
  const checkUsername = useCallback(async (username: string) => {
    try {
      return await window.electronAPI.checkUsername(username);
    } catch {
      return false;
    }
  }, []);

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    resetPassword,
    checkUsername,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
