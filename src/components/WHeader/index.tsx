/**
 * WHeader 头部组件
 * 包含搜索栏、通知按钮、用户信息
 */
import React from 'react';
import './index.sass';

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
  searchPlaceholder = '搜索功能、任务或日志...',
  userName = '管理员',
  userAvatar,
  lastLogin = '10:24 AM',
  onSearch,
  onNotificationClick,
}) => {
  // 处理搜索
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.((e.target as HTMLInputElement).value);
    }
  };

  return (
    <header className="w-header">
      {/* 搜索栏 */}
      <div className="w-header__search">
        <span className="material-symbols-outlined w-header__search-icon">search</span>
        <input
          className="w-header__search-input"
          placeholder={searchPlaceholder}
          type="text"
          onKeyDown={handleSearch}
        />
      </div>

      {/* 右侧操作区 */}
      <div className="w-header__actions">
        {/* 通知按钮 */}
        <button className="w-header__notification" onClick={onNotificationClick}>
          <span className="material-symbols-outlined">notifications</span>
        </button>

        {/* 分隔线 */}
        <div className="w-header__divider" />

        {/* 用户信息 */}
        <div className="w-header__user">
          <div className="w-header__user-info">
            <p className="w-header__user-name">{userName}</p>
            <p className="w-header__user-login">最后登录: {lastLogin}</p>
          </div>
          {userAvatar ? (
            <img className="w-header__user-avatar" src={userAvatar} alt={userName} />
          ) : (
            <div className="w-header__user-avatar w-header__user-avatar--default">
              {userName.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default WHeader;
