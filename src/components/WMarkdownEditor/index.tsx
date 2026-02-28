/**
 * WMarkdownEditor - 全局 Markdown 编辑器组件
 * 基于 Vditor 实现，支持实时预览，类似 Obsidian 体验
 */

import React, { useEffect, useRef, useCallback } from "react";
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
  /** 预览模式：'sv' 分屏预览 | 'ir' 即时渲染 | 'wysiwyg' 所见即所得 */
  mode?: "sv" | "ir" | "wysiwyg";
  /** 主题：'classic' | 'dark' */
  theme?: "classic" | "dark";
  /** 编辑器获取焦点时的回调 */
  onFocus?: () => void;
  /** 编辑器失去焦点时的回调 */
  onBlur?: () => void;
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
  mode = "ir",
  theme = "dark",
  onFocus,
  onBlur,
  onUpload,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vditorRef = useRef<Vditor | null>(null);
  const isReadyRef = useRef(false);
  const lastValueRef = useRef(value);

  // 稳定的回调引用
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const onUploadRef = useRef(onUpload);

  // 更新回调引用
  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
    onFocusRef.current = onFocus;
    onBlurRef.current = onBlur;
    onUploadRef.current = onUpload;
  });

  // Tab 键处理函数
  const handleTabKey = useCallback((e: Event) => {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key === "Tab" && vditorRef.current) {
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      // 插入两个空格作为缩进
      vditorRef.current.insertValue("  ");
    }
  }, []);

  // 初始化编辑器（只执行一次）
  useEffect(() => {
    if (!containerRef.current) return;

    const vditor = new Vditor(containerRef.current, {
      height,
      minHeight,
      placeholder,
      mode,
      theme,
      icon: "material",
      lang: "zh_CN",
      value,
      toolbar: [
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
      ],
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
          if (!onUploadRef.current || files.length === 0) return null;
          try {
            const url = await onUploadRef.current(files[0]);
            if (url) {
              vditor.insertValue(`![](${url})`);
            }
          } catch (error) {
            console.error("[WMarkdownEditor] 上传图片失败:", error);
          }
          return null;
        },
      },
      input: (inputValue) => {
        lastValueRef.current = inputValue;
        onChangeRef.current?.(inputValue);
      },
      focus: () => {
        onFocusRef.current?.();
      },
      blur: () => {
        onBlurRef.current?.();
      },
      after: () => {
        isReadyRef.current = true;
        lastValueRef.current = value;
        
        // 在编辑器就绪后，给编辑区域添加 Tab 键处理
        const vditorElement = containerRef.current;
        if (vditorElement) {
          // 查找编辑区域（contenteditable 元素）
          const editorAreas = vditorElement.querySelectorAll(
            '.vditor-ir, .vditor-sv, .vditor-wysiwyg'
          );
          editorAreas.forEach((area) => {
            area.addEventListener('keydown', handleTabKey, true);
          });
        }
      },
      ctrlKey: (key) => {
        if (key === "s") {
          onSaveRef.current?.(vditor.getValue());
          return true;
        }
        return false;
      },
    });

    vditorRef.current = vditor;

    return () => {
      // 清理事件监听器
      const vditorElement = containerRef.current;
      if (vditorElement) {
        const editorAreas = vditorElement.querySelectorAll(
          '.vditor-ir, .vditor-sv, .vditor-wysiwyg'
        );
        editorAreas.forEach((area) => {
          area.removeEventListener('keydown', handleTabKey, true);
        });
      }
      
      try {
        if (vditorRef.current) {
          vditorRef.current.destroy();
        }
      } catch {
        // 忽略销毁错误
      }
      vditorRef.current = null;
      isReadyRef.current = false;
    };
  }, [handleTabKey]); // 包含 handleTabKey 依赖

  // 同步外部 value 到编辑器（仅在文件切换时）
  useEffect(() => {
    if (!vditorRef.current || !isReadyRef.current) return;

    // 只有当值与上次不同时才更新
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      vditorRef.current.setValue(value);
    }
  }, [value]);

  // 更新只读状态
  useEffect(() => {
    if (!vditorRef.current || !isReadyRef.current) return;
    vditorRef.current.disabled(readonly);
  }, [readonly]);

  return (
    <div
      ref={containerRef}
      className={`w-markdown-editor ${className}`}
      style={{ height }}
    />
  );
};

export default WMarkdownEditor;
