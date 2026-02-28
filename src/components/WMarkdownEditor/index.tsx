/**
 * WMarkdownEditor - 全局 Markdown 编辑器组件
 * 基于 Vditor 实现，支持实时预览，类似 Obsidian 体验
 * 
 * 使用方法：
 * import { WMarkdownEditor } from '@/components/WMarkdownEditor';
 * 
 * <WMarkdownEditor
 *   value={content}
 *   onChange={setContent}
 *   placeholder="请输入内容..."
 *   height={500}
 * />
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import Vditor from "vditor";
import "vditor/dist/index.css";

export interface WMarkdownEditorProps {
  /** 编辑器内容 */
  value: string;
  /** 内容变化回调 */
  onChange: (value: string) => void;
  /** 保存回调（Ctrl+S 触发） */
  onSave?: (value: string) => void;
  /** 占位符 */
  placeholder?: string;
  /** 编辑器高度 */
  height?: number | string;
  /** 最小高度 */
  minHeight?: number;
  /** 是否只读 */
  readonly?: boolean;
  /** 工具栏配置 */
  toolbar?: boolean | (string | { name: string; tip: string })[];
  /** 预览模式：'sv' 分屏预览 | 'ir' 即时渲染 | 'wysiwyg' 所见即所得 */
  mode?: "sv" | "ir" | "wysiwyg";
  /** 主题：'classic' | 'dark' */
  theme?: "classic" | "dark";
  /** 是否显示行号 */
  lineNum?: boolean;
  /** 是否启用自动保存 */
  autoSave?: boolean;
  /** 自动保存延迟（毫秒） */
  autoSaveDelay?: number;
  /** 编辑器获取焦点时的回调 */
  onFocus?: () => void;
  /** 编辑器失去焦点时的回调 */
  onBlur?: () => void;
  /** 编辑器就绪回调 */
  onReady?: () => void;
  /** 上传图片回调 */
  onUpload?: (file: File) => Promise<string>;
  /** 额外的类名 */
  className?: string;
}

export const WMarkdownEditor: React.FC<WMarkdownEditorProps> = ({
  value,
  onChange,
  onSave,
  placeholder = "请输入 Markdown 内容...",
  height = "100%",
  minHeight = 300,
  readonly = false,
  toolbar = true,
  mode = "ir",
  theme = "dark",
  lineNum = true,
  autoSave = false,
  autoSaveDelay = 2000,
  onFocus,
  onBlur,
  onReady,
  onUpload,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vditorRef = useRef<Vditor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isInternalChange = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理图片上传
  const handleUpload = useCallback(
    async (files: File[]): Promise<string | null> => {
      if (!onUpload || files.length === 0) return null;
      
      try {
        const url = await onUpload(files[0]);
        return url;
      } catch (error) {
        console.error("[WMarkdownEditor] 上传图片失败:", error);
        return null;
      }
    },
    [onUpload]
  );

  // 初始化编辑器
  useEffect(() => {
    if (!containerRef.current || vditorRef.current) return;

    const vditor = new Vditor(containerRef.current, {
      height,
      minHeight,
      placeholder,
      mode,
      theme,
      icon: "material",
      lang: "zh_CN",
      lineNum,
      readonly,
      value,
      toolbar: toolbar === true
        ? [
            "headings",
            "bold",
            "italic",
            "strike",
            "link",
            "|",
            "list",
            "ordered-list",
            "check",
            "outdent",
            "indent",
            "|",
            "quote",
            "line",
            "code",
            "inline-code",
            "|",
            "upload",
            "table",
            "|",
            "undo",
            "redo",
            "|",
            "edit-mode",
            "preview",
            "outline",
            "|",
            "export",
            "help",
          ]
        : toolbar,
      cache: {
        enable: false,
      },
      preview: {
        theme: {
          current: theme === "dark" ? "dark" : "light",
          path: "https://unpkg.com/vditor@3.10.4/dist/css/content-theme",
        },
        hljs: {
          enable: true,
          lineNumber: true,
          style: "github-dark",
        },
        markdown: {
          toc: true,
          mark: true,
          footnotes: true,
          autoSpace: true,
        },
        math: {
          inlineDigit: true,
        },
      },
      hint: {
        parse: false,
        emoji: {
          ":+1:": "👍",
          ":-1:": "👎",
          ":smile:": "😄",
          ":tada:": "🎉",
          ":heart:": "❤️",
          ":rocket:": "🚀",
        },
      },
      upload: {
        handler: async (files: File[]) => {
          const url = await handleUpload(files);
          if (url) {
            // 插入图片到编辑器
            vditorRef.current?.insertValue(`![](${url})`);
          }
          return null;
        },
      },
      input: (value) => {
        if (!isInternalChange.current) {
          onChange(value);
          
          // 自动保存
          if (autoSave && autoSaveDelay > 0) {
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
              onSave?.(value);
            }, autoSaveDelay);
          }
        }
      },
      focus: () => {
        onFocus?.();
      },
      blur: () => {
        onBlur?.();
      },
      after: () => {
        setIsReady(true);
        onReady?.();
      },
      ctrlKey: (key) => {
        if (key === "s") {
          onSave?.(vditor.getValue());
          return true;
        }
        return false;
      },
    });

    vditorRef.current = vditor;

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      vditorRef.current?.destroy();
      vditorRef.current = null;
    };
  }, []); // 只在挂载时初始化一次

  // 同步外部 value 到编辑器
  useEffect(() => {
    if (vditorRef.current && isReady && value !== vditorRef.current.getValue()) {
      isInternalChange.current = true;
      vditorRef.current.setValue(value);
      isInternalChange.current = false;
    }
  }, [value, isReady]);

  // 更新只读状态
  useEffect(() => {
    if (vditorRef.current && isReady) {
      vditorRef.current.disabled(readonly);
    }
  }, [readonly, isReady]);

  return (
    <div
      ref={containerRef}
      className={`w-markdown-editor ${className}`}
      style={{ height }}
    />
  );
};
