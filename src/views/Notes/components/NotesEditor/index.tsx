/**
 * 笔记编辑器组件
 * 支持 Markdown 编辑、实时预览、文件上传等功能
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 文件树节点类型
interface FileTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileTreeNode[];
  expanded?: boolean;
  active?: boolean;
}

interface NotesEditorProps {
  selectedFile: FileTreeNode | null;
  content: string;
  onContentChange: (content: string) => void;
  onSave: (content: string) => Promise<boolean>;
}

type EditorMode = "edit" | "preview" | "split";

export const NotesEditor: React.FC<NotesEditorProps> = ({
  selectedFile,
  content,
  onContentChange,
  onSave,
}) => {
  const [mode, setMode] = useState<EditorMode>("split");
  const [localContent, setLocalContent] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 同步外部内容
  useEffect(() => {
    setLocalContent(content);
    setIsDirty(false);
  }, [content, selectedFile?.path]);

  // 自动保存（防抖 2 秒）
  useEffect(() => {
    if (!isDirty || !selectedFile) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      const success = await onSave(localContent);
      if (success) {
        setIsDirty(false);
      }
      setIsSaving(false);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localContent, isDirty, selectedFile, onSave]);

  // 手动保存
  const handleManualSave = useCallback(async () => {
    if (!selectedFile || !isDirty) return;

    setIsSaving(true);
    const success = await onSave(localContent);
    if (success) {
      setIsDirty(false);
    }
    setIsSaving(false);
  }, [selectedFile, isDirty, localContent, onSave]);

  // 快捷键保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave]);

  // 内容变化处理
  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || "";
    setLocalContent(newContent);
    setIsDirty(true);
    onContentChange(newContent);
  }, [onContentChange]);

  // 未选择文件时的空状态
  if (!selectedFile) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center bg-bg-primary">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-bg-tertiary/50">
          <span className="material-symbols-outlined text-4xl text-text-tertiary">
            edit_note
          </span>
        </div>
        <h3 className="mt-4 text-lg font-medium text-text-secondary">
          选择或创建一个笔记
        </h3>
        <p className="mt-1 text-sm text-text-tertiary">
          从左侧文件树选择笔记开始编辑
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-bg-primary">
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b border-border bg-bg-secondary/30 px-4 py-2">
        <div className="flex items-center gap-4">
          {/* 文件路径 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-primary">description</span>
            <span className="text-text-primary font-medium">{selectedFile.name}</span>
            {isDirty && (
              <span className="text-xs text-warning">● 未保存</span>
            )}
            {isSaving && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                保存中...
              </span>
            )}
          </div>
        </div>

        {/* 编辑模式切换 */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-bg-tertiary p-0.5">
            <button
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "edit"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setMode("edit")}
            >
              编辑
            </button>
            <button
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "split"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setMode("split")}
            >
              分栏
            </button>
            <button
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === "preview"
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
              onClick={() => setMode("preview")}
            >
              预览
            </button>
          </div>

          {/* 保存按钮 */}
          <button
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleManualSave}
            disabled={!isDirty || isSaving}
          >
            <span className="material-symbols-outlined text-sm">save</span>
            保存
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 编辑器 */}
        {(mode === "edit" || mode === "split") && (
          <div className={`${mode === "split" ? "w-1/2" : "w-full"} flex flex-col`}>
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={localContent}
              onChange={handleContentChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: "on",
                minimap: { enabled: false },
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                tabSize: 2,
              }}
            />
          </div>
        )}

        {/* 分隔线 */}
        {mode === "split" && (
          <div className="w-px bg-border" />
        )}

        {/* 预览区域 */}
        {(mode === "preview" || mode === "split") && (
          <div className={`${mode === "split" ? "w-1/2" : "w-full"} overflow-y-auto p-6`}>
            <article className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {localContent}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between border-t border-border bg-bg-tertiary/30 px-4 py-1 text-xs text-text-tertiary">
        <div className="flex items-center gap-4">
          <span>字符: {localContent.length.toLocaleString()}</span>
          <span>行数: {localContent.split("\n").length}</span>
          <span>词数: {localContent.split(/\s+/).filter(Boolean).length}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Markdown</span>
          <span>UTF-8</span>
        </div>
      </div>
    </section>
  );
};
