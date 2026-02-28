/**
 * 分组浮窗页面
 * 在独立窗口中显示单个分类的待办事项
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Checkbox, Dropdown, App } from "antd";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import { useTodos, useTodoCategories } from "@/hooks/useTodos";
import type { Todo } from "@/types/electron";
import { REPEAT_CONFIG } from "./config";

const CategoryFloat: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { message } = App.useApp();
  const catId = parseInt(categoryId || "0", 10);

  // 状态
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  // 监听主进程的主题变更通知
  useEffect(() => {
    const root = document.documentElement;

    // 应用主题并强制重绘
    const applyTheme = (theme: "light" | "dark") => {
      // 先移除所有主题属性
      root.removeAttribute("data-theme");
      root.classList.remove("dark");

      // 强制重绘 - 触发 reflow
      void root.offsetHeight;

      // 设置新主题
      root.setAttribute("data-theme", theme);
      if (theme === "dark") {
        root.classList.add("dark");
      }

      // 再次强制重绘确保样式生效
      void root.offsetHeight;
    };

    // 初始化时从主进程获取当前主题
    const initTheme = async () => {
      try {
        const theme =
          await window.electronAPI?.categoryFloatGetCurrentTheme?.();
        if (theme) {
          applyTheme(theme);
        }
      } catch {
        // 获取失败，使用 localStorage 作为备选
        const storedTheme = localStorage.getItem("theme");
        let initialTheme: "light" | "dark" = "dark";
        if (storedTheme === "light" || storedTheme === "dark") {
          initialTheme = storedTheme;
        } else if (storedTheme === "system") {
          initialTheme = window.matchMedia("(prefers-color-scheme: dark)")
            .matches
            ? "dark"
            : "light";
        }
        applyTheme(initialTheme);
      }
    };

    initTheme();

    // 监听后续主题变更
    const unsubscribe = window.electronAPI?.onThemeChanged?.((theme) => {
      applyTheme(theme);
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  // 数据
  const { categories, updateCategory } = useTodoCategories();
  const { todos, toggleComplete, loadTodos } = useTodos();

  // 当前分类
  const category = categories.find((c) => c.id === catId);

  // 该分类的待办（根据设置决定是否显示已完成）
  const categoryTodosRaw = showCompleted
    ? todos.filter((t) => t.categoryId === catId)
    : todos.filter((t) => t.categoryId === catId && t.status !== "completed");

  // 排序：未完成按截止时间升序，无截止时间在后，已完成在最后
  const categoryTodos = [...categoryTodosRaw].sort((a, b) => {
    // 已完成的排最后
    const aCompleted = a.status === "completed";
    const bCompleted = b.status === "completed";
    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1;
    }
    // 都有截止时间，按时间升序
    if (a.dueDate && b.dueDate) {
      return a.dueDate - b.dueDate;
    }
    // 只有 a 有截止时间，a 排前面
    if (a.dueDate && !b.dueDate) {
      return -1;
    }
    // 只有 b 有截止时间，b 排前面
    if (!a.dueDate && b.dueDate) {
      return 1;
    }
    // 都没有截止时间，按创建时间
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // 已完成数量
  const completedCount = todos.filter(
    (t) => t.categoryId === catId && t.status === "completed"
  ).length;

  // 初始化置顶状态
  useEffect(() => {
    if (category) {
      setIsAlwaysOnTop(category.floatWindowAlwaysOnTop || false);
    }
  }, [category]);

  // 切换完成状态
  const handleToggleComplete = useCallback(
    async (todo: Todo) => {
      const result = await toggleComplete(
        todo.id,
        todo.status,
        todo.repeatType
      );
      if (result) {
        message.success(todo.status === "completed" ? "已恢复" : "已完成");
        // 刷新数据确保同步
        loadTodos();
      }
    },
    [toggleComplete, message, loadTodos]
  );

  // 切换置顶
  const handleToggleAlwaysOnTop = useCallback(async () => {
    const newValue = !isAlwaysOnTop;
    setIsAlwaysOnTop(newValue);
    await window.electronAPI?.categoryFloatSetAlwaysOnTop(catId, newValue);
    if (category) {
      updateCategory(catId, { floatWindowAlwaysOnTop: newValue });
    }
    message.success(newValue ? "已置顶" : "已取消置顶");
  }, [isAlwaysOnTop, catId, category, updateCategory, message]);

  // 关闭浮窗
  const handleClose = useCallback(() => {
    window.electronAPI?.categoryFloatClose(catId);
  }, [catId]);

  // 打开添加待办浮窗
  const handleOpenAddTodo = useCallback(() => {
    window.electronAPI?.floatWindowShowWithCategory(catId);
  }, [catId]);

  // 右键菜单
  const menuItems: MenuProps["items"] = [
    {
      key: "toggleCompleted",
      label: showCompleted ? "隐藏已完成" : "显示已完成",
      onClick: () => setShowCompleted(!showCompleted),
    },
    {
      key: "alwaysOnTop",
      label: isAlwaysOnTop ? "取消置顶" : "始终置顶",
      onClick: handleToggleAlwaysOnTop,
    },
    { type: "divider" },
    {
      key: "close",
      label: "关闭浮窗",
      onClick: handleClose,
    },
  ];

  // 格式化时间
  const formatTime = (timestamp?: number, isCompleted?: boolean) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const isOverdue = date < now && !isCompleted;

    if (isOverdue) {
      return {
        text: `已逾期 ${date.toLocaleDateString("zh-CN", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        status: "overdue",
      };
    }

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow =
      new Date(now.getTime() + 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return {
        text: `今天 ${date.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        status: "today",
      };
    }
    if (isTomorrow) {
      return {
        text: `明天 ${date.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        status: "tomorrow",
      };
    }

    return {
      text: date.toLocaleDateString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "future",
    };
  };

  // 时间状态样式
  const getTimeStatusStyle = (status: string, isCompleted: boolean) => {
    if (isCompleted) return "text-success";
    switch (status) {
      case "overdue":
        return "text-error";
      case "today":
        return "text-warning";
      case "tomorrow":
        return "text-info";
      default:
        return "text-text-tertiary";
    }
  };

  if (!category) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary">
        分类不存在
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-bg-primary select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* 标题栏 - 可拖拽 */}
      <Dropdown
        menu={{ items: menuItems }}
        trigger={["contextMenu"]}
        placement="bottomLeft"
      >
        <div className="flex items-center justify-between px-3 py-2 cursor-move border-b border-border">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-lg"
              style={{ color: category.color }}
            >
              {category.icon}
            </span>
            <span className="font-medium text-sm text-text-primary">
              {category.name}
            </span>
            {isAlwaysOnTop && (
              <span className="material-symbols-outlined text-xs text-primary">
                push_pin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 已完成数量 */}
            {completedCount > 0 && (
              <span className="text-xs text-success">✓{completedCount}</span>
            )}
            <span className="text-xs text-text-tertiary">
              {categoryTodos.filter((t) => t.status !== "completed").length} 项
            </span>
            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className="ml-1 p-0.5 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
              title="关闭浮窗"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      </Dropdown>

      {/* 工具栏 */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-secondary/50"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* 左侧：显示/隐藏已完成 */}
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
            showCompleted
              ? "text-primary bg-primary/10"
              : "text-text-tertiary hover:text-text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {showCompleted ? "visibility" : "visibility_off"}
          </span>
          已完成
        </button>

        {/* 右侧：置顶和添加 */}
        <div className="flex items-center gap-1">
          {/* 置顶按钮 */}
          <button
            onClick={handleToggleAlwaysOnTop}
            className={`p-1 rounded transition-colors ${
              isAlwaysOnTop
                ? "text-primary bg-primary/10"
                : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary"
            }`}
            title={isAlwaysOnTop ? "取消置顶" : "始终置顶"}
          >
            <span className="material-symbols-outlined text-base">
              push_pin
            </span>
          </button>

          {/* 添加按钮 - 打开独立浮窗 */}
          <button
            onClick={handleOpenAddTodo}
            className="p-1 rounded text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
            title="添加待办"
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
        </div>
      </div>

      {/* 待办列表 */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-1"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {categoryTodos.length === 0 ? (
          <div className="text-center text-text-tertiary text-sm py-4">
            {showCompleted ? "暂无待办事项" : "暂无未完成的待办"}
          </div>
        ) : (
          categoryTodos.map((todo) => {
            const isCompleted = todo.status === "completed";
            const timeInfo = formatTime(todo.dueDate, isCompleted);

            return (
              <div
                key={todo.id}
                className={`flex items-start gap-2 p-2 rounded-lg hover:bg-bg-secondary transition-colors group ${
                  isCompleted ? "opacity-60" : ""
                }`}
              >
                <Checkbox
                  checked={isCompleted}
                  onChange={() => handleToggleComplete(todo)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm truncate ${
                      isCompleted
                        ? "line-through text-text-tertiary"
                        : "text-text-primary"
                    }`}
                  >
                    {todo.title}
                  </div>
                  <div className="flex items-center gap-2">
                    {timeInfo && (
                      <span
                        className={`text-xs ${getTimeStatusStyle(
                          timeInfo.status,
                          isCompleted
                        )}`}
                      >
                        {isCompleted && todo.completedAt
                          ? `完成于 ${dayjs(todo.completedAt).format("MM-DD HH:mm")}`
                          : timeInfo.text}
                      </span>
                    )}
                    {/* 重复任务标识 */}
                    {todo.repeatType &&
                      todo.repeatType !== "none" &&
                      !isCompleted && (
                        <span className="text-xs text-primary/70 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs">
                            {REPEAT_CONFIG[todo.repeatType]?.icon || "repeat"}
                          </span>
                          {REPEAT_CONFIG[todo.repeatType]?.label}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CategoryFloat;
