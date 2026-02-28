/**
 * Todo 待办事项 IPC 处理器
 *
 * 处理待办事项和分类的 IPC 请求
 */

import { ipcMain } from "electron";
import * as todoService from "../services/todoService";
import { sendTestNotification } from "../services/reminderService";
import type {
  TodoCategory,
  TodoCategoryInput,
  Todo,
  TodoInput,
  TodoUpdateInput,
  TodoFilter,
  TodoStatus,
} from "../services/todoService";

/**
 * 注册 Todo 相关 IPC 处理器
 */
export function registerTodoIpc(): void {
  // ========== 分类管理 ==========

  // 获取所有分类
  ipcMain.handle("todo:listCategories", (): TodoCategory[] => {
    try {
      return todoService.listCategories();
    } catch (error) {
      console.error("[TodoIpc] 获取分类列表失败:", error);
      return [];
    }
  });

  // 获取单个分类
  ipcMain.handle(
    "todo:getCategory",
    (_event, id: number): TodoCategory | null => {
      try {
        return todoService.getCategory(id);
      } catch (error) {
        console.error("[TodoIpc] 获取分类失败:", error);
        return null;
      }
    }
  );

  // 创建分类
  ipcMain.handle(
    "todo:createCategory",
    (_event, input: TodoCategoryInput): TodoCategory | null => {
      try {
        return todoService.createCategory(input);
      } catch (error) {
        console.error("[TodoIpc] 创建分类失败:", error);
        return null;
      }
    }
  );

  // 更新分类
  ipcMain.handle(
    "todo:updateCategory",
    (
      _event,
      id: number,
      input: Partial<TodoCategoryInput>
    ): TodoCategory | null => {
      try {
        return todoService.updateCategory(id, input);
      } catch (error) {
        console.error("[TodoIpc] 更新分类失败:", error);
        return null;
      }
    }
  );

  // 删除分类
  ipcMain.handle("todo:deleteCategory", (_event, id: number): boolean => {
    try {
      return todoService.deleteCategory(id);
    } catch (error) {
      console.error("[TodoIpc] 删除分类失败:", error);
      return false;
    }
  });

  // 获取分类统计
  ipcMain.handle("todo:getCategoryStats", () => {
    try {
      return todoService.getCategoryStats();
    } catch (error) {
      console.error("[TodoIpc] 获取分类统计失败:", error);
      return [];
    }
  });

  // ========== Todo 管理 ==========

  // 获取 Todo 列表
  ipcMain.handle("todo:listTodos", (_event, filter?: TodoFilter): Todo[] => {
    try {
      return todoService.listTodos(filter);
    } catch (error) {
      console.error("[TodoIpc] 获取 Todo 列表失败:", error);
      return [];
    }
  });

  // 获取单个 Todo
  ipcMain.handle("todo:getTodo", (_event, id: number): Todo | null => {
    try {
      return todoService.getTodo(id);
    } catch (error) {
      console.error("[TodoIpc] 获取 Todo 失败:", error);
      return null;
    }
  });

  // 创建 Todo
  ipcMain.handle("todo:createTodo", (_event, input: TodoInput): Todo | null => {
    try {
      return todoService.createTodo(input);
    } catch (error) {
      console.error("[TodoIpc] 创建 Todo 失败:", error);
      return null;
    }
  });

  // 更新 Todo
  ipcMain.handle(
    "todo:updateTodo",
    (_event, id: number, input: TodoUpdateInput): Todo | null => {
      try {
        return todoService.updateTodo(id, input);
      } catch (error) {
        console.error("[TodoIpc] 更新 Todo 失败:", error);
        return null;
      }
    }
  );

  // 删除 Todo
  ipcMain.handle("todo:deleteTodo", (_event, id: number): boolean => {
    try {
      return todoService.deleteTodo(id);
    } catch (error) {
      console.error("[TodoIpc] 删除 Todo 失败:", error);
      return false;
    }
  });

  // 批量更新状态
  ipcMain.handle(
    "todo:batchUpdateStatus",
    (_event, ids: number[], status: TodoStatus): number => {
      try {
        return todoService.batchUpdateStatus(ids, status);
      } catch (error) {
        console.error("[TodoIpc] 批量更新状态失败:", error);
        return 0;
      }
    }
  );

  // 批量删除
  ipcMain.handle("todo:batchDelete", (_event, ids: number[]): number => {
    try {
      return todoService.batchDelete(ids);
    } catch (error) {
      console.error("[TodoIpc] 批量删除失败:", error);
      return 0;
    }
  });

  // 获取子任务
  ipcMain.handle("todo:getSubTasks", (_event, parentId: number): Todo[] => {
    try {
      return todoService.getSubTasks(parentId);
    } catch (error) {
      console.error("[TodoIpc] 获取子任务失败:", error);
      return [];
    }
  });

  // 获取今日待办
  ipcMain.handle("todo:getTodayTodos", (): Todo[] => {
    try {
      return todoService.getTodayTodos();
    } catch (error) {
      console.error("[TodoIpc] 获取今日待办失败:", error);
      return [];
    }
  });

  // 获取逾期待办
  ipcMain.handle("todo:getOverdueTodos", (): Todo[] => {
    try {
      return todoService.getOverdueTodos();
    } catch (error) {
      console.error("[TodoIpc] 获取逾期待办失败:", error);
      return [];
    }
  });

  // 获取即将到期的待办
  ipcMain.handle("todo:getUpcomingTodos", (_event, days?: number): Todo[] => {
    try {
      return todoService.getUpcomingTodos(days);
    } catch (error) {
      console.error("[TodoIpc] 获取即将到期待办失败:", error);
      return [];
    }
  });

  // 获取统计信息
  ipcMain.handle("todo:getStats", () => {
    try {
      return todoService.getTodoStats();
    } catch (error) {
      console.error("[TodoIpc] 获取统计信息失败:", error);
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        todayDue: 0,
      };
    }
  });

  // 测试通知
  ipcMain.handle("todo:testNotification", (): boolean => {
    try {
      return sendTestNotification();
    } catch (error) {
      console.error("[TodoIpc] 测试通知失败:", error);
      return false;
    }
  });

  console.log("[TodoIpc] Todo IPC 处理器已注册");
}
