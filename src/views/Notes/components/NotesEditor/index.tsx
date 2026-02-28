/**
 * 笔记编辑器组件
 * 使用全局 WMarkdownEditor 组件，基于 Vditor 实现
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { WMarkdownEditor } from "@/components/WMarkdownEditor";

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

export const NotesEditor: React.FC<NotesEditorProps> = ({
  selectedFile,
  content,
  onContentChange,
  onSave,
}) => {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedContentRef = useRef(content);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentFilePathRef = useRef<string | null>(null);

  // 当文件切换时重置状态（只在文件路径变化时触发）
  useEffect(() => {
    const filePath = selectedFile?.path ?? null;
    if (currentFilePathRef.current !== filePath) {
      // 文件切换了，重置状态
      currentFilePathRef.current = filePath;
      setIsDirty(false);
      lastSavedContentRef.current = content;
    }
  }, [selectedFile?.path, content]);

  // 自动保存（防抖 2 秒）
  useEffect(() => {
    if (!isDirty || !selectedFile) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      const success = await onSave(content);
      if (success) {
        setIsDirty(false);
        lastSavedContentRef.current = content;
      }
      setIsSaving(false);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, isDirty, selectedFile, onSave]);

  // 内容变化处理
  const handleContentChange = useCallback(
    (value: string) => {
      onContentChange(value);
      setIsDirty(value !== lastSavedContentRef.current);
    },
    [onContentChange]
  );

  // 保存处理
  const handleSave = useCallback(
    async (value: string) => {
      if (!selectedFile) return;

      setIsSaving(true);
      const success = await onSave(value);
      if (success) {
        setIsDirty(false);
        lastSavedContentRef.current = value;
      }
      setIsSaving(false);
    },
    [selectedFile, onSave]
  );

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
            <span className="material-symbols-outlined text-primary">
              description
            </span>
            <span className="font-medium text-text-primary">
              {selectedFile.name}
            </span>
            {isDirty && <span className="text-xs text-warning">● 未保存</span>}
            {isSaving && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <span className="material-symbols-outlined animate-spin text-sm">
                  progress_activity
                </span>
                保存中...
              </span>
            )}
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handleSave(content)}
          disabled={!isDirty || isSaving}
        >
          <span className="material-symbols-outlined text-sm">save</span>
          保存
        </button>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        <WMarkdownEditor
          value={content}
          onChange={handleContentChange}
          onSave={handleSave}
          mode="ir"
          height="100%"
          placeholder="开始编写您的笔记..."
          theme="dark"
        />
      </div>
    </section>
  );
};
