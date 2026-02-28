/**
 * 待办提醒页面
 * 按分类分组展示待办事项
 */

import React, { useState, useCallback, useMemo } from "react";
import { Modal, Form, Input, Select, DatePicker, App } from "antd";
import dayjs from "dayjs";
import { useTodos, useTodoCategories } from "@/hooks/useTodos";
import type {
  Todo,
  TodoInput,
  TodoUpdateInput,
  TodoCategory,
} from "@/types/electron";
import { PRIORITY_CONFIG, STATUS_CONFIG, ICON_OPTIONS } from "./config";
import { TodoCard } from "./components/TodoCard";

const { TextArea } = Input;
const { Option } = Select;

// 颜色列表
const COLOR_OPTIONS = [
  "#3B82F6",
  "#F97316",
  "#A855F7",
  "#EF4444",
  "#10B981",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const Todo: React.FC = () => {
  const { message } = App.useApp();

  // 状态
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<
    "in_progress" | "completed" | "all"
  >("in_progress");
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");

  // 弹窗状态
  const [todoModalVisible, setTodoModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [todoForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // 使用 hooks
  const { categories, createCategory, updateCategory, deleteCategory } =
    useTodoCategories();

  const {
    todos,
    loading: todosLoading,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
  } = useTodos();

  // 按分类分组待办
  const todosByCategory = useMemo(() => {
    const grouped: Record<number, Todo[]> = {};

    // 先按状态和搜索过滤
    let filtered = todos;

    // Tab 过滤
    if (activeTab === "in_progress") {
      filtered = filtered.filter(
        (t) => t.status !== "completed" && t.status !== "cancelled"
      );
    } else if (activeTab === "completed") {
      filtered = filtered.filter((t) => t.status === "completed");
    }

    // 搜索过滤
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(lowerSearch) ||
          t.description?.toLowerCase().includes(lowerSearch)
      );
    }

    // 按分类分组
    filtered.forEach((todo) => {
      const catId = todo.categoryId || 0; // 0 表示未分类
      if (!grouped[catId]) {
        grouped[catId] = [];
      }
      grouped[catId].push(todo);
    });

    return grouped;
  }, [todos, activeTab, searchText]);

  // 统计数量
  const inProgressCount = todos.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  ).length;
  const completedCount = todos.filter((t) => t.status === "completed").length;

  // 打开编辑待办弹窗
  const handleEditTodo = useCallback(
    (todo: Todo) => {
      setEditingTodo(todo);
      todoForm.setFieldsValue({
        title: todo.title,
        description: todo.description,
        categoryId: todo.categoryId,
        priority: todo.priority,
        status: todo.status,
        dueDate: todo.dueDate ? dayjs(todo.dueDate) : undefined,
      });
      setTodoModalVisible(true);
    },
    [todoForm]
  );

  // 创建待办（从卡片调用）
  const handleCreateTodoFromCard = useCallback(
    async (data: Partial<Todo>) => {
      const result = await createTodo(data as TodoInput);
      if (result) {
        message.success("添加成功");
      }
      return result;
    },
    [createTodo, message]
  );

  // 保存待办
  const handleSaveTodo = useCallback(async () => {
    try {
      const values = await todoForm.validateFields();
      const todoData: TodoInput | TodoUpdateInput = {
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        priority: values.priority,
        status: values.status,
        dueDate: values.dueDate?.valueOf(),
      };

      let result;
      if (editingTodo) {
        result = await updateTodo(editingTodo.id, todoData);
        if (result) {
          message.success("更新成功");
        }
      } else {
        result = await createTodo(todoData as TodoInput);
        if (result) {
          message.success("创建成功");
        }
      }

      setTodoModalVisible(false);
    } catch (error) {
      console.error("保存失败:", error);
    }
  }, [editingTodo, todoForm, createTodo, updateTodo, message]);

  // 删除待办
  const handleDeleteTodo = useCallback(
    async (id: number) => {
      const result = await deleteTodo(id);
      if (result) {
        message.success("删除成功");
      }
    },
    [deleteTodo, message]
  );

  // 切换完成状态
  const handleToggleComplete = useCallback(
    async (todo: Todo) => {
      const result = await toggleComplete(todo.id, todo.status);
      if (result) {
        message.success(todo.status === "completed" ? "已恢复" : "已完成");
      }
    },
    [toggleComplete, message]
  );

  // 创建分类
  const handleCreateCategory = useCallback(async () => {
    try {
      const values = await categoryForm.validateFields();
      const result = await createCategory({
        name: values.name,
        description: values.description,
        color: newCategoryColor,
        icon: values.icon,
      });
      if (result) {
        message.success("分类创建成功");
        setCategoryModalVisible(false);
        categoryForm.resetFields();
        setNewCategoryColor("#3B82F6");
      }
    } catch (error) {
      console.error("创建分类失败:", error);
    }
  }, [categoryForm, createCategory, message, newCategoryColor]);

  // 更新分类
  const handleUpdateCategory = useCallback(
    async (id: number, data: Partial<TodoCategory>) => {
      const result = await updateCategory(id, data);
      if (result) {
        message.success("分类更新成功");
      }
      return result;
    },
    [updateCategory, message]
  );

  // 删除分类
  const handleDeleteCategory = useCallback(
    async (id: number) => {
      const result = await deleteCategory(id);
      if (result) {
        message.success("分类删除成功");
      }
    },
    [deleteCategory, message]
  );

  return (
    <div className="todo flex h-full overflow-hidden">
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* 头部 - 匹配设计稿样式 */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-bg-primary/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">任务看板</h2>
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-full px-3 py-1">
              <span className="size-2 rounded-full bg-green-500" />
              <span className="text-xs text-text-tertiary">系统已连接</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xl">
                search
              </span>
              <input
                className="bg-slate-800/50 border-none rounded-full pl-10 pr-4 py-1.5 text-sm w-64 focus:ring-1 focus:ring-primary"
                placeholder="搜索任务..."
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <button
              onClick={() => setCategoryModalVisible(true)}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              新建分类
            </button>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* 标题 */}
          <div className="mb-8">
            <h3 className="text-3xl font-bold mb-2">我的提醒事项</h3>
            <p className="text-text-tertiary">管理您的日常任务和分组记录</p>
          </div>

          {/* Tab 切换 - 匹配设计稿样式 */}
          <div className="flex gap-8 border-b border-slate-800 mb-8">
            <button
              onClick={() => setActiveTab("in_progress")}
              className={`pb-4 text-sm font-semibold ${
                activeTab === "in_progress"
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-text-tertiary hover:text-text-secondary transition-colors"
              }`}
            >
              进行中 ({inProgressCount})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`pb-4 text-sm font-semibold ${
                activeTab === "completed"
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-text-tertiary hover:text-text-secondary transition-colors"
              }`}
            >
              已完成 ({completedCount})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-4 text-sm font-semibold ${
                activeTab === "all"
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-text-tertiary hover:text-text-secondary transition-colors"
              }`}
            >
              所有任务
            </button>
          </div>
          {todosLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="material-symbols-outlined animate-spin text-4xl text-primary">
                progress_activity
              </span>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
              <span className="material-symbols-outlined text-6xl mb-4">
                checklist
              </span>
              <p className="text-lg">暂无分类</p>
              <button
                onClick={() => setCategoryModalVisible(true)}
                className="mt-4 flex items-center gap-2 text-primary hover:text-primary-hover transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
                创建第一个分类
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* 分类卡片 */}
              {categories.map((category) => (
                <TodoCard
                  key={category.id}
                  category={category}
                  todos={todosByCategory[category.id] || []}
                  onToggleComplete={handleToggleComplete}
                  onEditTodo={handleEditTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onCreateTodo={handleCreateTodoFromCard}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              ))}

              {/* 未分类的待办 */}
              {todosByCategory[0] && todosByCategory[0].length > 0 && (
                <TodoCard
                  key="uncategorized"
                  category={{
                    id: 0,
                    name: "未分类",
                    color: "#6B7280",
                    icon: "folder_open",
                    sortOrder: 999,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  }}
                  todos={todosByCategory[0]}
                  onToggleComplete={handleToggleComplete}
                  onEditTodo={handleEditTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onCreateTodo={handleCreateTodoFromCard}
                  onUpdateCategory={() => {}}
                  onDeleteCategory={() => {}}
                />
              )}

              {/* 创建新分类占位 - 匹配设计稿样式 */}
              <div
                onClick={() => setCategoryModalVisible(true)}
                className="border-2 border-dashed border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-slate-700 hover:bg-slate-800/20 transition-all cursor-pointer group"
              >
                <div className="size-12 rounded-full bg-slate-800 flex items-center justify-center text-text-tertiary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <p className="text-sm font-medium text-text-tertiary">
                  创建新任务分组
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI 助手按钮 - 匹配设计稿样式 */}
        <div className="absolute bottom-8 right-8">
          <button className="bg-primary hover:bg-primary/90 text-white flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl shadow-primary/30 transition-all transform hover:scale-105 active:scale-95 group">
            <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">
              auto_awesome
            </span>
            <span className="font-bold tracking-wide">AI 助手</span>
            <div className="ml-2 flex items-center gap-0.5">
              <span className="w-1 h-1 bg-white/40 rounded-full" />
              <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
              <span className="w-1 h-1 bg-white/40 rounded-full" />
            </div>
          </button>
        </div>
      </main>

      {/* 待办编辑弹窗 */}
      <Modal
        title={editingTodo ? "编辑待办" : "新建待办"}
        open={todoModalVisible}
        onCancel={() => setTodoModalVisible(false)}
        onOk={handleSaveTodo}
        okText="保存"
        cancelText="取消"
        width={520}
      >
        <Form form={todoForm} layout="vertical" className="mt-4">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: "请输入标题" }]}
          >
            <Input placeholder="输入待办标题" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="输入详细描述（可选）" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="categoryId" label="分类">
              <Select placeholder="选择分类" allowClear>
                {categories.map((cat) => (
                  <Option key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="priority" label="优先级">
              <Select>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <span className={config.color}>{config.label}</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="status" label="状态">
              <Select>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>
                    {config.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="dueDate" label="截止日期">
              <DatePicker
                className="w-full"
                showTime
                format="YYYY-MM-DD HH:mm"
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* 分类创建弹窗 */}
      <Modal
        title="新建分类"
        open={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        onOk={handleCreateCategory}
        okText="创建"
        cancelText="取消"
      >
        <Form form={categoryForm} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: "请输入分类名称" }]}
          >
            <Input placeholder="输入分类名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input placeholder="输入分类描述（可选）" />
          </Form.Item>

          <Form.Item label="颜色">
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <div
                  key={color}
                  className={`size-8 rounded-full cursor-pointer border-2 transition-all ${
                    newCategoryColor === color
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewCategoryColor(color)}
                />
              ))}
            </div>
          </Form.Item>

          <Form.Item name="icon" label="图标" initialValue="folder">
            <Select>
              {ICON_OPTIONS.map((icon) => (
                <Option key={icon.value} value={icon.value}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">
                      {icon.value}
                    </span>
                    {icon.label}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Todo;
