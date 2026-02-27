/**
 * 待办侧边栏组件
 */

import React from "react";
import type { NavItem } from "../../config";

interface TodoSidebarProps {
  navItems: NavItem[];
}

export const TodoSidebar: React.FC<TodoSidebarProps> = ({ navItems }) => {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-bg-primary flex flex-col">
      <div className="flex items-center gap-3 p-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
          <span className="material-symbols-outlined text-2xl">task_alt</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-text-primary">任务管理器</h1>
          <p className="text-xs text-text-tertiary">工作空间 v2.0</p>
        </div>
      </div>
      
      <nav className="mt-4 flex-1 space-y-2 px-4">
        {navItems.map((item) => (
          <a
            key={item.id}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
              item.active
                ? "bg-primary/15 text-white"
                : "text-text-tertiary hover:bg-bg-hover hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </a>
        ))}
      </nav>
      
      <div className="mt-auto border-t border-border p-4">
        <div className="flex items-center gap-3 p-2">
          <div className="size-8 overflow-hidden rounded-full bg-bg-tertiary">
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-text-secondary">
              U
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">管理员用户</p>
            <p className="truncate text-xs text-text-tertiary">admin@task.pro</p>
          </div>
          <span className="material-symbols-outlined text-lg text-text-tertiary">settings</span>
        </div>
      </div>
    </aside>
  );
};
