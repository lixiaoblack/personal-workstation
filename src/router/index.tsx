/**
 * 路由配置文件
 * 管理应用的所有路由
 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

// 页面组件
import Home from "@/views/Home";
import Login from "@/views/Login";
import ForgotPassword from "@/views/ForgotPassword";

// 路由守卫
import ProtectedRoute from "./ProtectedRoute";

// 受保护的路由包装器
const ProtectedWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

// 公开路由（无需登录）
const publicRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
];

// 受保护的路由（需要登录）
const protectedRoutes: RouteObject[] = [
  {
    path: "/",
    element: (
      <ProtectedWrapper>
        <Home />
      </ProtectedWrapper>
    ),
  },
  {
    path: "/dashboard",
    element: <Navigate to="/" replace />,
  },
  // 开发者工具
  {
    path: "/developer",
    element: (
      <ProtectedWrapper>
        <div className="flex items-center justify-center h-full text-white">
          开发者工具 - 开发中
        </div>
      </ProtectedWrapper>
    ),
  },
  // GIS 专业工具
  {
    path: "/gis",
    element: (
      <ProtectedWrapper>
        <div className="flex items-center justify-center h-full text-white">
          GIS 专业工具 - 开发中
        </div>
      </ProtectedWrapper>
    ),
  },
  // 工作日志
  {
    path: "/journal",
    element: (
      <ProtectedWrapper>
        <div className="flex items-center justify-center h-full text-white">
          工作日志 - 开发中
        </div>
      </ProtectedWrapper>
    ),
  },
  // 记事本
  {
    path: "/notes",
    element: (
      <ProtectedWrapper>
        <div className="flex items-center justify-center h-full text-white">
          记事本 - 开发中
        </div>
      </ProtectedWrapper>
    ),
  },
  // 待办提醒
  {
    path: "/todo",
    element: (
      <ProtectedWrapper>
        <div className="flex items-center justify-center h-full text-white">
          待办提醒 - 开发中
        </div>
      </ProtectedWrapper>
    ),
  },
];

// 404 页面
const notFoundRoute: RouteObject = {
  path: "*",
  element: (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-text-primary">404</h1>
        <p className="mt-4 text-text-secondary">页面不存在</p>
        <a href="/login" className="mt-6 inline-block text-primary hover:text-primary/80">
          返回登录
        </a>
      </div>
    </div>
  ),
};

// 合并所有路由
export const routes: RouteObject[] = [
  ...publicRoutes,
  ...protectedRoutes,
  notFoundRoute,
];

// 创建路由实例
const router = createBrowserRouter(routes);

export default router;
