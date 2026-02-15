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
    <div className="flex flex-col h-full min-h-full bg-bg-primary">
      {/* 顶部菜单栏 */}
      <header className="h-12 flex-shrink-0 bg-bg-secondary border-b border-border flex items-stretch">
        <div className="flex h-full">
          {TOOL_MENU_CONFIG.map((menu) => {
            const isActive = currentPath === menu.path;
            return (
              <button
                key={menu.key}
                onClick={() => navigate(menu.path)}
                className={`relative px-4 h-full flex items-center text-sm transition-all duration-200 ${
                  isActive
                    ? "text-primary bg-bg-primary/50"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50"
                }`}
              >
                <span className="relative z-10">{menu.label}</span>
                {/* 激活指示器 */}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* 内容区域 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export { TOOL_MENU_CONFIG } from "./config";
export default Developer;
