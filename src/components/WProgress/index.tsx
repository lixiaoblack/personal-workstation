/**
 * WProgress 进度条组件
 * 用于展示系统状态、任务进度等
 * 使用 Tailwind CSS + 主题变量
 */
import React from "react";

// 进度条状态
export type TProgressStatus = "normal" | "success" | "warning" | "error";

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

// 状态颜色映射
const statusColorMap: Record<TProgressStatus, { bar: string; value: string }> =
  {
    normal: {
      bar: "bg-primary",
      value: "text-primary",
    },
    success: {
      bar: "bg-success",
      value: "text-success",
    },
    warning: {
      bar: "bg-warning",
      value: "text-warning",
    },
    error: {
      bar: "bg-error",
      value: "text-error",
    },
  };

const WProgress: React.FC<IWProgressProps> = ({
  label,
  value,
  percent,
  status = "normal",
  showInfo = true,
  className = "",
}) => {
  // 确保百分比在有效范围内
  const validPercent = Math.min(100, Math.max(0, percent));
  const colorStyles = statusColorMap[status];

  return (
    <div className={`${className} [&+&]:mt-3`}>
      {/* 标签和值 */}
      <div className="flex justify-between mb-1 text-xs">
        <span className="text-text-primary">{label}</span>
        {showInfo && (
          <span className={`font-medium ${colorStyles.value}`}>
            {value || `${validPercent}%`}
          </span>
        )}
      </div>

      {/* 进度条轨道 */}
      <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorStyles.bar}`}
          style={{ width: `${validPercent}%` }}
        />
      </div>
    </div>
  );
};

export { WProgress };
