/**
 * Home 页面入口
 * 个人工作站首页/仪表盘
 * 使用 Tailwind CSS + 主题变量
 */
import React from "react";
import { WSidebar } from "@/components/WSidebar";
import { WHeader } from "@/components/WHeader";
import { WCard } from "@/components/WCard";
import { WProgress } from "@/components/WProgress";
import { useAuth } from "@/contexts";
import {
  NAV_MENU_CONFIG,
  MODULE_CARDS_CONFIG,
  FOCUS_TASKS_CONFIG,
  RECENT_LOGS_CONFIG,
  SYSTEM_STATUS_CONFIG,
} from "./config";

const Home: React.FC = () => {
  const { user } = useAuth();

  // 当前日期
  const currentDate = new Date();
  const dateStr = `${currentDate.getFullYear()}年${
    currentDate.getMonth() + 1
  }月${currentDate.getDate()}日`;
  const weekDays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  const weekDay = weekDays[currentDate.getDay()];

  // 渲染模块卡片
  const renderModuleCards = () => (
    <div className="grid grid-cols-5 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2">
      {MODULE_CARDS_CONFIG.map((module) => (
        <WCard
          key={module.key}
          icon={module.icon}
          title={module.title}
          description={module.description}
          color={module.color}
          hoverable
        />
      ))}
    </div>
  );

  // 渲染焦点任务
  const renderFocusTasks = () => (
    <div className="bg-bg-secondary rounded-xl border border-border divide-y divide-border">
      {FOCUS_TASKS_CONFIG.map((task) => (
        <div key={task.id} className="flex items-center gap-4 p-5 group">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors
              ${
                task.status === "completed"
                  ? "border-success"
                  : "border-primary/40 group-hover:border-primary"
              }`}
          >
            {task.status === "completed" && (
              <span className="material-symbols-outlined text-[16px] text-success">
                check
              </span>
            )}
          </div>
          <div
            className={`flex-1 ${
              task.status === "completed" ? "opacity-50" : ""
            }`}
          >
            <p
              className={`font-medium text-text-primary ${
                task.status === "completed" ? "line-through" : ""
              }`}
            >
              {task.title}
            </p>
            <p className="text-xs text-text-tertiary">
              {task.status === "completed" ? (
                `已于 ${task.completedTime} 完成`
              ) : (
                <>
                  截止日期：{task.deadline} · 优先级：
                  <span
                    className={task.priority === "high" ? "text-error" : ""}
                  >
                    {task.priority === "high" ? "高" : "中"}
                  </span>
                </>
              )}
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded text-[10px] font-bold
              ${
                task.status === "in-progress"
                  ? "bg-bg-tertiary text-text-secondary"
                  : ""
              }
              ${
                task.status === "completed"
                  ? "bg-success-light text-success"
                  : ""
              }
              ${
                task.status === "pending"
                  ? "bg-bg-tertiary text-text-secondary"
                  : ""
              }
            `}
          >
            {task.status === "in-progress" && "进行中"}
            {task.status === "completed" && "已完成"}
            {task.status === "pending" && "待开始"}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center p-5">
        <button className="flex items-center gap-2 text-sm text-text-tertiary hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-sm">add</span>
          添加新任务
        </button>
      </div>
    </div>
  );

  // 渲染 AI 总结
  const renderAiSummary = () => (
    <div className="relative bg-bg-secondary rounded-xl border border-border p-6 overflow-hidden shadow-lg shadow-primary/5">
      {/* 背景光晕 */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-[60px] rounded-full" />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-[20px]">
            smart_toy
          </span>
        </div>
        <span className="text-sm font-bold text-primary">本周效能报告</span>
      </div>

      <div className="relative z-10">
        <p className="text-sm leading-relaxed text-text-secondary">
          本周您完成了
          <span className="text-primary font-bold">12</span>
          项任务，主要集中在
          <span className="underline decoration-primary/50 underline-offset-4">
            GIS 数据处理
          </span>
          和
          <span className="underline decoration-primary/50 underline-offset-4">
            代码重构
          </span>
          。
        </p>

        <div className="mt-4 p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
          <p className="text-xs font-semibold text-primary mb-1 italic">
            智能建议：
          </p>
          <p className="text-xs text-text-tertiary leading-relaxed">
            基于您的任务进度，下周一将有 3 个 GIS
            分析报告到期。建议今天下午完成数据初步审查。
          </p>
        </div>
      </div>
    </div>
  );

  // 渲染系统状态
  const renderSystemStatus = () => (
    <div className="mt-4 bg-bg-secondary p-5 rounded-xl border border-border">
      <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">
        系统状态
      </p>
      {SYSTEM_STATUS_CONFIG.map((status) => (
        <WProgress
          key={status.key}
          label={status.label}
          value={status.value}
          percent={status.percent}
          status={status.status}
        />
      ))}
    </div>
  );

  // 渲染最近日志
  const renderRecentLogs = () => (
    <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
      {RECENT_LOGS_CONFIG.map((log) => (
        <div
          key={log.id}
          className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border items-start"
        >
          <div className="w-12 h-12 rounded-lg bg-bg-tertiary flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-text-tertiary uppercase">
              {log.date.month}
            </span>
            <span className="text-lg font-black text-primary">
              {log.date.day}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate text-text-primary">
              {log.title}
            </h4>
            <p className="text-sm text-text-tertiary mt-1 line-clamp-2">
              {log.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* 侧边栏 */}
      <WSidebar menuItems={NAV_MENU_CONFIG} />

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-bg-primary">
        {/* 头部 */}
        <WHeader />

        {/* 内容区域 */}
        <div className="max-w-[1400px] mx-auto p-8 flex flex-col gap-8">
          {/* 欢迎区域 */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-bg-primary to-bg-primary border border-border p-8">
            <div className="relative z-20 flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-text-primary mb-2">
                  欢迎回来，{user?.nickname || user?.username || "用户"}
                  <span className="text-primary inline-block animate-pulse">
                    _
                  </span>
                </h2>
                <p className="text-text-secondary text-lg">
                  今天是 {dateStr}，{weekDay}。您有 5 个待处理任务。
                </p>
              </div>
              <div className="flex gap-2">
                <div className="bg-bg-hover backdrop-blur-sm border border-border p-4 rounded-xl text-center min-w-[100px]">
                  <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">
                    今日效率
                  </p>
                  <p className="text-2xl font-bold text-primary">85%</p>
                </div>
                <div className="bg-bg-hover backdrop-blur-sm border border-border p-4 rounded-xl text-center min-w-[100px]">
                  <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">
                    活跃时长
                  </p>
                  <p className="text-2xl font-bold text-text-primary">4.2h</p>
                </div>
              </div>
            </div>
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
            </div>
          </section>

          {/* 核心模块入口 */}
          <section>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-text-primary">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              核心模块入口
            </h3>
            {renderModuleCards()}
          </section>

          {/* 焦点区域 */}
          <div className="grid grid-cols-[2fr_1fr] gap-8 max-lg:grid-cols-1">
            {/* 今日焦点 */}
            <section>
              <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-text-primary">
                <span className="w-1.5 h-6 bg-primary rounded-full" />
                今日焦点
              </h3>
              {renderFocusTasks()}
            </section>

            {/* AI 总结 */}
            <section>
              <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-text-primary">
                <span className="w-1.5 h-6 bg-primary rounded-full" />
                AI 智能总结
              </h3>
              {renderAiSummary()}
              {renderSystemStatus()}
            </section>
          </div>

          {/* 最近日志 */}
          <section>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-text-primary">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              最近日志
            </h3>
            {renderRecentLogs()}
          </section>
        </div>
      </main>

      {/* AI 悬浮按钮 */}
      <div className="fixed bottom-8 right-8">
        <button className="flex items-center gap-3 bg-primary text-white pl-4 pr-6 py-3 rounded-full shadow-lg shadow-primary/40 hover:scale-105 transition-transform">
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="font-bold">有什么可以帮您？</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
