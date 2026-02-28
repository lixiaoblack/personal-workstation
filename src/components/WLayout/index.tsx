/*
 * @Author: wanglx
 * @Date: 2026-02-15 14:00:53
 * @LastEditors: wanglix
 * @LastEditTime: 2026-02-15 22:44:51
 * @Description:
 *
 * Copyright (c) 2026 by ${git_name_email}, All Rights Reserved.
 */
/**
 * WLayout 主布局组件
 * 包含自定义标题栏、侧边栏、头部和内容区域
 * 所有受保护的页面共享此布局
 */
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { WSidebar } from "@/components/WSidebar";
import { WHeader } from "@/components/WHeader";
import WTitleBar from "@/components/WTitleBar";
import { NAV_MENU_CONFIG } from "@/views/Home/config";

const WLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
      {/* 自定义标题栏 */}
      <WTitleBar />

      {/* 主内容区域（侧边栏 + 内容） */}
      <div className="flex flex-1 overflow-hidden">
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
      </div>
    </div>
  );
};

export { WLayout };
export default WLayout;
