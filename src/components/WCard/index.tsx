/**
 * WCard 卡片组件
 * 通用卡片组件，用于模块入口、内容展示
 * 使用 Tailwind CSS
 */
import React from 'react';

// 预设颜色类型
export type TCardColor = 'blue' | 'emerald' | 'purple' | 'amber' | 'rose';

// WCard 组件属性
export interface IWCardProps {
  /** 图标名称 (Material Symbols) */
  icon: string;
  /** 标题 */
  title: string;
  /** 描述文本 */
  description?: string;
  /** 预设颜色 */
  color?: TCardColor;
  /** 是否可悬停 */
  hoverable?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 额外类名 */
  className?: string;
  /** 子元素 */
  children?: React.ReactNode;
}

// 颜色映射
const colorMap: Record<TCardColor, { bg: string; text: string; hoverBg: string }> = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    hoverBg: 'group-hover:bg-blue-500 group-hover:text-white',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    hoverBg: 'group-hover:bg-emerald-500 group-hover:text-white',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    hoverBg: 'group-hover:bg-purple-500 group-hover:text-white',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    hoverBg: 'group-hover:bg-amber-500 group-hover:text-white',
  },
  rose: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-500',
    hoverBg: 'group-hover:bg-rose-500 group-hover:text-white',
  },
};

const WCard: React.FC<IWCardProps> = ({
  icon,
  title,
  description,
  color = 'blue',
  hoverable = false,
  onClick,
  className = '',
  children,
}) => {
  const colorStyles = colorMap[color];

  return (
    <div
      className={`
        relative bg-[#101722] p-5 rounded-xl border border-[#1e2939] transition-all
        ${hoverable ? 'group cursor-pointer hover:border-primary/50 hover:-translate-y-1' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* 图标 */}
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorStyles.bg} ${colorStyles.text} ${hoverable ? colorStyles.hoverBg : ''} transition-colors`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      {/* 标题 */}
      <h4 className="font-bold mt-3 text-white">{title}</h4>

      {/* 描述 */}
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}

      {/* 悬停箭头 */}
      {hoverable && (
        <span className="material-symbols-outlined absolute top-4 right-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          arrow_outward
        </span>
      )}

      {/* 子元素 */}
      {children}
    </div>
  );
};

export { WCard };
