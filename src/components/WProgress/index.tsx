/**
 * WProgress 进度条组件
 * 用于展示系统状态、任务进度等
 */
import React from 'react';
import './index.sass';

// 进度条状态
export type TProgressStatus = 'normal' | 'success' | 'warning' | 'error';

// WProgress 组件属性
export interface IWProgressProps {
  /** 标签文本 */
  label: string;
  /** 右侧显示值 */
  value?: string;
  /** 进度百分比 (0-100) */
  percent: number;
  /** 进度条状态 */
  status?: TProgressStatus;
  /** 是否显示进度文字 */
  showInfo?: boolean;
  /** 额外类名 */
  className?: string;
}

const WProgress: React.FC<IWProgressProps> = ({
  label,
  value,
  percent,
  status = 'normal',
  showInfo = true,
  className = '',
}) => {
  // 确保百分比在有效范围内
  const validPercent = Math.min(100, Math.max(0, percent));

  const progressClassName = [
    'w-progress',
    `w-progress--${status}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={progressClassName}>
      {/* 标签和值 */}
      <div className="w-progress__header">
        <span className="w-progress__label">{label}</span>
        {showInfo && (
          <span className={`w-progress__value w-progress__value--${status}`}>
            {value || `${validPercent}%`}
          </span>
        )}
      </div>

      {/* 进度条轨道 */}
      <div className="w-progress__track">
        <div
          className="w-progress__bar"
          style={{ width: `${validPercent}%` }}
        />
      </div>
    </div>
  );
};

export default WProgress;
