/**
 * Todo 待办事项服务
 *
 * 提供待办事项和分类的 CRUD 操作
 */

import { getDatabase } from "../database/index";

// ==================== 类型定义 ====================

export type TodoPriority = "low" | "medium" | "high" | "urgent";
export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TodoRepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface TodoCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface TodoCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export interface Todo {
  id: number;
  title: string;
  description?: string;
  categoryId?: number;
  category?: TodoCategory;
  priority: TodoPriority;
  status: TodoStatus;
  dueDate?: number;
  reminderTime?: number;
  repeatType: TodoRepeatType;
  repeatConfig?: Record<string, unknown>;
  parentId?: number;
  tags?: string[];
  sortOrder: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  // 子任务（可选）
  subTasks?: Todo[];
}

export interface TodoInput {
  title: string;
  description?: string;
  categoryId?: number;
  priority?: TodoPriority;
  status?: TodoStatus;
  dueDate?: number;
  reminderTime?: number;
  repeatType?: TodoRepeatType;
  repeatConfig?: Record<string, unknown>;
  parentId?: number;
  tags?: string[];
  sortOrder?: number;
}

export interface TodoUpdateInput {
  title?: string;
  description?: string;
  categoryId?: number;
  priority?: TodoPriority;
  status?: TodoStatus;
  dueDate?: number;
  reminderTime?: number;
  repeatType?: TodoRepeatType;
  repeatConfig?: Record<string, unknown>;
  parentId?: number;
  tags?: string[];
  sortOrder?: number;
}

export interface TodoFilter {
  status?: TodoStatus;
  priority?: TodoPriority;
  categoryId?: number;
  parentId?: number;
  dueDateFrom?: number;
  dueDateTo?: number;
  search?: string;
}

// ==================== 分类操作 ====================

/**
 * 获取所有分类
 */
export function listCategories(): TodoCategory[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM todo_categories
    ORDER BY sort_order ASC, created_at ASC
  `);
  const rows = stmt.all() as Array<Record<string, unknown>>;
  return rows.map(transformCategoryRow);
}

/**
 * 获取单个分类
 */
export function getCategory(id: number): TodoCategory | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM todo_categories WHERE id = ?");
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? transformCategoryRow(row) : null;
}

/**
 * 创建分类
 */
export function createCategory(input: TodoCategoryInput): TodoCategory {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO todo_categories (name, description, color, icon, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.name,
    input.description || null,
    input.color || "#3C83F6",
    input.icon || "FolderOutlined",
    input.sortOrder || 0,
    now,
    now
  );

  return {
    id: result.lastInsertRowid as number,
    name: input.name,
    description: input.description,
    color: input.color || "#3C83F6",
    icon: input.icon || "FolderOutlined",
    sortOrder: input.sortOrder || 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 更新分类
 */
export function updateCategory(
  id: number,
  input: Partial<TodoCategoryInput>
): TodoCategory | null {
  const db = getDatabase();
  const existing = getCategory(id);
  if (!existing) {
    return null;
  }

  const now = Date.now();
  const updates: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    values.push(input.description);
  }
  if (input.color !== undefined) {
    updates.push("color = ?");
    values.push(input.color);
  }
  if (input.icon !== undefined) {
    updates.push("icon = ?");
    values.push(input.icon);
  }
  if (input.sortOrder !== undefined) {
    updates.push("sort_order = ?");
    values.push(input.sortOrder);
  }

  values.push(id);
  const stmt = db.prepare(`
    UPDATE todo_categories SET ${updates.join(", ")} WHERE id = ?
  `);
  stmt.run(...values);

  return getCategory(id);
}

/**
 * 删除分类
 */
export function deleteCategory(id: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM todo_categories WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * 获取分类统计
 */
export function getCategoryStats(): Array<{ categoryId: number | null; count: number }> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT category_id, COUNT(*) as count
    FROM todos
    WHERE status != 'cancelled'
    GROUP BY category_id
  `);
  return stmt.all() as Array<{ categoryId: number | null; count: number }>;
}

// ==================== Todo 操作 ====================

/**
 * 获取 Todo 列表
 */
export function listTodos(filter?: TodoFilter): Todo[] {
  const db = getDatabase();

  let sql = "SELECT * FROM todos WHERE 1=1";
  const params: unknown[] = [];

  if (filter) {
    if (filter.status) {
      sql += " AND status = ?";
      params.push(filter.status);
    }
    if (filter.priority) {
      sql += " AND priority = ?";
      params.push(filter.priority);
    }
    if (filter.categoryId !== undefined) {
      if (filter.categoryId === null) {
        sql += " AND category_id IS NULL";
      } else {
        sql += " AND category_id = ?";
        params.push(filter.categoryId);
      }
    }
    if (filter.parentId !== undefined) {
      if (filter.parentId === null) {
        sql += " AND parent_id IS NULL";
      } else {
        sql += " AND parent_id = ?";
        params.push(filter.parentId);
      }
    }
    if (filter.dueDateFrom) {
      sql += " AND due_date >= ?";
      params.push(filter.dueDateFrom);
    }
    if (filter.dueDateTo) {
      sql += " AND due_date <= ?";
      params.push(filter.dueDateTo);
    }
    if (filter.search) {
      sql += " AND (title LIKE ? OR description LIKE ?)";
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm);
    }
  }

  sql += " ORDER BY sort_order ASC, created_at DESC";

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as Array<Record<string, unknown>>;
  return rows.map(transformTodoRow);
}

/**
 * 获取单个 Todo
 */
export function getTodo(id: number): Todo | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM todos WHERE id = ?");
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? transformTodoRow(row) : null;
}

/**
 * 创建 Todo
 */
export function createTodo(input: TodoInput): Todo {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO todos (
      title, description, category_id, priority, status,
      due_date, reminder_time, repeat_type, repeat_config,
      parent_id, tags, sort_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.title,
    input.description || null,
    input.categoryId || null,
    input.priority || "medium",
    input.status || "pending",
    input.dueDate || null,
    input.reminderTime || null,
    input.repeatType || "none",
    input.repeatConfig ? JSON.stringify(input.repeatConfig) : null,
    input.parentId || null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.sortOrder || 0,
    now,
    now
  );

  return getTodo(result.lastInsertRowid as number)!;
}

/**
 * 更新 Todo
 */
export function updateTodo(id: number, input: TodoUpdateInput): Todo | null {
  const db = getDatabase();
  const existing = getTodo(id);
  if (!existing) {
    return null;
  }

  const now = Date.now();
  const updates: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  if (input.title !== undefined) {
    updates.push("title = ?");
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    values.push(input.description);
  }
  if (input.categoryId !== undefined) {
    updates.push("category_id = ?");
    values.push(input.categoryId || null);
  }
  if (input.priority !== undefined) {
    updates.push("priority = ?");
    values.push(input.priority);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    values.push(input.status);
    // 如果状态变为完成，记录完成时间
    if (input.status === "completed") {
      updates.push("completed_at = ?");
      values.push(now);
    } else {
      updates.push("completed_at = ?");
      values.push(null);
    }
  }
  if (input.dueDate !== undefined) {
    updates.push("due_date = ?");
    values.push(input.dueDate || null);
  }
  if (input.reminderTime !== undefined) {
    updates.push("reminder_time = ?");
    values.push(input.reminderTime || null);
  }
  if (input.repeatType !== undefined) {
    updates.push("repeat_type = ?");
    values.push(input.repeatType);
  }
  if (input.repeatConfig !== undefined) {
    updates.push("repeat_config = ?");
    values.push(input.repeatConfig ? JSON.stringify(input.repeatConfig) : null);
  }
  if (input.parentId !== undefined) {
    updates.push("parent_id = ?");
    values.push(input.parentId || null);
  }
  if (input.tags !== undefined) {
    updates.push("tags = ?");
    values.push(input.tags ? JSON.stringify(input.tags) : null);
  }
  if (input.sortOrder !== undefined) {
    updates.push("sort_order = ?");
    values.push(input.sortOrder);
  }

  values.push(id);
  const stmt = db.prepare(`
    UPDATE todos SET ${updates.join(", ")} WHERE id = ?
  `);
  stmt.run(...values);

  return getTodo(id);
}

/**
 * 删除 Todo
 */
export function deleteTodo(id: number): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM todos WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * 批量更新状态
 */
export function batchUpdateStatus(ids: number[], status: TodoStatus): number {
  const db = getDatabase();
  const now = Date.now();

  let sql = "UPDATE todos SET status = ?, updated_at = ?";
  const params: unknown[] = [status, now];

  if (status === "completed") {
    sql += ", completed_at = ?";
    params.push(now);
  } else {
    sql += ", completed_at = NULL";
  }

  sql += ` WHERE id IN (${ids.map(() => "?").join(", ")})`;
  params.push(...ids);

  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.changes;
}

/**
 * 批量删除
 */
export function batchDelete(ids: number[]): number {
  const db = getDatabase();
  const stmt = db.prepare(`DELETE FROM todos WHERE id IN (${ids.map(() => "?").join(", ")})`);
  const result = stmt.run(...ids);
  return result.changes;
}

/**
 * 获取子任务
 */
export function getSubTasks(parentId: number): Todo[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM todos WHERE parent_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `);
  const rows = stmt.all(parentId) as Array<Record<string, unknown>>;
  return rows.map(transformTodoRow);
}

/**
 * 获取今日待办
 */
export function getTodayTodos(): Todo[] {
  const db = getDatabase();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  const stmt = db.prepare(`
    SELECT * FROM todos
    WHERE status != 'completed' AND status != 'cancelled'
    AND (
      due_date IS NULL
      OR (due_date >= ? AND due_date <= ?)
    )
    ORDER BY priority DESC, sort_order ASC, created_at ASC
  `);
  const rows = stmt.all(startOfDay, endOfDay) as Array<Record<string, unknown>>;
  return rows.map(transformTodoRow);
}

/**
 * 获取逾期待办
 */
export function getOverdueTodos(): Todo[] {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    SELECT * FROM todos
    WHERE status = 'pending' AND due_date IS NOT NULL AND due_date < ?
    ORDER BY due_date ASC, priority DESC
  `);
  const rows = stmt.all(now) as Array<Record<string, unknown>>;
  return rows.map(transformTodoRow);
}

/**
 * 获取即将到期的待办
 */
export function getUpcomingTodos(days: number = 7): Todo[] {
  const db = getDatabase();
  const now = Date.now();
  const endTime = now + days * 24 * 60 * 60 * 1000;

  const stmt = db.prepare(`
    SELECT * FROM todos
    WHERE status = 'pending'
    AND due_date IS NOT NULL
    AND due_date >= ?
    AND due_date <= ?
    ORDER BY due_date ASC, priority DESC
  `);
  const rows = stmt.all(now, endTime) as Array<Record<string, unknown>>;
  return rows.map(transformTodoRow);
}

/**
 * 获取统计信息
 */
export function getTodoStats(): {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  todayDue: number;
} {
  const db = getDatabase();
  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  endOfDay.setTime(endOfDay.getTime() - 1);

  const totalStmt = db.prepare("SELECT COUNT(*) as count FROM todos WHERE status != 'cancelled'");
  const pendingStmt = db.prepare("SELECT COUNT(*) as count FROM todos WHERE status = 'pending'");
  const inProgressStmt = db.prepare("SELECT COUNT(*) as count FROM todos WHERE status = 'in_progress'");
  const completedStmt = db.prepare("SELECT COUNT(*) as count FROM todos WHERE status = 'completed'");
  const overdueStmt = db.prepare(`
    SELECT COUNT(*) as count FROM todos
    WHERE status = 'pending' AND due_date IS NOT NULL AND due_date < ?
  `);
  const todayStmt = db.prepare(`
    SELECT COUNT(*) as count FROM todos
    WHERE status = 'pending' AND due_date IS NOT NULL
    AND due_date >= ? AND due_date <= ?
  `);

  return {
    total: (totalStmt.get() as { count: number }).count,
    pending: (pendingStmt.get() as { count: number }).count,
    inProgress: (inProgressStmt.get() as { count: number }).count,
    completed: (completedStmt.get() as { count: number }).count,
    overdue: (overdueStmt.get(now) as { count: number }).count,
    todayDue: (todayStmt.get(startOfDay.getTime(), endOfDay.getTime()) as { count: number }).count,
  };
}

// ==================== 辅助函数 ====================

function transformCategoryRow(row: Record<string, unknown>): TodoCategory {
  return {
    id: row.id as number,
    name: row.name as string,
    description: row.description as string | undefined,
    color: (row.color as string) || "#3C83F6",
    icon: (row.icon as string) || "FolderOutlined",
    sortOrder: (row.sort_order as number) || 0,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function transformTodoRow(row: Record<string, unknown>): Todo {
  return {
    id: row.id as number,
    title: row.title as string,
    description: row.description as string | undefined,
    categoryId: row.category_id as number | undefined,
    priority: (row.priority as TodoPriority) || "medium",
    status: (row.status as TodoStatus) || "pending",
    dueDate: row.due_date as number | undefined,
    reminderTime: row.reminder_time as number | undefined,
    repeatType: (row.repeat_type as TodoRepeatType) || "none",
    repeatConfig: row.repeat_config
      ? (JSON.parse(row.repeat_config as string) as Record<string, unknown>)
      : undefined,
    parentId: row.parent_id as number | undefined,
    tags: row.tags ? (JSON.parse(row.tags as string) as string[]) : undefined,
    sortOrder: (row.sort_order as number) || 0,
    completedAt: row.completed_at as number | undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export default {
  // 分类
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  // Todo
  listTodos,
  getTodo,
  createTodo,
  updateTodo,
  deleteTodo,
  batchUpdateStatus,
  batchDelete,
  getSubTasks,
  getTodayTodos,
  getOverdueTodos,
  getUpcomingTodos,
  getTodoStats,
};
