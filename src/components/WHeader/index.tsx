/**
 * WHeader 头部组件
 * 包含搜索栏、通知按钮、用户信息
 * 使用 Tailwind CSS + 主题变量
 */
import React from "react";

// WHeader 组件属性
export interface IWHeaderProps {
  /** 搜索框占位文本 */
  searchPlaceholder?: string;
  /** 用户名 */
  userName?: string;
  /** 用户头像 URL */
  userAvatar?: string;
  /** 最后登录时间 */
  lastLogin?: string;
  /** 搜索回调 */
  onSearch?: (value: string) => void;
  /** 通知点击回调 */
  onNotificationClick?: () => void;
}

const WHeader: React.FC<IWHeaderProps> = ({
  searchPlaceholder = "搜索功能、任务或日志...",
  userName = "管理员",
  userAvatar,
  lastLogin = "10:24 AM",
  onSearch,
  onNotificationClick,
}) => {
  // 处理搜索
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch?.((e.target as HTMLInputElement).value);
    }
  };

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
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-text-primary">{userName}</p>
            <p className="text-xs text-text-tertiary">最后登录: {lastLogin}</p>
          </div>
          {userAvatar ? (
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={userAvatar}
              alt={userName}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {userName.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export { WHeader };
