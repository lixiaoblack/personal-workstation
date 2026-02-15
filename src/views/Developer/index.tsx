/**
 * Developer 开发者工具布局组件
 * 包含顶部菜单栏和内容区域
 */
import React from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { TOOL_MENU_CONFIG } from "./config";

const Developer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 当前选中的菜单
  const currentPath = location.pathname;

  // 如果访问 /developer，重定向到第一个菜单
  if (currentPath === "/developer") {
    return <Navigate to="/developer/json-beautify" replace />;
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* 顶部菜单栏 */}
      <header className="h-16 flex-shrink-0 bg-bg-secondary border-b border-border flex items-center px-8 justify-between">
        <div className="flex gap-8 h-full">
          {TOOL_MENU_CONFIG.map((menu) => {
            const isActive = currentPath === menu.path;
            return (
              <button
                key={menu.key}
                onClick={() => navigate(menu.path)}
                className={`border-b-2 px-1 h-full flex items-center font-medium text-sm transition-colors ${
                  isActive
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-text-tertiary hover:text-text-primary"
                }`}
              >
                {menu.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export { TOOL_MENU_CONFIG } from "./config";
export default Developer;
