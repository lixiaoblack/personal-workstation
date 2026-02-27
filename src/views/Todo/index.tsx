/**
 * 待办提醒页面
 * 用于管理日常任务和分组记录
 */

import React, { useState } from "react";
import { TodoSidebar } from "./components/TodoSidebar";
import { TodoCard } from "./components/TodoCard";
import { NAV_ITEMS, TASK_CATEGORIES } from "./config";
import type { TaskCategory } from "./config";

const Todo: React.FC = () => {
  const [categories, setCategories] = useState<TaskCategory[]>(TASK_CATEGORIES);
  const [activeTab, setActiveTab] = useState<"in_progress" | "completed" | "all">("in_progress");

  const handleTaskToggle = (categoryId: string, taskId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              tasks: cat.tasks.map((task) =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
              ),
            }
          : cat
      )
    );
  };

  const inProgressCount = categories.reduce(
    (acc, cat) => acc + cat.tasks.filter((t) => !t.completed).length,
    0
  );

  const completedCount = categories.reduce(
    (acc, cat) => acc + cat.tasks.filter((t) => t.completed).length,
    0
  );

  return (
    <div className="todo flex h-screen overflow-hidden">
      <TodoSidebar navItems={NAV_ITEMS} />
      
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg-secondary/50 px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-text-primary">任务看板</h2>
            <div className="flex items-center gap-1 rounded-full bg-bg-tertiary/50 px-3 py-1">
              <span className="size-2 rounded-full bg-success" />
              <span className="text-xs text-text-tertiary">系统已连接</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-text-tertiary">
                search
              </span>
              <input
                className="w-64 rounded-full border-none bg-bg-tertiary/50 py-1.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary"
                placeholder="搜索任务..."
                type="text"
              />
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-primary-hover">
              <span className="material-symbols-outlined text-sm">add</span>
              新建分类
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h3 className="mb-2 text-3xl font-bold text-text-primary">我的提醒事项</h3>
            <p className="text-text-tertiary">管理您的日常任务和分组记录</p>
          </div>

          <div className="mb-8 flex gap-8 border-b border-border">
            <button
              onClick={() => setActiveTab("in_progress")}
              className={`pb-4 text-sm font-semibold ${
                activeTab === "in_progress"
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-text-tertiary transition-colors hover:text-text-secondary"
              }`}
            >
              进行中 ({inProgressCount})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`pb-4 text-sm font-semibold ${
                activeTab === "completed"
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-text-tertiary transition-colors hover:text-text-secondary"
              }`}
            >
              已完成 ({completedCount})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-4 text-sm font-semibold ${
                activeTab === "all"
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-text-tertiary transition-colors hover:text-text-secondary"
              }`}
            >
              所有任务
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <TodoCard
                key={category.id}
                category={category}
                onTaskToggle={handleTaskToggle}
              />
            ))}
            
            <div className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-6 transition-all hover:border-primary/50 hover:bg-bg-hover group">
              <div className="flex size-12 items-center justify-center rounded-full bg-bg-tertiary text-text-tertiary transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">add</span>
              </div>
              <p className="text-sm font-medium text-text-tertiary">创建新任务分组</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-8">
          <button className="flex items-center gap-3 rounded-full bg-primary px-6 py-4 text-white shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 group">
            <span className="material-symbols-outlined text-2xl transition-transform group-hover:rotate-12">
              auto_awesome
            </span>
            <span className="font-bold tracking-wide">AI 助手</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Todo;
