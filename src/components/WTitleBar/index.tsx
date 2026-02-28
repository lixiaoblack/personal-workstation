/**
 * 自定义标题栏组件
 *
 * 功能：
 * - 拖拽移动窗口
 * - 双击最大化/还原
 * - 最小化、最大化、关闭按钮
 * - 统一 Windows 和 macOS 样式
 */

import React, { useState, useEffect, useCallback } from "react";

interface WTitleBarProps {
  title?: string;
  showMenu?: boolean;
}

const WTitleBar: React.FC<WTitleBarProps> = ({
  title = "Personal Workstation",
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  // 检查窗口是否最大化
  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.electronAPI?.windowIsMaximized?.();
      setIsMaximized(maximized || false);
    };
    checkMaximized();
  }, []);

  // 最小化
  const handleMinimize = useCallback(() => {
    window.electronAPI?.windowMinimize?.();
  }, []);

  // 最大化/还原
  const handleToggleMaximize = useCallback(async () => {
    const maximized = await window.electronAPI?.windowToggleMaximize?.();
    setIsMaximized(maximized || false);
  }, []);

  // 关闭（隐藏）窗口
  const handleClose = useCallback(() => {
    window.electronAPI?.windowClose?.();
  }, []);

  // 双击标题栏切换最大化
  const handleDoubleClick = useCallback(() => {
    handleToggleMaximize();
  }, [handleToggleMaximize]);

  return (
    <div
      className="h-8 bg-bg-secondary flex items-center justify-between select-none border-b border-border"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
    >
      {/* 左侧：图标和标题 */}
      <div className="flex items-center gap-2 px-3">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-4 h-4"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        />
        <span className="text-xs text-text-secondary font-medium">{title}</span>
      </div>

      {/* 右侧：窗口控制按钮 */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* 最小化 */}
        <button
          onClick={handleMinimize}
          className="h-full px-3 hover:bg-bg-tertiary transition-colors flex items-center justify-center group"
          title="最小化"
        >
          <span className="material-symbols-outlined text-sm text-text-tertiary group-hover:text-text-primary">
            remove
          </span>
        </button>

        {/* 最大化/还原 */}
        <button
          onClick={handleToggleMaximize}
          className="h-full px-3 hover:bg-bg-tertiary transition-colors flex items-center justify-center group"
          title={isMaximized ? "还原" : "最大化"}
        >
          <span className="material-symbols-outlined text-sm text-text-tertiary group-hover:text-text-primary">
            {isMaximized ? "filter_none" : "crop_square"}
          </span>
        </button>

        {/* 关闭 */}
        <button
          onClick={handleClose}
          className="h-full px-3 hover:bg-error transition-colors flex items-center justify-center group"
          title="关闭"
        >
          <span className="material-symbols-outlined text-sm text-text-tertiary group-hover:text-white">
            close
          </span>
        </button>
      </div>
    </div>
  );
};

export default WTitleBar;
