/**
 * Todo 提醒服务
 *
 * 管理待办事项的系统通知提醒
 */

import { Notification } from "electron";
import {
  getTodoWithCategory,
  listUpcomingReminders,
  listUpcomingDueTodos,
} from "./todoService";
import type { Todo } from "./todoService";

// 提醒检查定时器
let reminderInterval: NodeJS.Timeout | null = null;

// 已发送提醒的 ID 集合（防止重复提醒）
const sentReminders = new Set<number>();

/**
 * 启动提醒检查服务
 * @param mainWindow 主窗口引用（用于发送 IPC 消息）
 */
export function startReminderService(): void {
  // 每 1 分钟检查一次提醒
  if (reminderInterval) {
    clearInterval(reminderInterval);
  }

  // 立即检查一次
  checkReminders();

  // 设置定时检查
  reminderInterval = setInterval(() => {
    checkReminders();
  }, 60 * 1000); // 1 分钟

  console.log("[ReminderService] 提醒服务已启动");
}

/**
 * 停止提醒检查服务
 */
export function stopReminderService(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
  console.log("[ReminderService] 提醒服务已停止");
}

/**
 * 检查并发送提醒
 */
function checkReminders(): void {
  try {
    const now = Date.now();

    // 1. 检查设置了提醒时间的待办
    const upcomingReminders = listUpcomingReminders(now, now + 5 * 60 * 1000);
    for (const todo of upcomingReminders) {
      if (sentReminders.has(todo.id)) {
        continue;
      }
      sendNotification(todo, "reminder");
      sentReminders.add(todo.id);
    }

    // 2. 检查截止时间到了的待办（没有设置提醒时间的）
    const upcomingDueTodos = listUpcomingDueTodos(now, now + 60 * 1000);
    for (const todo of upcomingDueTodos) {
      // 如果已经有提醒时间的提醒，跳过
      if (sentReminders.has(todo.id)) {
        continue;
      }
      sendNotification(todo, "due");
      sentReminders.add(todo.id);
    }

    // 清理过期的提醒记录
    if (sentReminders.size > 1000) {
      sentReminders.clear();
    }
  } catch (error) {
    console.error("[ReminderService] 检查提醒失败:", error);
  }
}

/**
 * 发送系统通知
 */
function sendNotification(todo: Todo, type: "reminder" | "due"): void {
  if (!Notification.isSupported()) {
    console.log("[ReminderService] 系统不支持通知");
    return;
  }

  // 获取带分类信息的待办
  const todoWithCategory = getTodoWithCategory(todo.id);
  const categoryInfo = todoWithCategory?.category;

  const title =
    type === "reminder" ? `提醒: ${todo.title}` : `即将到期: ${todo.title}`;

  const body =
    type === "reminder"
      ? todo.description || "该任务即将到期"
      : "该任务已到达截止时间";

  const notification = new Notification({
    title,
    body,
    subtitle: categoryInfo?.name || "待办事项",
    silent: false,
    hasReply: false,
    closeButtonText: "关闭",
    actions: [
      {
        type: "button",
        text: "标记完成",
      },
      {
        type: "button",
        text: "稍后提醒",
      },
    ],
  });

  notification.on("click", () => {
    console.log(`[ReminderService] 用户点击了通知: ${todo.title}`);
    notification.close();
  });

  notification.on("action", (event, index) => {
    if (index === 0) {
      console.log(`[ReminderService] 用户选择标记完成: ${todo.title}`);
    } else if (index === 1) {
      console.log(`[ReminderService] 用户选择稍后提醒: ${todo.title}`);
      sentReminders.delete(todo.id);
    }
  });

  notification.show();
  console.log(`[ReminderService] 已发送通知: ${todo.title}`);
}

/**
 * 发送逾期通知
 */
export function sendOverdueNotification(todos: Todo[]): void {
  if (!Notification.isSupported() || todos.length === 0) {
    return;
  }

  const notification = new Notification({
    title: "逾期任务提醒",
    body: `您有 ${todos.length} 个任务已逾期，请及时处理`,
    silent: false,
  });

  notification.show();
}

/**
 * 发送今日任务汇总通知
 */
export function sendDailySummaryNotification(count: number): void {
  if (!Notification.isSupported() || count === 0) {
    return;
  }

  const notification = new Notification({
    title: "今日待办",
    body: `今天有 ${count} 个待办任务需要处理`,
    silent: false,
  });

  notification.show();
}

/**
 * 应用启动时发送欢迎通知
 */
export function sendWelcomeNotification(): void {
  if (!Notification.isSupported()) {
    return;
  }

  const notification = new Notification({
    title: "个人工作站已启动",
    body: "待办提醒服务已就绪",
    silent: true,
  });

  notification.show();
}

/**
 * 手动发送测试通知
 */
export function sendTestNotification(): boolean {
  if (!Notification.isSupported()) {
    return false;
  }

  const notification = new Notification({
    title: "测试通知",
    body: "这是一条测试通知，用于验证通知功能是否正常工作",
    silent: false,
  });

  notification.show();
  return true;
}

/**
 * 清除指定任务的提醒状态
 * 用于任务被删除或完成时
 */
export function clearReminderStatus(todoId: number): void {
  sentReminders.delete(todoId);
}
