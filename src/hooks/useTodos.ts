/**
 * Todo 待办事项管理 Hook
 *
 * 提供待办事项和分类的状态管理和操作方法
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  TodoCategory,
  TodoCategoryInput,
  Todo,
  TodoInput,
  TodoUpdateInput,
  TodoFilter,
  TodoStatus,
  TodoStats,
} from "@/types/electron";

// ==================== 分类管理 Hook ====================

export function useTodoCategories() {
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryStats, setCategoryStats] = useState<
    Array<{ categoryId: number | null; count: number }>
  >([]);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.todoListCategories();
      setCategories(result);
    } catch (error) {
      console.error("[useTodoCategories] 加载分类失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载分类统计
  const loadCategoryStats = useCallback(async () => {
    try {
      const result = await window.electronAPI.todoGetCategoryStats();
      setCategoryStats(result);
    } catch (error) {
      console.error("[useTodoCategories] 加载分类统计失败:", error);
    }
  }, []);

  // 创建分类
  const createCategory = useCallback(
    async (input: TodoCategoryInput) => {
      const result = await window.electronAPI.todoCreateCategory(input);
      if (result) {
        await loadCategories();
        await loadCategoryStats();
      }
      return result;
    },
    [loadCategories, loadCategoryStats]
  );

  // 更新分类
  const updateCategory = useCallback(
    async (id: number, input: Partial<TodoCategoryInput>) => {
      const result = await window.electronAPI.todoUpdateCategory(id, input);
      if (result) {
        await loadCategories();
      }
      return result;
    },
    [loadCategories]
  );

  // 删除分类
  const deleteCategory = useCallback(
    async (id: number) => {
      const result = await window.electronAPI.todoDeleteCategory(id);
      if (result) {
        await loadCategories();
        await loadCategoryStats();
      }
      return result;
    },
    [loadCategories, loadCategoryStats]
  );

  // 获取分类的待办数量
  const getCategoryCount = useCallback(
    (categoryId: number | null) => {
      const stat = categoryStats.find((s) => s.categoryId === categoryId);
      return stat?.count || 0;
    },
    [categoryStats]
  );

  // 初始加载
  useEffect(() => {
    loadCategories();
    loadCategoryStats();
  }, [loadCategories, loadCategoryStats]);

  return {
    categories,
    loading,
    categoryStats,
    loadCategories,
    loadCategoryStats,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryCount,
  };
}

// ==================== Todo 管理 Hook ====================

export function useTodos(initialFilter?: TodoFilter) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoFilter | undefined>(initialFilter);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TodoStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    todayDue: 0,
  });

  // 加载 Todo 列表
  const loadTodos = useCallback(
    async (filterOverride?: TodoFilter) => {
      setLoading(true);
      try {
        const result = await window.electronAPI.todoListTodos(
          filterOverride || filter
        );
        setTodos(result);
      } catch (error) {
        console.error("[useTodos] 加载 Todo 列表失败:", error);
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  // 加载统计信息
  const loadStats = useCallback(async () => {
    try {
      const result = await window.electronAPI.todoGetStats();
      setStats(result);
    } catch (error) {
      console.error("[useTodos] 加载统计信息失败:", error);
    }
  }, []);

  // 创建 Todo
  const createTodo = useCallback(
    async (input: TodoInput) => {
      const result = await window.electronAPI.todoCreateTodo(input);
      if (result) {
        await loadTodos();
        await loadStats();
      }
      return result;
    },
    [loadTodos, loadStats]
  );

  // 更新 Todo
  const updateTodo = useCallback(
    async (id: number, input: TodoUpdateInput) => {
      const result = await window.electronAPI.todoUpdateTodo(id, input);
      if (result) {
        await loadTodos();
        if (input.status) {
          await loadStats();
        }
      }
      return result;
    },
    [loadTodos, loadStats]
  );

  // 删除 Todo
  const deleteTodo = useCallback(
    async (id: number) => {
      const result = await window.electronAPI.todoDeleteTodo(id);
      if (result) {
        await loadTodos();
        await loadStats();
      }
      return result;
    },
    [loadTodos, loadStats]
  );

  // 批量更新状态
  const batchUpdateStatus = useCallback(
    async (ids: number[], status: TodoStatus) => {
      const count = await window.electronAPI.todoBatchUpdateStatus(ids, status);
      if (count > 0) {
        await loadTodos();
        await loadStats();
      }
      return count;
    },
    [loadTodos, loadStats]
  );

  // 批量删除
  const batchDelete = useCallback(
    async (ids: number[]) => {
      const count = await window.electronAPI.todoBatchDelete(ids);
      if (count > 0) {
        await loadTodos();
        await loadStats();
      }
      return count;
    },
    [loadTodos, loadStats]
  );

  // 切换完成状态
  const toggleComplete = useCallback(
    async (id: number, currentStatus: TodoStatus) => {
      const newStatus: TodoStatus =
        currentStatus === "completed" ? "pending" : "completed";
      return updateTodo(id, { status: newStatus });
    },
    [updateTodo]
  );

  // 设置过滤条件
  const setFilterAndLoad = useCallback(
    (newFilter: TodoFilter | undefined) => {
      setFilter(newFilter);
      loadTodos(newFilter);
    },
    [loadTodos]
  );

  // 初始加载
  useEffect(() => {
    loadTodos();
    loadStats();
  }, [loadTodos, loadStats]);

  // 分类过滤后的 Todo 列表
  const todosByStatus = useMemo(() => {
    const pending = todos.filter((t) => t.status === "pending");
    const inProgress = todos.filter((t) => t.status === "in_progress");
    const completed = todos.filter((t) => t.status === "completed");
    const cancelled = todos.filter((t) => t.status === "cancelled");
    return { pending, inProgress, completed, cancelled };
  }, [todos]);

  return {
    todos,
    loading,
    filter,
    stats,
    todosByStatus,
    loadTodos,
    loadStats,
    createTodo,
    updateTodo,
    deleteTodo,
    batchUpdateStatus,
    batchDelete,
    toggleComplete,
    setFilter: setFilterAndLoad,
  };
}

// ==================== 特殊列表 Hook ====================

export function useTodayTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.todoGetTodayTodos();
      setTodos(result);
    } catch (error) {
      console.error("[useTodayTodos] 加载今日待办失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  return { todos, loading, loadTodos };
}

export function useOverdueTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.todoGetOverdueTodos();
      setTodos(result);
    } catch (error) {
      console.error("[useOverdueTodos] 加载逾期待办失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  return { todos, loading, loadTodos };
}

export function useUpcomingTodos(days: number = 7) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.todoGetUpcomingTodos(days);
      setTodos(result);
    } catch (error) {
      console.error("[useUpcomingTodos] 加载即将到期待办失败:", error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  return { todos, loading, loadTodos };
}

// ==================== 子任务 Hook ====================

export function useSubTasks(parentId: number | null) {
  const [subTasks, setSubTasks] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSubTasks = useCallback(async () => {
    if (parentId === null) {
      setSubTasks([]);
      return;
    }
    setLoading(true);
    try {
      const result = await window.electronAPI.todoGetSubTasks(parentId);
      setSubTasks(result);
    } catch (error) {
      console.error("[useSubTasks] 加载子任务失败:", error);
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    loadSubTasks();
  }, [loadSubTasks]);

  return { subTasks, loading, loadSubTasks };
}

export default {
  useTodoCategories,
  useTodos,
  useTodayTodos,
  useOverdueTodos,
  useUpcomingTodos,
  useSubTasks,
};
