/**
 * Home 页面入口
 * 个人工作站首页/仪表盘
 * 使用真实数据展示待办事项和存储状态
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WCard } from "@/components/WCard";
import { useAuth } from "@/contexts";
import { useTodayTodos, useOverdueTodos, useTodos } from "@/hooks/useTodos";
import type { Todo } from "@/types/electron";
import { MODULE_CARDS_CONFIG } from "./config";

// 存储信息类型
interface StorageInfo {
  cacheSize: number;
  totalSize: number;
  dataSize: number;
  logsSize: number;
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { todos: todayTodos, loading: todayLoading } = useTodayTodos();
  const { todos: overdueTodos, loading: overdueLoading } = useOverdueTodos();
  const { stats } = useTodos();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  // 加载存储信息
  useEffect(() => {
    const loadStorageInfo = async () => {
      try {
        const info = await window.electronAPI?.getStorageInfo?.();
        setStorageInfo(info);
      } catch (error) {
        console.error("[Home] 加载存储信息失败:", error);
      }
    };
    loadStorageInfo();
  }, []);

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

  // 格式化截止时间
  const formatDueDate = (todo: Todo) => {
    if (!todo.dueDate) return null;
    const date = new Date(todo.dueDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return date.toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
    });
  };

  // 格式化字节大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 计算效率（已完成 / 总任务）
  const efficiency =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // 合并今日和逾期待办，按优先级排序
  const focusTodos = [...overdueTodos, ...todayTodos]
    .filter((t) => t.status !== "completed")
    .slice(0, 5);

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
          onClick={() => navigate(module.path)}
        />
      ))}
    </div>
  );

  // 渲染焦点任务
  const renderFocusTasks = () => {
    const loading = todayLoading || overdueLoading;

    if (loading) {
      return (
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <span className="text-text-tertiary">加载中...</span>
        </div>
      );
    }

    if (focusTodos.length === 0) {
      return (
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-success mb-2">
            check_circle
          </span>
          <p className="text-text-secondary">今日暂无待办事项</p>
          <button
            onClick={() => navigate("/todo")}
            className="mt-4 text-sm text-primary hover:underline"
          >
            添加新任务
          </button>
        </div>
      );
    }

    return (
      <div className="bg-bg-secondary rounded-xl border border-border divide-y divide-border">
        {focusTodos.map((todo) => {
          const isOverdue = overdueTodos.some((t) => t.id === todo.id);
          const dueText = formatDueDate(todo);

          return (
            <div
              key={todo.id}
              className="flex items-center gap-4 p-4 group cursor-pointer hover:bg-bg-hover transition-colors"
              onClick={() => navigate("/todo")}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {todo.title}
                </p>
                {dueText && (
                  <p
                    className={`text-xs mt-1 ${isOverdue ? "text-error" : "text-text-tertiary"}`}
                  >
                    {isOverdue ? "已逾期 · " : ""}
                    {dueText}
                  </p>
                )}
              </div>
              {todo.priority === "high" && (
                <span className="px-2 py-0.5 rounded text-xs bg-error/10 text-error">
                  高优先级
                </span>
              )}
              {todo.priority === "urgent" && (
                <span className="px-2 py-0.5 rounded text-xs bg-error/20 text-error font-bold">
                  紧急
                </span>
              )}
            </div>
          );
        })}
        <div className="flex items-center justify-center p-4">
          <button
            onClick={() => navigate("/todo")}
            className="flex items-center gap-2 text-sm text-text-tertiary hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            查看全部待办
          </button>
        </div>
      </div>
    );
  };

  // 渲染统计卡片
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 gap-4">
      <div
        className="bg-bg-secondary rounded-xl border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => navigate("/todo")}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">
              checklist
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">
              {stats.total}
            </p>
            <p className="text-xs text-text-tertiary">总任务数</p>
          </div>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-warning">
            {stats.pending + stats.inProgress} 进行中
          </span>
          <span className="text-success">{stats.completed} 已完成</span>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl border border-border p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-success">
              trending_up
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">
              {efficiency}%
            </p>
            <p className="text-xs text-text-tertiary">完成率</p>
          </div>
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${efficiency}%` }}
          />
        </div>
      </div>
    </div>
  );

  // 渲染系统状态
  const renderSystemStatus = () => {
    if (!storageInfo) return null;

    // 假设总磁盘空间为 256GB，计算使用百分比
    const totalDiskGB = 256;
    const usedPercent = Math.min(
      100,
      Math.round(
        (storageInfo.totalSize / (totalDiskGB * 1024 * 1024 * 1024)) * 100
      )
    );

    return (
      <div className="bg-bg-secondary rounded-xl border border-border p-5">
        <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest mb-4">
          系统状态
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">存储占用</span>
              <span className="text-text-primary">
                {formatBytes(storageInfo.totalSize)}
              </span>
            </div>
            <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usedPercent > 80
                    ? "bg-error"
                    : usedPercent > 60
                      ? "bg-warning"
                      : "bg-primary"
                }`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-text-tertiary">数据库</span>
            <span className="text-text-primary">
              {formatBytes(storageInfo.dataSize)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-text-tertiary">缓存</span>
            <span className="text-text-primary">
              {formatBytes(storageInfo.cacheSize)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto p-8 flex flex-col gap-8">
      {/* 欢迎区域 */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-bg-primary to-bg-primary border border-border p-8">
        <div className="relative z-1 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-text-primary mb-2">
              欢迎回来，{user?.nickname || user?.username || "用户"}
              <span className="text-primary inline-block animate-pulse">_</span>
            </h2>
            <p className="text-text-secondary text-lg">
              今天是 {dateStr}，{weekDay}
              {stats.todayDue > 0 && (
                <span className="text-primary font-medium">
                  ，您有 {stats.todayDue} 个待处理任务
                </span>
              )}
              {stats.overdue > 0 && (
                <span className="text-error font-medium">
                  ，{stats.overdue} 个已逾期
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="bg-bg-hover backdrop-blur-sm border border-border p-4 rounded-xl text-center min-w-[100px]">
              <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">
                今日效率
              </p>
              <p className="text-2xl font-bold text-primary">{efficiency}%</p>
            </div>
            <div className="bg-bg-hover backdrop-blur-sm border border-border p-4 rounded-xl text-center min-w-[100px]">
              <p className="text-xs text-text-tertiary uppercase tracking-widest mb-1">
                待处理
              </p>
              <p className="text-2xl font-bold text-text-primary">
                {stats.pending + stats.inProgress}
              </p>
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
            {overdueTodos.length > 0 && (
              <span className="text-xs font-normal text-error bg-error/10 px-2 py-0.5 rounded">
                {overdueTodos.length} 个逾期
              </span>
            )}
          </h3>
          {renderFocusTasks()}
        </section>

        {/* 统计和状态 */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-text-primary">
            <span className="w-1.5 h-6 bg-primary rounded-full" />
            数据概览
          </h3>
          {renderStatsCards()}
          {renderSystemStatus()}
        </section>
      </div>
    </div>
  );
};

export default Home;
