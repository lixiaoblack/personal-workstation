/**
 * WAuthLayout 认证页面布局组件
 * 用于登录、注册、忘记密码等认证页面的统一布局
 */
import React from "react";
import { useTheme } from "@/contexts";

export interface IWAuthLayoutProps {
  /** 页面标题 */
  title: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 子元素 */
  children: React.ReactNode;
  /** 底部链接区域 */
  footer?: React.ReactNode;
}

const WAuthLayout: React.FC<IWAuthLayoutProps> = ({
  title,
  subtitle,
  children,
  footer,
}) => {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 左上角装饰圆 */}
        <div
          className={`
            absolute -top-32 -left-32 w-96 h-96 rounded-full
            ${resolvedTheme === "dark" ? "bg-primary/5" : "bg-primary/10"}
          `}
        />
        {/* 右下角装饰圆 */}
        <div
          className={`
            absolute -bottom-32 -right-32 w-96 h-96 rounded-full
            ${resolvedTheme === "dark" ? "bg-primary/5" : "bg-primary/10"}
          `}
        />
        {/* 装饰线条 */}
        <div
          className={`
            absolute top-1/4 right-1/4 w-64 h-64 rounded-full
            border border-primary/10
          `}
        />
        <div
          className={`
            absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full
            border border-primary/10
          `}
        />
      </div>

      {/* 主内容区 */}
      <div className="relative w-full max-w-md">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <span className="material-symbols-outlined text-3xl text-primary">
              terminal
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-text-tertiary mt-2">{subtitle}</p>
          )}
        </div>

        {/* 表单卡片 */}
        <div className="bg-bg-secondary rounded-2xl border border-border p-8 shadow-lg">
          {children}
        </div>

        {/* 底部链接 */}
        {footer && (
          <div className="text-center mt-6 text-text-secondary">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export { WAuthLayout };
