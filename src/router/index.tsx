/**
 * 路由配置文件
 * 管理应用的所有路由
 */
import { createHashRouter, Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

// 布局组件
import { WLayout } from "@/components/WLayout";

// 页面组件
import Home from "@/views/Home";
import Login from "@/views/Login";
import ForgotPassword from "@/views/ForgotPassword";
import { Settings } from "@/views/Settings";
import { AISettings } from "@/views/Settings/AISettings";
import { AIChat } from "@/views/AIChat";
import Knowledge from "@/views/Knowledge";

// 开发者工具页面
import Developer from "@/views/Developer";
import JsonBeautify from "@/views/Developer/JsonBeautify";
import ImageBase64 from "@/views/Developer/ImageBase64";
import ColorConvert from "@/views/Developer/ColorConvert";
import ExcelToJson from "@/views/Developer/ExcelToJson";
import SimplePostman from "@/views/Developer/SimplePostman";
import OcrTool from "@/views/Developer/OcrTool";

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
          // 开发者工具 - 嵌套路由
          {
            path: "/developer",
            element: <Developer />,
            children: [
              {
                index: true,
                element: <Navigate to="/developer/json-beautify" replace />,
              },
              {
                path: "json-beautify",
                element: <JsonBeautify />,
              },
              {
                path: "image-base64",
                element: <ImageBase64 />,
              },
              {
                path: "color-convert",
                element: <ColorConvert />,
              },
              {
                path: "excel-json",
                element: <ExcelToJson />,
              },
              {
                path: "postman",
                element: <SimplePostman />,
              },
              {
                path: "ocr",
                element: <OcrTool />,
              },
            ],
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
          // 设置页面
          {
            path: "/settings",
            element: <Settings />,
          },
          {
            path: "/settings/ai",
            element: <AISettings />,
          },
          // AI 聊天
          {
            path: "/ai-chat",
            element: <AIChat />,
          },
          // 知识库
          {
            path: "/knowledge",
            element: <Knowledge />,
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

// 创建路由实例（使用 HashRouter 兼容 Electron file:// 协议）
const router = createHashRouter(routes);

export default router;
