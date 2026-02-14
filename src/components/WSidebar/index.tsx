/**
 * WSidebar 侧边栏组件
 * 包含品牌标识、导航菜单、用户操作区
 * 使用 Tailwind CSS + 主题变量
 */
import React, { useState } from "react";
import type { ReactNode } from "react";

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
  /** 当前选中菜单项 */
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
  activeKey,
  onMenuClick,
  brandName = "个人工作站",
  version = "专业版 v2.4.0",
  footerExtra,
}) => {
  const [selectedKey, setSelectedKey] = useState(
    activeKey || menuItems[0]?.key
  );

  // 处理菜单点击
  const handleMenuClick = (item: INavMenuItem) => {
    setSelectedKey(item.key);
    onMenuClick?.(item.key, item);
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
              <a
                key={item.key}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer
                  ${
                    selectedKey === item.key
                      ? "bg-bg-hover text-text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                  }`}
                onClick={() => handleMenuClick(item)}
                href={item.path || "#"}
              >
                <span className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </a>
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
            <a
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
              href="#"
            >
              <span className="material-symbols-outlined text-xl">
                settings
              </span>
              <span>设置</span>
            </a>
            <a
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-error hover:bg-error-light transition-colors cursor-pointer"
              href="#"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span>退出登录</span>
            </a>
          </div>

          {/* 额外内容 */}
          {footerExtra}
        </div>
      </div>
    </aside>
  );
};

export { WSidebar };
