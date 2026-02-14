/**
 * 主题类型定义
 */
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/**
 * 主题上下文值类型
 */
export interface ThemeContextValue {
  /** 用户选择的主题模式 */
  theme: ThemeMode;
  /** 实际生效的主题 */
  resolvedTheme: ResolvedTheme;
  /** 设置主题 */
  setTheme: (theme: ThemeMode) => void;
  /** 切换主题（light <-> dark） */
  toggleTheme: () => void;
}

/**
 * 本地存储键名
 */
export const THEME_STORAGE_KEY = "theme";
