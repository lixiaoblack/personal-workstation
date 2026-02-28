/**
 * TodoCard 待办分类卡片组件
 * 
 * 展示单个分类下的所有待办事项
 */

import React, { useState, useCallback } from "react";
import { Modal, Form, Input, Select, DatePicker, App } from "antd";
import dayjs from "dayjs";
import type { Todo, TodoCategory } from "@/types/electron";
import { PRIORITY_CONFIG } from "../../config";

const { TextArea } = Input;
const { Option } = Select;

interface TodoCardProps {
  category: TodoCategory;
  todos: Todo[];
  onToggleComplete: (todo: Todo) => void;
  onEditTodo: (todo: Todo) => void;
  onDeleteTodo: (id: number) => void;
  onCreateTodo: (todo: Partial<Todo>) => void;
  onUpdateCategory: (id: number, data: Partial<TodoCategory>) => void;
  onDeleteCategory: (id: number) => void;
}

export const TodoCard: React.FC<TodoCardProps> = ({
  category,
  todos,
  onToggleComplete,
  onEditTodo,
  onDeleteTodo,
  onCreateTodo,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const { modal } = App.useApp();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editCategoryModalVisible, setEditCategoryModalVisible] = useState(false);
  const [todoForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // 待处理数量
  const pendingCount = todos.filter((t) => t.status !== "completed").length;

  // 颜色配置
  const colorConfig = getColorConfig(category.color);

  // 添加待办
  const handleAddTodo = useCallback(async () => {
    try {
      const values = await todoForm.validateFields();
      onCreateTodo({
        title: values.title,
        description: values.description,
        categoryId: category.id,
        priority: values.priority || "medium",
        status: "pending",
        dueDate: values.dueDate?.valueOf(),
      });
      setAddModalVisible(false);
      todoForm.resetFields();
    } catch (error) {
      console.error("添加待办失败:", error);
    }
  }, [category.id, onCreateTodo, todoForm]);

  // 编辑分类
  const handleEditCategory = useCallback(async () => {
    try {
      const values = await categoryForm.validateFields();
      onUpdateCategory(category.id, {
        name: values.name,
        description: values.description,
        color: values.color,
      });
      setEditCategoryModalVisible(false);
    } catch (error) {
      console.error("编辑分类失败:", error);
    }
  }, [category.id, onUpdateCategory, categoryForm]);

  // 删除分类
  const handleDeleteCategory = useCallback(() => {
    modal.confirm({
      title: "确认删除",
      content: `确定要删除分类「${category.name}」吗？该分类下的所有待办事项也将被删除。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: () => onDeleteCategory(category.id),
    });
  }, [category, modal, onDeleteCategory]);

  // 格式化时间
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = dayjs(timestamp);
    const now = dayjs();
    const diff = date.diff(now, "day");

    if (diff < 0) {
      return { text: "已逾期", status: "overdue" };
    } else if (diff === 0) {
      return { text: `今天 ${date.format("HH:mm")}`, status: "today" };
    } else if (diff === 1) {
      return { text: `明天 ${date.format("HH:mm")}`, status: "tomorrow" };
    } else if (diff <= 7) {
      return { text: date.format("dddd HH:mm"), status: "week" };
    } else {
      return { text: date.format("MM月DD日"), status: "later" };
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-bg-secondary/70 p-6 backdrop-blur-sm">
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`size-10 rounded-lg flex items-center justify-center ${colorConfig.bgClass} ${colorConfig.textClass}`}
            >
              <span className="material-symbols-outlined">
                {category.icon || "folder"}
              </span>
            </div>
            <h4 className="text-lg font-bold text-text-primary">
              {category.name}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2 py-1 rounded ${colorConfig.bgClass} ${colorConfig.textClass}`}
            >
              {pendingCount} 个待办
            </span>
            {/* 操作菜单 */}
            <div className="relative group">
              <button className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-colors">
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-32 py-1 rounded-lg bg-bg-secondary border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => {
                    categoryForm.setFieldsValue({
                      name: category.name,
                      description: category.description,
                      color: category.color,
                    });
                    setEditCategoryModalVisible(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                >
                  编辑分类
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="w-full px-3 py-1.5 text-left text-sm text-error hover:bg-error/10 transition-colors"
                >
                  删除分类
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 待办列表 */}
        <div className="space-y-4">
          {todos.map((todo) => {
            const timeInfo = formatTime(todo.dueDate);
            const isCompleted = todo.status === "completed";
            const priorityConfig = PRIORITY_CONFIG[todo.priority];

            return (
              <div key={todo.id} className="flex items-start gap-3 group">
                {/* 复选框 */}
                <button
                  onClick={() => onToggleComplete(todo)}
                  className={`mt-1 size-4 rounded border-2 flex items-center justify-center transition-colors ${
                    isCompleted
                      ? "bg-green-500 border-green-500"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {isCompleted && (
                    <span className="material-symbols-outlined text-white text-xs">
                      check
                    </span>
                  )}
                </button>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium cursor-pointer transition-colors group-hover:text-primary ${
                      isCompleted
                        ? "line-through text-text-tertiary"
                        : "text-text-primary"
                    }`}
                    onClick={() => onEditTodo(todo)}
                  >
                    {todo.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {/* 时间 */}
                    {timeInfo && !isCompleted && (
                      <span
                        className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${
                          timeInfo.status === "overdue"
                            ? "text-error font-semibold"
                            : "text-text-tertiary"
                        }`}
                      >
                        {timeInfo.status === "overdue" && (
                          <span className="material-symbols-outlined text-xs">
                            priority_high
                          </span>
                        )}
                        {timeInfo.status !== "overdue" && (
                          <span className="material-symbols-outlined text-xs">
                            schedule
                          </span>
                        )}
                        {timeInfo.text}
                      </span>
                    )}
                    {/* 优先级 */}
                    {todo.priority !== "low" && !isCompleted && (
                      <span
                        className={`text-[10px] px-1 rounded ${priorityConfig.bgColor} ${priorityConfig.color}`}
                      >
                        {priorityConfig.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditTodo(todo)}
                    className="p-1 rounded text-text-tertiary hover:text-primary hover:bg-bg-tertiary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => onDeleteTodo(todo.id)}
                    className="p-1 rounded text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            );
          })}

          {todos.length === 0 && (
            <div className="py-4 text-center text-text-tertiary text-sm">
              暂无待办事项
            </div>
          )}
        </div>

        {/* 添加按钮 */}
        <button
          onClick={() => {
            todoForm.resetFields();
            setAddModalVisible(true);
          }}
          className="mt-6 text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          添加待办
        </button>
      </div>

      {/* 添加待办弹窗 */}
      <Modal
        title={`添加待办 - ${category.name}`}
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={handleAddTodo}
        okText="添加"
        cancelText="取消"
        width={460}
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
            <TextArea rows={2} placeholder="详细描述（可选）" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="priority" label="优先级" initialValue="medium">
              <Select>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <span className={config.color}>{config.label}</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="dueDate" label="截止时间">
              <DatePicker
                className="w-full"
                showTime
                format="MM-DD HH:mm"
                placeholder="选择时间"
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* 编辑分类弹窗 */}
      <Modal
        title="编辑分类"
        open={editCategoryModalVisible}
        onCancel={() => setEditCategoryModalVisible(false)}
        onOk={handleEditCategory}
        okText="保存"
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
            <Input placeholder="分类描述（可选）" />
          </Form.Item>

          <Form.Item name="color" label="颜色">
            <div className="flex gap-2">
              {["#3B82F6", "#F97316", "#A855F7", "#EF4444", "#10B981", "#EC4899"].map(
                (color) => (
                  <div
                    key={color}
                    className={`size-8 rounded-full cursor-pointer border-2 transition-all ${
                      categoryForm.getFieldValue("color") === color
                        ? "border-white scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => categoryForm.setFieldsValue({ color })}
                  />
                )
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// 获取颜色配置
function getColorConfig(color: string) {
  const colorMap: Record<string, { bgClass: string; textClass: string }> = {
    "#3B82F6": { bgClass: "bg-blue-500/20", textClass: "text-blue-500" },
    "#F97316": { bgClass: "bg-orange-500/20", textClass: "text-orange-500" },
    "#A855F7": { bgClass: "bg-purple-500/20", textClass: "text-purple-500" },
    "#EF4444": { bgClass: "bg-red-500/20", textClass: "text-red-500" },
    "#10B981": { bgClass: "bg-green-500/20", textClass: "text-green-500" },
    "#EC4899": { bgClass: "bg-pink-500/20", textClass: "text-pink-500" },
  };

  return colorMap[color] || colorMap["#3B82F6"];
}

export default TodoCard;
