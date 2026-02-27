/**
 * 待办卡片组件
 */

import React from "react";
import type { TaskCategory, Task } from "../../config";
import { COLOR_MAP } from "../../config";

interface TodoCardProps {
  category: TaskCategory;
  onTaskToggle: (categoryId: string, taskId: string) => void;
}

export const TodoCard: React.FC<TodoCardProps> = ({
  category,
  onTaskToggle,
}) => {
  const colorConfig = COLOR_MAP[category.color] || COLOR_MAP.blue;
  const pendingCount = category.tasks.filter((t: Task) => !t.completed).length;

  return (
    <div className="rounded-xl border border-border bg-bg-secondary/70 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`size-10 rounded-lg ${colorConfig.bg} flex items-center justify-center ${colorConfig.text}`}
          >
            <span className="material-symbols-outlined">{category.icon}</span>
          </div>
          <h4 className="text-lg font-bold text-text-primary">
            {category.label}
          </h4>
        </div>
        <span
          className={`rounded ${colorConfig.bg} ${colorConfig.text} px-2 py-1 text-xs font-bold`}
        >
          {pendingCount} 个待办
        </span>
      </div>

      <div className="space-y-4">
        {category.tasks.map((task: Task) => (
          <div key={task.id} className="flex items-start gap-3 group">
            <input
              className="mt-1 rounded border-border bg-bg-tertiary text-primary focus:ring-primary"
              type="checkbox"
              checked={task.completed}
              onChange={() => onTaskToggle(category.id, task.id)}
            />
            <div className="flex-1">
              <p className="cursor-pointer text-sm font-medium text-text-primary transition-colors group-hover:text-primary">
                {task.title}
              </p>
              <span
                className={`mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                  task.status === "overdue"
                    ? "text-error"
                    : "text-text-tertiary"
                }`}
              >
                {task.status === "overdue" && (
                  <span className="material-symbols-outlined text-xs">
                    priority_high
                  </span>
                )}
                {task.time}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-6 flex items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-text-primary">
        <span className="material-symbols-outlined text-sm">add_circle</span>
        添加子任务
      </button>
    </div>
  );
};
