/**
 * 记事本页面
 * 用于编辑和管理 Markdown 笔记
 */

import React, { useState } from "react";
import { NotesSidebar } from "./components/NotesSidebar";
import { NotesEditor } from "./components/NotesEditor";
import { FILE_TREE, DOCUMENT_INFO } from "./config";

const Notes: React.FC = () => {
  const [content, setContent] = useState(DOCUMENT_INFO.content);

  return (
    <div className="notes flex h-screen w-full flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="notes-header flex h-14 items-center justify-between border-b border-border bg-bg-secondary px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-3xl">edit_note</span>
            <h2 className="text-lg font-bold tracking-tight text-text-primary">
              智能笔记
            </h2>
          </div>
          <div className="flex w-64 items-center rounded-lg bg-bg-tertiary px-3 py-1.5">
            <span className="material-symbols-outlined mr-2 text-text-tertiary">
              search
            </span>
            <input
              className="w-full border-none bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:ring-0"
              placeholder="搜索笔记..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="mr-4 flex items-center gap-6 border-r border-border pr-6">
            <a className="text-sm font-medium text-text-secondary transition-colors hover:text-primary">
              文件
            </a>
            <a className="text-sm font-medium text-text-secondary transition-colors hover:text-primary">
              编辑
            </a>
            <a className="text-sm font-medium text-text-secondary transition-colors hover:text-primary">
              视图
            </a>
            <a className="text-sm font-medium text-text-secondary transition-colors hover:text-primary">
              工具
            </a>
          </div>
          <button className="flex items-center justify-center rounded-lg bg-bg-tertiary p-2 text-text-secondary hover:bg-primary/20">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="size-8 overflow-hidden rounded-full border border-primary/30 bg-primary/20">
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-primary">
              U
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 */}
        <NotesSidebar fileTree={FILE_TREE} />

        {/* 编辑区域 */}
        <NotesEditor
          documentInfo={DOCUMENT_INFO}
          content={content}
          onContentChange={setContent}
        />
      </main>

      {/* 底部状态栏 */}
      <footer className="notes-footer flex h-8 items-center justify-between border-t border-border bg-bg-tertiary px-4 text-[10px] text-text-tertiary">
        <div className="flex items-center gap-4">
          <span>字符数: {content.length.toLocaleString()}</span>
          <span>词数: {content.split(/\s+/).filter(Boolean).length}</span>
          <span>行数: {content.split("\n").length}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-success" />
            已同步
          </span>
          <span>UTF-8</span>
          <span>Markdown</span>
        </div>
      </footer>

      {/* AI 助手浮动按钮 */}
      <button className="fixed bottom-12 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 font-medium text-sm text-white shadow-2xl transition-all hover:scale-105">
        <span className="material-symbols-outlined">auto_awesome</span>
        AI 助手
      </button>
    </div>
  );
};

export default Notes;
