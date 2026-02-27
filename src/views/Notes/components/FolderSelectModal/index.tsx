/**
 * 文件夹选择弹窗组件
 * 首次进入笔记页面时提示用户选择存储文件夹
 */

import React from "react";

interface FolderSelectModalProps {
  onSelect: () => Promise<boolean>;
  loading: boolean;
}

export const FolderSelectModal: React.FC<FolderSelectModalProps> = ({
  onSelect,
  loading,
}) => {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-bg-secondary p-8 shadow-xl">
        {/* 图标 */}
        <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10">
          <span className="material-symbols-outlined text-5xl text-primary">
            folder_open
          </span>
        </div>

        {/* 标题和描述 */}
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-text-primary">
            选择笔记存储位置
          </h2>
          <p className="max-w-sm text-sm text-text-secondary">
            请选择一个文件夹用于存储您的笔记文件。所有笔记将以 Markdown
            格式保存在该文件夹中。
          </p>
        </div>

        {/* 功能说明 */}
        <div className="grid w-full max-w-sm grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-bg-tertiary/50 p-3">
            <span className="material-symbols-outlined text-lg text-primary">
              description
            </span>
            <span className="text-xs text-text-secondary">Markdown 格式</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-bg-tertiary/50 p-3">
            <span className="material-symbols-outlined text-lg text-primary">
              cloud_off
            </span>
            <span className="text-xs text-text-secondary">本地存储</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-bg-tertiary/50 p-3">
            <span className="material-symbols-outlined text-lg text-primary">
              folder
            </span>
            <span className="text-xs text-text-secondary">文件夹管理</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-bg-tertiary/50 p-3">
            <span className="material-symbols-outlined text-lg text-primary">
              sync
            </span>
            <span className="text-xs text-text-secondary">RAG 支持</span>
          </div>
        </div>

        {/* 选择按钮 */}
        <button
          className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-white transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
          onClick={onSelect}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin">
                progress_activity
              </span>
              正在处理...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">folder</span>
              选择文件夹
            </>
          )}
        </button>

        {/* 提示 */}
        <p className="text-xs text-text-tertiary">
          您可以随时在设置中更改存储位置
        </p>
      </div>
    </div>
  );
};
