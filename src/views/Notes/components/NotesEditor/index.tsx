/**
 * 笔记编辑器组件
 */

import React from "react";
import type { DocumentInfo } from "../../config";

interface NotesEditorProps {
  documentInfo: DocumentInfo;
  content: string;
  onContentChange: (content: string) => void;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({
  documentInfo,
  content,
  onContentChange,
}) => {
  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-bg-primary">
      <div className="flex items-center justify-between border-b border-border bg-bg-secondary/30 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-tertiary">主目录 / 2024年计划 /</span>
          <h1 className="font-semibold text-text-primary">
            {documentInfo.title.split("：")[0]}
          </h1>
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
            Markdown
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-text-tertiary hover:text-text-primary">
            <span className="material-symbols-outlined">history</span>
          </button>
          <button className="p-1.5 text-text-tertiary hover:text-text-primary">
            <span className="material-symbols-outlined">share</span>
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-bg-tertiary px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover">
            <span className="material-symbols-outlined text-sm">save</span>
            保存
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-xl bg-bg-tertiary p-4">
            <span className="material-symbols-outlined text-3xl text-primary">article</span>
          </div>
          <div>
            <input
              className="w-full border-none bg-transparent p-0 text-3xl font-bold text-text-primary focus:ring-0"
              type="text"
              value={documentInfo.title}
              readOnly
            />
            <div className="mt-2 flex items-center gap-4 text-sm text-text-tertiary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                {documentInfo.date}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">person</span>
                {documentInfo.author}
              </span>
            </div>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <textarea
            className="min-h-[500px] w-full resize-none border-none bg-transparent text-text-secondary leading-relaxed focus:ring-0"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
};
