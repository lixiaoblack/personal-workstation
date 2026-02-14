/**
 * 路由配置文件
 * 管理应用的所有路由
 */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

// 页面组件
import Home from '@/views/Home';

// 路由配置
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/dashboard',
    element: <Navigate to="/" replace />,
  },
  // 开发者工具
  {
    path: '/developer',
    element: <div className="flex items-center justify-center h-full text-white">开发者工具 - 开发中</div>,
  },
  // GIS 专业工具
  {
    path: '/gis',
    element: <div className="flex items-center justify-center h-full text-white">GIS 专业工具 - 开发中</div>,
  },
  // 工作日志
  {
    path: '/journal',
    element: <div className="flex items-center justify-center h-full text-white">工作日志 - 开发中</div>,
  },
  // 记事本
  {
    path: '/notes',
    element: <div className="flex items-center justify-center h-full text-white">记事本 - 开发中</div>,
  },
  // 待办提醒
  {
    path: '/todo',
    element: <div className="flex items-center justify-center h-full text-white">待办提醒 - 开发中</div>,
  },
  // 404 页面
  {
    path: '*',
    element: <div className="flex items-center justify-center h-full text-white">404 - 页面不存在</div>,
  },
];

// 创建路由实例
const router = createBrowserRouter(routes);

export default router;
