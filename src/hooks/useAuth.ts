/**
 * 认证 Hook
 * 提供认证状态和方法
 */
import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import type { AuthContextValue } from "@/contexts/auth.types";

/**
 * 获取认证上下文
 * @returns 认证上下文值
 * @throws 如果不在 AuthProvider 内使用会抛出错误
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default useAuth;
