/**
 * WHeader 头部组件
 * 包含搜索栏、通知按钮、用户信息、退出登录
 * 使用 Tailwind CSS + 主题变量
 */
import React, { useState } from "react";
import { Dropdown, App } from "antd";
import { useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuth } from "@/contexts";

// WHeader 组件属性
export interface IWHeaderProps {
  /** 搜索框占位文本 */
  searchPlaceholder?: string;
  /** 搜索回调 */
  onSearch?: (value: string) => void;
  /** 通知点击回调 */
  onNotificationClick?: () => void;
}

const WHeader: React.FC<IWHeaderProps> = ({
  searchPlaceholder = "搜索功能、任务或日志...",
  onSearch,
  onNotificationClick,
}) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 处理搜索
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch?.((e.target as HTMLInputElement).value);
    }
  };

  // 处理退出登录
  const handleLogout = async () => {
    try {
      await logout();
      message.success("已退出登录");
      navigate("/login", { replace: true });
    } catch {
      message.error("退出登录失败");
    }
  };

  // 用户下拉菜单
  const menuItems: MenuProps["items"] = [
    {
      key: "profile",
      label: "个人资料",
      icon: (
        <span className="material-symbols-outlined text-[18px]">person</span>
      ),
    },
    {
      key: "settings",
      label: "设置",
      icon: (
        <span className="material-symbols-outlined text-[18px]">settings</span>
      ),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: "退出登录",
      icon: (
        <span className="material-symbols-outlined text-[18px]">logout</span>
      ),
      danger: true,
    },
  ];

  // 菜单点击
  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") {
      handleLogout();
    } else if (key === "profile") {
      // TODO: 跳转到个人资料页
      message.info("个人资料功能开发中");
    } else if (key === "settings") {
      // TODO: 跳转到设置页
      message.info("设置功能开发中");
    }
    setDropdownOpen(false);
  };

  // 用户名显示
  const displayName = user?.nickname || user?.username || "用户";

  // 最后登录时间格式化
  const lastLoginTime = user?.last_login_at
    ? new Date(user.last_login_at).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "首次登录";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-bg-primary/80 backdrop-blur-xl border-b border-border">
      {/* 搜索栏 */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
          search
        </span>
        <input
          className="px-4 py-2 pl-10 bg-bg-tertiary border-none rounded-lg text-sm w-80 text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          placeholder={searchPlaceholder}
          type="text"
          onKeyDown={handleSearch}
        />
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-4">
        {/* 通知按钮 */}
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          onClick={onNotificationClick}
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>

        {/* 分隔线 */}
        <div className="w-px h-8 bg-border" />

        {/* 用户信息 */}
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          trigger={["click"]}
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
        >
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="text-right">
              <p className="text-sm font-medium text-text-primary">
                {displayName}
              </p>
              <p className="text-xs text-text-tertiary">
                最后登录: {lastLoginTime}
              </p>
            </div>
            {user?.avatar ? (
              <img
                className="w-10 h-10 rounded-full object-cover"
                src={user.avatar}
                alt={displayName}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export { WHeader };
