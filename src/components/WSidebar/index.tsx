/**
 * WSidebar 侧边栏组件
 * 包含品牌标识、导航菜单、用户操作区
 * 使用 Tailwind CSS + 主题变量
 */
import React, { useMemo } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts";

// 导航菜单项类型
export interface INavMenuItem {
  key: string;
  icon: string;
  label: string;
  path?: string;
  children?: INavMenuItem[];
}

// WSidebar 组件属性
export interface IWSidebarProps {
  /** 导航菜单配置 */
  menuItems: INavMenuItem[];
  /** 当前选中菜单项（已弃用，使用路由自动判断） */
  activeKey?: string;
  /** 菜单点击回调 */
  onMenuClick?: (key: string, item: INavMenuItem) => void;
  /** 品牌名称 */
  brandName?: string;
  /** 版本号 */
  version?: string;
  /** 底部额外内容 */
  footerExtra?: ReactNode;
}

const WSidebar: React.FC<IWSidebarProps> = ({
  menuItems,
  onMenuClick,
  brandName = "个人工作站",
  version = "专业版 v2.4.0",
  footerExtra,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // 根据当前路由路径判断选中状态
  const selectedKey = useMemo(() => {
    const currentPath = location.pathname;

    // 1. 精确匹配
    const exactMatch = menuItems.find((item) => item.path === currentPath);
    if (exactMatch) return exactMatch.key;

    // 2. 前缀匹配（用于嵌套路由）
    //    注意：排除根路径 "/"，因为它会匹配所有路径
    //    只匹配 path 长度大于 1 且当前路径以该 path 开头的菜单项
    const prefixMatches = menuItems.filter(
      (item) =>
        item.path &&
        item.path !== "/" &&
        item.path.length > 1 &&
        currentPath.startsWith(item.path)
    );

    // 找到最长匹配的路径（更精确的匹配优先）
    if (prefixMatches.length > 0) {
      const longestMatch = prefixMatches.reduce((prev, curr) =>
        (curr.path?.length || 0) > (prev.path?.length || 0) ? curr : prev
      );
      return longestMatch.key;
    }

    // 3. 默认选中第一个
    return menuItems[0]?.key;
  }, [location.pathname, menuItems]);

  // 处理菜单点击
  const handleMenuClick = (item: INavMenuItem) => {
    onMenuClick?.(item.key, item);
    if (item.path) {
      navigate(item.path);
    }
  };

  // 处理退出登录
  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-bg-secondary border-r border-border">
      <div className="p-6 flex flex-col h-full justify-between">
        {/* 上部区域 */}
        <div className="flex flex-col gap-8">
          {/* 品牌标识 */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-primary rounded-lg p-2 text-white flex items-center justify-center">
              <span className="material-symbols-outlined">terminal</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-text-primary">
                {brandName}
              </h1>
              <p className="text-xs text-text-tertiary">{version}</p>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 cursor-pointer w-full text-left
                  ${
                    selectedKey === item.key
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  }`}
                onClick={() => handleMenuClick(item)}
              >
                <span className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 下部区域 */}
        <div className="flex flex-col gap-4">
          {/* AI 助手按钮 */}
          <button className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
            <span className="material-symbols-outlined">smart_toy</span>
            AI 助手
          </button>

          {/* 设置和退出 */}
          <div className="flex flex-col gap-1">
            <button
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer w-full text-left"
              onClick={() => navigate("/settings")}
            >
              <span className="material-symbols-outlined text-xl">
                settings
              </span>
              <span>设置</span>
            </button>
            <button
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-error hover:bg-error/10 transition-colors cursor-pointer w-full text-left"
              onClick={handleLogout}
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span>退出登录</span>
            </button>
          </div>

          {/* 额外内容 */}
          {footerExtra}
        </div>
      </div>
    </aside>
  );
};

export { WSidebar };
