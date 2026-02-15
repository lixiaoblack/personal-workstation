/**
 * JsonBeautify JSON美化页面
 * 支持JSON对比、美化、差异检测
 * 使用 Monaco Editor 实现高级编辑功能
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { App } from "antd";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";

const JsonBeautify: React.FC = () => {
  const { message } = App.useApp();
  const [leftJson, setLeftJson] = useState("");
  const [rightJson, setRightJson] = useState("");
  const [diffCount, setDiffCount] = useState(0);

  const leftEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const rightEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const monacoRef = useRef<typeof Monaco | null>(null);

  // 存储差异装饰
  const leftDecorationsRef = useRef<string[]>([]);
  const rightDecorationsRef = useRef<string[]>([]);

  // 编辑器挂载处理
  const handleEditorMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;

    // 根据编辑器 ID 判断是左还是右
    const editorId = editor.getId();
    if (editorId.includes("left") || !rightEditorRef.current) {
      leftEditorRef.current = editor;
    } else {
      rightEditorRef.current = editor;
    }

    // 配置 JSON 语言特性
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [],
      enableSchemaRequest: false,
      allowComments: false,
      trailingCommas: "error",
    });
  };

  // 清除差异高亮
  const clearDiffHighlights = useCallback(() => {
    if (leftEditorRef.current) {
      leftDecorationsRef.current = leftEditorRef.current.deltaDecorations(
        leftDecorationsRef.current,
        []
      );
    }
    if (rightEditorRef.current) {
      rightDecorationsRef.current = rightEditorRef.current.deltaDecorations(
        rightDecorationsRef.current,
        []
      );
    }
  }, []);

  // 高亮差异行
  const highlightDifferences = useCallback(
    (leftLines: string[], rightLines: string[]) => {
      if (!leftEditorRef.current || !rightEditorRef.current || !monacoRef.current) {
        return;
      }

      const monaco = monacoRef.current;
      const maxLines = Math.max(leftLines.length, rightLines.length);

      const leftDecorations: Monaco.editor.IModelDeltaDecoration[] = [];
      const rightDecorations: Monaco.editor.IModelDeltaDecoration[] = [];

      for (let i = 0; i < maxLines; i++) {
        const leftLine = leftLines[i] || "";
        const rightLine = rightLines[i] || "";

        if (leftLine.trim() !== rightLine.trim()) {
          const lineNumber = i + 1;

          // 左侧差异高亮
          if (leftLines[i]) {
            leftDecorations.push({
              range: new monaco.Range(lineNumber, 1, lineNumber, 1),
              options: {
                isWholeLine: true,
                className: "diff-deleted-line",
                glyphMarginClassName: "diff-deleted-glyph",
              },
            });
          }

          // 右侧差异高亮
          if (rightLines[i]) {
            rightDecorations.push({
              range: new monaco.Range(lineNumber, 1, lineNumber, 1),
              options: {
                isWholeLine: true,
                className: "diff-added-line",
                glyphMarginClassName: "diff-added-glyph",
              },
            });
          }
        }
      }

      leftDecorationsRef.current = leftEditorRef.current.deltaDecorations(
        leftDecorationsRef.current,
        leftDecorations
      );
      rightDecorationsRef.current = rightEditorRef.current.deltaDecorations(
        rightDecorationsRef.current,
        rightDecorations
      );
    },
    []
  );

  // 美化JSON
  const handleBeautify = useCallback(() => {
    try {
      if (leftJson) {
        const parsed = JSON.parse(leftJson);
        const beautified = JSON.stringify(parsed, null, 2);
        setLeftJson(beautified);
      }
      if (rightJson) {
        const parsed = JSON.parse(rightJson);
        const beautified = JSON.stringify(parsed, null, 2);
        setRightJson(beautified);
      }
      clearDiffHighlights();
      message.success("美化完成");
    } catch {
      message.error("JSON 格式错误");
    }
  }, [leftJson, rightJson, clearDiffHighlights, message]);

  // 左右互换
  const handleSwap = useCallback(() => {
    const temp = leftJson;
    setLeftJson(rightJson);
    setRightJson(temp);
    clearDiffHighlights();
    setDiffCount(0);
    message.success("已互换");
  }, [leftJson, rightJson, clearDiffHighlights, message]);

  // 清空
  const handleClear = useCallback(() => {
    setLeftJson("");
    setRightJson("");
    setDiffCount(0);
    clearDiffHighlights();
    message.success("已清空");
  }, [clearDiffHighlights, message]);

  // 计算差异
  const countDifferences = useCallback(
    (obj1: unknown, obj2: unknown): number => {
      let count = 0;
      if (typeof obj1 !== typeof obj2) return 1;
      if (typeof obj1 !== "object" || obj1 === null) {
        return obj1 === obj2 ? 0 : 1;
      }
      const keys1 = Object.keys(obj1 as object);
      const keys2 = Object.keys(obj2 as object);
      const allKeys = new Set([...keys1, ...keys2]);
      allKeys.forEach((key) => {
        const k = key as keyof typeof obj1;
        if (!(k in (obj1 as object)) || !(k in (obj2 as object))) {
          count += 1;
        } else {
          count += countDifferences(
            (obj1 as Record<string, unknown>)[k],
            (obj2 as Record<string, unknown>)[k]
          );
        }
      });
      return count;
    },
    []
  );

  // 对比
  const handleCompare = useCallback(() => {
    try {
      const left = JSON.parse(leftJson);
      const right = JSON.parse(rightJson);
      const diffs = countDifferences(left, right);
      setDiffCount(diffs);

      // 高亮差异
      const leftLines = leftJson.split("\n");
      const rightLines = rightJson.split("\n");
      highlightDifferences(leftLines, rightLines);

      message.info(`检测到 ${diffs} 处差异`);
    } catch {
      message.error("JSON 格式错误，无法对比");
    }
  }, [leftJson, rightJson, highlightDifferences, message, countDifferences]);

  // 格式化文档
  const handleFormat = useCallback((side: "left" | "right") => {
    const editor = side === "left" ? leftEditorRef.current : rightEditorRef.current;
    if (editor) {
      editor.getAction("editor.action.formatDocument")?.run();
    }
  }, []);

  // 编辑器内容变化处理
  const handleLeftChange = useCallback((value: string | undefined) => {
    setLeftJson(value || "");
    clearDiffHighlights();
    setDiffCount(0);
  }, [clearDiffHighlights]);

  const handleRightChange = useCallback((value: string | undefined) => {
    setRightJson(value || "");
    clearDiffHighlights();
    setDiffCount(0);
  }, [clearDiffHighlights]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearDiffHighlights();
    };
  }, [clearDiffHighlights]);

  return (
    <div className="flex flex-col h-full min-h-full bg-bg-primary overflow-hidden">
      {/* 工具栏 */}
      <header className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                diffCount > 0 ? "bg-warning" : "bg-success"
              }`}
            />
            <span className="text-sm font-medium text-text-secondary">
              {diffCount > 0 ? `检测到 ${diffCount} 处差异` : "内容一致"}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1">
            <button
              onClick={handleBeautify}
              className="px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors flex items-center gap-1.5 text-sm"
            >
              <span className="material-symbols-outlined text-base">
                format_align_left
              </span>
              美化
            </button>
            <button
              onClick={handleSwap}
              className="px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors flex items-center gap-1.5 text-sm"
            >
              <span className="material-symbols-outlined text-base">
                swap_horiz
              </span>
              互换
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors flex items-center gap-1.5 text-sm hover:text-error"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              清空
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCompare}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <span className="material-symbols-outlined text-base">
              compare
            </span>
            对比差异
          </button>
        </div>
      </header>

      {/* 双编辑器容器 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧编辑器 */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/30 border-b border-border">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              原始 JSON
            </span>
            <button
              onClick={() => handleFormat("left")}
              className="text-xs text-text-tertiary hover:text-primary transition-colors"
            >
              格式化
            </button>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language="json"
              value={leftJson}
              onChange={handleLeftChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
                tabSize: 2,
                insertSpaces: true,
                renderWhitespace: "selection",
                scrollBeyondLastLine: false,
                folding: true,
                foldingStrategy: "indentation",
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                autoSurround: "brackets",
                renderValidationDecorations: "on",
              }}
            />
          </div>
        </div>

        {/* 右侧编辑器 */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary/30 border-b border-border">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              对比 JSON
            </span>
            <button
              onClick={() => handleFormat("right")}
              className="text-xs text-text-tertiary hover:text-primary transition-colors"
            >
              格式化
            </button>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language="json"
              value={rightJson}
              onChange={handleRightChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
                tabSize: 2,
                insertSpaces: true,
                renderWhitespace: "selection",
                scrollBeyondLastLine: false,
                folding: true,
                foldingStrategy: "indentation",
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                autoSurround: "brackets",
                renderValidationDecorations: "on",
              }}
            />
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <footer className="h-8 flex-shrink-0 border-t border-border bg-bg-tertiary/30 flex items-center justify-between px-4 text-xs text-text-tertiary">
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>JSON</span>
          <span>Tab: 2 空格</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-warning" />
            差异行
          </span>
          <span>Monaco Editor</span>
        </div>
      </footer>

      {/* 差异高亮样式 */}
      <style>{`
        .diff-deleted-line {
          background-color: rgba(239, 68, 68, 0.15) !important;
        }
        .diff-deleted-glyph {
          background-color: #ef4444 !important;
          width: 4px !important;
          margin-left: 3px;
        }
        .diff-added-line {
          background-color: rgba(16, 185, 129, 0.15) !important;
        }
        .diff-added-glyph {
          background-color: #10b981 !important;
          width: 4px !important;
          margin-left: 3px;
        }
      `}</style>
    </div>
  );
};

export { JsonBeautify };
export default JsonBeautify;
