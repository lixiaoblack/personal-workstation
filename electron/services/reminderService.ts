/**
 * Todo 提醒服务
 * 
 * 管理待办事项的系统通知提醒
 */

import { Notification } from "electron";
import { getTodoWithCategory, listUpcomingReminders } from "./todoService";
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
    // 获取接下来 5 分钟内的提醒
    const upcomingReminders = listUpcomingReminders(now, now + 5 * 60 * 1000);

    for (const todo of upcomingReminders) {
      // 跳过已发送的提醒
      if (sentReminders.has(todo.id)) {
        continue;
      }

      // 发送通知
      sendNotification(todo);
      
      // 记录已发送
      sentReminders.add(todo.id);
    }

    // 清理过期的提醒记录（超过 1 小时的）
    // 如果 Set 太大，可以定期清理
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
function sendNotification(todo: Todo): void {
  if (!Notification.isSupported()) {
    console.log("[ReminderService] 系统不支持通知");
    return;
  }

  // 获取带分类信息的待办
  const todoWithCategory = getTodoWithCategory(todo.id);
  const categoryInfo = todoWithCategory?.category;

  const notification = new Notification({
    title: `待办提醒: ${todo.title}`,
    body: todo.description || "该任务即将到期",
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
    // 点击通知时，可以打开主窗口并定位到该任务
    console.log(`[ReminderService] 用户点击了通知: ${todo.title}`);
    // 这里可以发送 IPC 消息给渲染进程
    notification.close();
  });

  notification.on("action", (event, index) => {
    if (index === 0) {
      // 标记完成
      console.log(`[ReminderService] 用户选择标记完成: ${todo.title}`);
      // 这里可以调用 todoService 标记完成
    } else if (index === 1) {
      // 稍后提醒 - 10 分钟后再次提醒
      console.log(`[ReminderService] 用户选择稍后提醒: ${todo.title}`);
      // 从已发送集合中移除，10 分钟后会再次提醒
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
