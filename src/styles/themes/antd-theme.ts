/**
 * Ant Design 主题配置
 * 根据当前主题动态生成 Ant Design 的主题配置
 */
import type { ThemeConfig } from "antd";
import type { ResolvedTheme } from "@/contexts/theme.types";

// 品牌色
const PRIMARY_COLOR = "#3c83f6";

/**
 * 深色主题配置
 */
export const darkTheme: ThemeConfig = {
  token: {
    // 品牌色
    colorPrimary: PRIMARY_COLOR,
    colorPrimaryHover: "#2563eb",
    colorPrimaryActive: "#1d4ed8",
    colorPrimaryBg: "rgba(60, 131, 246, 0.15)",
    colorPrimaryBgHover: "rgba(60, 131, 246, 0.25)",

    // 功能色
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#3b82f6",

    // 背景色
    colorBgContainer: "#1e293b",
    colorBgElevated: "#334155",
    colorBgLayout: "#0f172a",
    colorBgSpotlight: "#334155",
    colorBgMask: "rgba(0, 0, 0, 0.6)",

    // 边框
    colorBorder: "#334155",
    colorBorderSecondary: "#1e293b",

    // 文本
    colorText: "#ffffff",
    colorTextSecondary: "#cbd5e1",
    colorTextTertiary: "#64748b",
    colorTextQuaternary: "#475569",

    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // 字体
    fontFamily: "'Inter', 'Noto Sans SC', system-ui, sans-serif",

    // 链接
    colorLink: PRIMARY_COLOR,
    colorLinkHover: "#2563eb",
    colorLinkActive: "#1d4ed8",
  },
  algorithm: [],
};

/**
 * 浅色主题配置
 */
export const lightTheme: ThemeConfig = {
  token: {
    // 品牌色
    colorPrimary: PRIMARY_COLOR,
    colorPrimaryHover: "#2563eb",
    colorPrimaryActive: "#1d4ed8",
    colorPrimaryBg: "#eff6ff",
    colorPrimaryBgHover: "#dbeafe",

    // 功能色
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#3b82f6",

    // 背景色
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorBgLayout: "#f8fafc",
    colorBgSpotlight: "#f1f5f9",
    colorBgMask: "rgba(0, 0, 0, 0.4)",

    // 边框
    colorBorder: "#e2e8f0",
    colorBorderSecondary: "#f1f5f9",

    // 文本
    colorText: "#0f172a",
    colorTextSecondary: "#475569",
    colorTextTertiary: "#94a3b8",
    colorTextQuaternary: "#94a3b8",

    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // 字体
    fontFamily: "'Inter', 'Noto Sans SC', system-ui, sans-serif",

    // 链接
    colorLink: PRIMARY_COLOR,
    colorLinkHover: "#2563eb",
    colorLinkActive: "#1d4ed8",
  },
  algorithm: [],
};

/**
 * 根据主题获取 Ant Design 配置
 * @param theme 当前主题
 * @returns Ant Design 主题配置
 */
export const getAntdTheme = (theme: ResolvedTheme): ThemeConfig => {
  return theme === "dark" ? darkTheme : lightTheme;
};

export default getAntdTheme;
