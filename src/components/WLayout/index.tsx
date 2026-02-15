/*
 * @Author: wanglx
 * @Date: 2026-02-15 14:00:53
 * @LastEditors: wanglx
 * @LastEditTime: 2026-02-15 15:02:38
 * @Description:
 *
 * Copyright (c) 2026 by ${git_name_email}, All Rights Reserved.
 */
/**
 * WLayout 主布局组件
 * 包含侧边栏、头部和内容区域
 * 所有受保护的页面共享此布局
 */
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { WSidebar } from "@/components/WSidebar";
import { WHeader } from "@/components/WHeader";
import { NAV_MENU_CONFIG } from "@/views/Home/config";

const WLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* 侧边栏 */}
      <WSidebar menuItems={NAV_MENU_CONFIG} />

      {/* 主内容区域 */}
      <main className="flex-1 flex flex-col z-20 overflow-hidden bg-bg-primary">
        {/* 头部 */}
        <WHeader />

        {/* 内容区域 - 由子路由渲染 */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div key={location.pathname} className="h-full animate-fadeIn">
            <Outlet />
          </div>
        </div>
      </main>

      {/* AI 悬浮按钮 */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="flex items-center gap-3 bg-primary text-white pl-4 pr-6 py-3 rounded-full shadow-lg shadow-primary/40 hover:scale-105 transition-transform">
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="font-bold">有什么可以帮您？</span>
        </button>
      </div>
    </div>
  );
};

export { WLayout };
export default WLayout;
