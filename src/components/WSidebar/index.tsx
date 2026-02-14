/**
 * WSidebar 侧边栏组件
 * 包含品牌标识、导航菜单、用户操作区
 */
import React, { useState } from 'react';
import type { ReactNode } from 'react';

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
  brandName = '个人工作站',
  version = '专业版 v2.4.0',
  footerExtra,
}) => {
  const [selectedKey, setSelectedKey] = useState(activeKey || menuItems[0]?.key);

  // 处理菜单点击
  const handleMenuClick = (item: INavMenuItem) => {
    setSelectedKey(item.key);
    onMenuClick?.(item.key, item);
  };

  return (
    <aside className="w-sidebar">
      <div className="w-sidebar__container">
        {/* 上部区域 */}
        <div className="w-sidebar__top">
          {/* 品牌标识 */}
          <div className="w-sidebar__brand">
            <div className="w-sidebar__brand-icon">
              <span className="material-symbols-outlined">terminal</span>
            </div>
            <div className="w-sidebar__brand-info">
              <h1 className="w-sidebar__brand-name">{brandName}</h1>
              <p className="w-sidebar__brand-version">{version}</p>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="w-sidebar__nav">
            {menuItems.map((item) => (
              <a
                key={item.key}
                className={`w-sidebar__nav-item ${selectedKey === item.key ? 'w-sidebar__nav-item--active' : ''}`}
                onClick={() => handleMenuClick(item)}
                href={item.path || '#'}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="w-sidebar__nav-label">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        {/* 下部区域 */}
        <div className="w-sidebar__bottom">
          {/* AI 助手按钮 */}
          <button className="w-sidebar__ai-btn">
            <span className="material-symbols-outlined">smart_toy</span>
            AI 助手
          </button>

          {/* 设置和退出 */}
          <div className="w-sidebar__actions">
            <a className="w-sidebar__action-item" href="#">
              <span className="material-symbols-outlined">settings</span>
              <span>设置</span>
            </a>
            <a className="w-sidebar__action-item w-sidebar__action-item--danger" href="#">
              <span className="material-symbols-outlined">logout</span>
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
