/**
 * 路由配置文件
 * 管理应用的所有路由
 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

// 布局组件
import { WLayout } from "@/components/WLayout";

// 页面组件
import Home from "@/views/Home";
import Login from "@/views/Login";
import ForgotPassword from "@/views/ForgotPassword";

// 路由守卫
import ProtectedRoute from "./ProtectedRoute";

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

// 受保护的路由（需要登录）- 使用嵌套路由共享布局
const protectedRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <WLayout />,
        children: [
          {
            path: "/",
            element: <Home />,
          },
          {
            path: "/dashboard",
            element: <Navigate to="/" replace />,
          },
          // 开发者工具
          {
            path: "/developer",
            element: (
              <div className="flex items-center justify-center h-full text-text-secondary">
                开发者工具 - 开发中
              </div>
            ),
          },
          // GIS 专业工具
          {
            path: "/gis",
            element: (
              <div className="flex items-center justify-center h-full text-text-secondary">
                GIS 专业工具 - 开发中
              </div>
            ),
          },
          // 工作日志
          {
            path: "/journal",
            element: (
              <div className="flex items-center justify-center h-full text-text-secondary">
                工作日志 - 开发中
              </div>
            ),
          },
          // 记事本
          {
            path: "/notes",
            element: (
              <div className="flex items-center justify-center h-full text-text-secondary">
                记事本 - 开发中
              </div>
            ),
          },
          // 待办提醒
          {
            path: "/todo",
            element: (
              <div className="flex items-center justify-center h-full text-text-secondary">
                待办提醒 - 开发中
              </div>
            ),
          },
        ],
      },
    ],
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
        <a
          href="/login"
          className="mt-6 inline-block text-primary hover:text-primary/80"
        >
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
