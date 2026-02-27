/**
 * 任务项组件
 */

import React from "react";
import type { TaskItem } from "../../config";

interface JournalTaskItemProps {
  task: TaskItem;
  onContentChange: (id: string, content: string) => void;
}

const STATUS_CONFIG = {
  completed: {
    label: "已完成",
    bgColor: "bg-success/10",
    textColor: "text-success",
    borderColor: "border-success/20",
  },
  in_progress: {
    label: "进行中",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    borderColor: "border-warning/20",
  },
  pending: {
    label: "待处理",
    bgColor: "bg-text-tertiary/10",
    textColor: "text-text-tertiary",
    borderColor: "border-text-tertiary/20",
  },
};

export const JournalTaskItem: React.FC<JournalTaskItemProps> = ({
  task,
  onContentChange,
}) => {
  const statusConfig = STATUS_CONFIG[task.status];

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-5 shadow-sm">
      <div className="flex gap-4">
        {/* 时间轴 */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-text-tertiary">
            {task.time}
          </span>
          <div className="h-full w-0.5 grow rounded-full bg-border" />
        </div>

        {/* 内容区域 */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">
              {task.title}
            </h3>
            <span
              className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}
            >
              {statusConfig.label}
            </span>
          </div>

          <textarea
            className="min-h-[100px] w-full rounded-lg border border-border bg-bg-primary p-3 text-sm focus:border-primary focus:ring-primary"
            placeholder="输入任务进展..."
            value={task.content}
            onChange={(e) => onContentChange(task.id, e.target.value)}
          />

          <div className="flex gap-2">
            {task.tags.map((tag, index) => (
              <span
                key={index}
                className="flex items-center gap-1 rounded bg-bg-tertiary px-2 py-1 text-xs text-text-secondary"
              >
                <span className="material-symbols-outlined text-sm">
                  {tag.icon}
                </span>
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
