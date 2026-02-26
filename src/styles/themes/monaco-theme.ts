/**
 * Monaco Editor 主题配置
 * 根据项目主题动态生成 Monaco Editor 的主题配置
 */
import type * as Monaco from "monaco-editor";

// 深色主题颜色
const darkColors = {
  background: "#0f172a",
  foreground: "#ffffff",
  lineHighlightBackground: "#1e293b",
  selectionBackground: "#3c83f640",
  cursor: "#ffffff",
  lineNumber: "#64748b",
  lineNumberActive: "#cbd5e1",
  selectionHighlight: "#3c83f620",
  indentGuide: "#334155",
  indentGuideActive: "#475569",
  bracketPairColorization: ["#3c83f6", "#10b981", "#f59e0b", "#ef4444"],
};

// 浅色主题颜色
const lightColors = {
  background: "#f8fafc",
  foreground: "#0f172a",
  lineHighlightBackground: "#f1f5f9",
  selectionBackground: "#3c83f640",
  cursor: "#0f172a",
  lineNumber: "#94a3b8",
  lineNumberActive: "#475569",
  selectionHighlight: "#3c83f620",
  indentGuide: "#e2e8f0",
  indentGuideActive: "#cbd5e1",
  bracketPairColorization: ["#2563eb", "#059669", "#d97706", "#dc2626"],
};

/**
 * 定义 Monaco Editor 深色主题
 */
export const defineMonacoDarkTheme = (monaco: typeof Monaco) => {
  monaco.editor.defineTheme("app-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "#64748b", fontStyle: "italic" },
      { token: "keyword", foreground: "#3c83f6" },
      { token: "string", foreground: "#10b981" },
      { token: "number", foreground: "#f59e0b" },
      { token: "type", foreground: "#8b5cf6" },
      { token: "function", foreground: "#60a5fa" },
      { token: "variable", foreground: "#ffffff" },
      { token: "constant", foreground: "#f59e0b" },
      { token: "delimiter", foreground: "#cbd5e1" },
      { token: "delimiter.bracket", foreground: "#cbd5e1" },
      { token: "tag", foreground: "#3c83f6" },
      { token: "attribute.name", foreground: "#10b981" },
      { token: "attribute.value", foreground: "#f59e0b" },
    ],
    colors: {
      "editor.background": darkColors.background,
      "editor.foreground": darkColors.foreground,
      "editor.lineHighlightBackground": darkColors.lineHighlightBackground,
      "editor.selectionBackground": darkColors.selectionBackground,
      "editorCursor.foreground": darkColors.cursor,
      "editorLineNumber.foreground": darkColors.lineNumber,
      "editorLineNumber.activeForeground": darkColors.lineNumberActive,
      "editor.selectionHighlightBackground": darkColors.selectionHighlight,
      "editorIndentGuide.background": darkColors.indentGuide,
      "editorIndentGuide.activeBackground": darkColors.indentGuideActive,
      "editorBracketMatch.background": "#3c83f630",
      "editorBracketMatch.border": "#3c83f6",
      "editorGutter.background": darkColors.background,
      "editorWidget.background": darkColors.background,
      "editorWidget.border": "#334155",
      "input.background": "#1e293b",
      "input.border": "#334155",
      "scrollbarSlider.background": "#33415580",
      "scrollbarSlider.hoverBackground": "#47556980",
      "scrollbarSlider.activeBackground": "#475569a0",
      // JSON 特定颜色
      "editorBracketHighlight.foreground1": darkColors.bracketPairColorization[0],
      "editorBracketHighlight.foreground2": darkColors.bracketPairColorization[1],
      "editorBracketHighlight.foreground3": darkColors.bracketPairColorization[2],
      "editorBracketHighlight.foreground4": darkColors.bracketPairColorization[3],
    },
  });
};

/**
 * 定义 Monaco Editor 浅色主题
 */
export const defineMonacoLightTheme = (monaco: typeof Monaco) => {
  monaco.editor.defineTheme("app-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "#94a3b8", fontStyle: "italic" },
      { token: "keyword", foreground: "#2563eb" },
      { token: "string", foreground: "#059669" },
      { token: "number", foreground: "#d97706" },
      { token: "type", foreground: "#7c3aed" },
      { token: "function", foreground: "#2563eb" },
      { token: "variable", foreground: "#0f172a" },
      { token: "constant", foreground: "#d97706" },
      { token: "delimiter", foreground: "#475569" },
      { token: "delimiter.bracket", foreground: "#475569" },
      { token: "tag", foreground: "#2563eb" },
      { token: "attribute.name", foreground: "#059669" },
      { token: "attribute.value", foreground: "#d97706" },
    ],
    colors: {
      "editor.background": lightColors.background,
      "editor.foreground": lightColors.foreground,
      "editor.lineHighlightBackground": lightColors.lineHighlightBackground,
      "editor.selectionBackground": lightColors.selectionBackground,
      "editorCursor.foreground": lightColors.cursor,
      "editorLineNumber.foreground": lightColors.lineNumber,
      "editorLineNumber.activeForeground": lightColors.lineNumberActive,
      "editor.selectionHighlightBackground": lightColors.selectionHighlight,
      "editorIndentGuide.background": lightColors.indentGuide,
      "editorIndentGuide.activeBackground": lightColors.indentGuideActive,
      "editorBracketMatch.background": "#3c83f630",
      "editorBracketMatch.border": "#3c83f6",
      "editorGutter.background": lightColors.background,
      "editorWidget.background": lightColors.background,
      "editorWidget.border": "#e2e8f0",
      "input.background": "#ffffff",
      "input.border": "#e2e8f0",
      "scrollbarSlider.background": "#d1d5db80",
      "scrollbarSlider.hoverBackground": "#9ca3af80",
      "scrollbarSlider.activeBackground": "#9ca3afa0",
      // JSON 特定颜色
      "editorBracketHighlight.foreground1": lightColors.bracketPairColorization[0],
      "editorBracketHighlight.foreground2": lightColors.bracketPairColorization[1],
      "editorBracketHighlight.foreground3": lightColors.bracketPairColorization[2],
      "editorBracketHighlight.foreground4": lightColors.bracketPairColorization[3],
    },
  });
};

/**
 * 获取当前主题对应的 Monaco 主题名称
 */
export const getMonacoThemeName = (resolvedTheme: "dark" | "light"): string => {
  return resolvedTheme === "dark" ? "app-dark" : "app-light";
};

/**
 * 初始化 Monaco 主题
 */
export const initMonacoThemes = (monaco: typeof Monaco) => {
  defineMonacoDarkTheme(monaco);
  defineMonacoLightTheme(monaco);
};

export default {
  initMonacoThemes,
  getMonacoThemeName,
  defineMonacoDarkTheme,
  defineMonacoLightTheme,
};
