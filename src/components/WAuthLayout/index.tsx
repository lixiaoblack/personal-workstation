/**
 * WAuthLayout 认证页面布局组件
 * 用于登录、注册、忘记密码等认证页面的统一布局
 */
import React from "react";

export interface IWAuthLayoutProps {
  /** Logo 图标 */
  logoIcon?: string;
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
  logoIcon = "terminal",
  title,
  subtitle,
  children,
  footer,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 relative">
      {/* 背景装饰 - 模糊圆形 */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* 左上角装饰圆 */}
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        {/* 右下角装饰圆 */}
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* 主内容区 */}
      <div className="w-full max-w-[440px] animate-fade-in">
        {/* Logo 区域 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
            <span
              className="material-symbols-outlined text-primary text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {logoIcon}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">{title}</h1>
          {subtitle && <p className="text-text-tertiary text-sm">{subtitle}</p>}
        </div>

        {/* 表单卡片 */}
        <div className="bg-bg-secondary rounded-xl shadow-2xl border border-border p-8">
          {children}
        </div>

        {/* 底部链接 */}
        {footer && (
          <p className="mt-8 text-center text-text-tertiary text-sm">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
};

export { WAuthLayout };
