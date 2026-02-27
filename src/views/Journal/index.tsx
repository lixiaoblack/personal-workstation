/**
 * 工作日志页面
 * 用于记录和管理日常工作日志
 */

import React, { useState } from "react";
import { JournalCalendar } from "./components/JournalCalendar";
import { JournalTaskItem } from "./components/JournalTaskItem";
import { CALENDAR_DATA, NAV_MENU_ITEMS, TASK_ITEMS } from "./config";
import type { TaskItem } from "./config";

const Journal: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>(TASK_ITEMS);

  const handleTaskContentChange = (id: string, content: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, content } : task
      )
    );
  };

  return (
    <div className="journal flex h-full flex-col">
      {/* 顶部导航栏 */}
      <header className="journal-header flex items-center justify-between border-b border-border bg-bg-secondary px-6 py-3">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-3xl">
              auto_awesome_motion
            </span>
            <h2 className="text-lg font-bold leading-tight tracking-tight text-text-primary">
              工作日志
            </h2>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a className="border-b-2 border-primary pb-1 text-sm font-semibold text-primary">
              首页
            </a>
            <a className="text-sm font-medium text-text-secondary transition-colors hover:text-primary">
              日志
            </a>
            <a className="text-sm font-medium text-text-secondary transition-colors hover:text-primary">
              团队
            </a>
            <a className="text-sm font-medium text-text-secondary transition-colors hover:text-primary">
              设置
            </a>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end gap-6">
          <label className="hidden h-10 min-w-40 max-w-64 sm:flex flex-col">
            <div className="flex h-full w-full flex-1 items-stretch overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-center bg-bg-tertiary pl-3 text-text-tertiary">
                <span className="material-symbols-outlined text-xl">
                  search
                </span>
              </div>
              <input
                className="form-input min-w-0 flex-1 border-none bg-bg-tertiary text-sm text-text-primary placeholder:text-text-tertiary focus:ring-0"
                placeholder="搜索任务或日志..."
              />
            </div>
          </label>
          <div className="flex items-center gap-4">
            <span className="cursor-pointer text-text-secondary hover:text-primary material-symbols-outlined">
              notifications
            </span>
            <div className="size-9 rounded-full border-2 border-primary/20 bg-center bg-no-repeat bg-cover" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* 左侧边栏：日历和导航 */}
        <aside className="journal-sidebar w-80 flex-shrink-0 border-r border-border bg-bg-secondary/50 flex flex-col gap-6 overflow-y-auto p-4">
          <JournalCalendar data={CALENDAR_DATA} />
          
          <div className="border-t border-border pt-6">
            <h3 className="mb-4 px-2 text-sm font-bold uppercase tracking-wider text-text-primary">
              导航菜单
            </h3>
            <div className="space-y-1">
              {NAV_MENU_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    item.active
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl ${
                      !item.active && "group-hover:text-primary"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* 中间区域：任务日志编辑 */}
        <section className="flex-1 overflow-y-auto bg-bg-primary p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="mb-1 flex gap-2 text-xs font-medium text-text-tertiary">
                  <span>我的工作空间</span> /
                  <span className="text-primary">日历日志</span>
                </div>
                <h1 className="text-2xl font-bold text-text-primary">
                  10月5日 工作记录
                </h1>
              </div>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover">
                <span className="material-symbols-outlined text-lg">add</span>
                <span>新增记录</span>
              </button>
            </div>

            {/* 任务列表 */}
            {tasks.map((task) => (
              <JournalTaskItem
                key={task.id}
                task={task}
                onContentChange={handleTaskContentChange}
              />
            ))}

            {/* 添加新记录 */}
            <div className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-text-tertiary transition-all hover:border-primary/50 hover:text-primary group">
              <span className="material-symbols-outlined mb-2 text-4xl transition-transform group-hover:scale-110">
                post_add
              </span>
              <p className="text-sm font-medium">
                点击添加下午的工作记录...
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* AI 助手浮动按钮 */}
      <button className="fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-white shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95">
        <span className="material-symbols-outlined text-2xl">auto_awesome</span>
        <span className="text-sm font-bold">AI 助手</span>
      </button>
    </div>
  );
};

export default Journal;
