/**
 * WCard 卡片组件
 * 通用卡片组件，用于模块入口、内容展示
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
  const cardClassName = [
    'w-card',
    `w-card--${color}`,
    hoverable ? 'w-card--hoverable' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClassName} onClick={onClick}>
      {/* 图标 */}
      <div className={`w-card__icon w-card__icon--${color}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      {/* 标题 */}
      <h4 className="w-card__title">{title}</h4>

      {/* 描述 */}
      {description && <p className="w-card__description">{description}</p>}

      {/* 悬停箭头 */}
      {hoverable && (
        <span className="material-symbols-outlined w-card__arrow">arrow_outward</span>
      )}

      {/* 子元素 */}
      {children}
    </div>
  );
};

export { WCard };
