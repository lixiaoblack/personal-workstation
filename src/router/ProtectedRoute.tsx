/**
 * ProtectedRoute 路由守卫组件
 * 保护需要登录才能访问的路由
 */
import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  const location = useLocation();

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
          <p className="mt-4 text-text-secondary">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果系统未初始化，跳转到登录/注册页
  if (!isInitialized) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 如果未登录，跳转到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 已登录，渲染子组件或 Outlet
  return children ? <>{children}</> : <Outlet />;
};

export { ProtectedRoute };
export default ProtectedRoute;
