/**
 * 待办浮窗页面
 *
 * 提供快速添加待办的功能
 * 置顶、透明、可拖拽
 */

import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Form, Input, Select, DatePicker, App } from "antd";
import { useTodoCategories, useTodos } from "@/hooks/useTodos";
import { PRIORITY_CONFIG, REPEAT_CONFIG } from "./config";

const { TextArea } = Input;
const { Option } = Select;

const TodoFloat: React.FC = () => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [selectedCategory, setSelectedCategory] = useState<
    number | undefined
  >();

  // 使用 hooks
  const { categories } = useTodoCategories();
  const { createTodo } = useTodos();

  // 从 URL 参数读取预选分类
  useEffect(() => {
    const categoryIdParam = searchParams.get("categoryId");
    if (categoryIdParam) {
      const catId = parseInt(categoryIdParam, 10);
      if (!isNaN(catId)) {
        setSelectedCategory(catId);
      }
    }
  }, [searchParams]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      const result = await createTodo({
        title: values.title,
        description: values.description,
        categoryId: selectedCategory,
        priority: values.priority || "medium",
        dueDate: values.dueDate?.valueOf(),
        reminderTime: values.reminderTime?.valueOf(),
        repeatType: values.repeatType || "none",
      });

      if (result) {
        message.success("添加成功");
        form.resetFields();
        setSelectedCategory(undefined);
        // 添加成功后隐藏窗口
        window.electronAPI?.floatWindowHide?.();
      }
    } catch (error) {
      console.error("添加待办失败:", error);
    }
  }, [form, selectedCategory, createTodo, message]);

  // 关闭窗口
  const handleClose = useCallback(() => {
    window.electronAPI?.floatWindowHide?.();
  }, []);

  // 获取选中分类的颜色（预留用于显示）

  return (
    <div className="h-screen flex flex-col bg-bg-primary/95 backdrop-blur-xl">
      {/* 标题栏 - 可拖拽区域 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">
            add_task
          </span>
          <span className="text-sm font-medium text-text-primary">
            快速添加待办
          </span>
        </div>
        <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        <Form
          form={form}
          layout="vertical"
          className="todo-float-form"
          onFinish={handleSubmit}
        >
          {/* 标题 */}
          <Form.Item
            name="title"
            rules={[{ required: true, message: "请输入标题" }]}
          >
            <Input
              placeholder="输入待办标题..."
              className="!bg-bg-tertiary !border-border"
              autoFocus
              onPressEnter={handleSubmit}
            />
          </Form.Item>

          {/* 描述 */}
          <Form.Item name="description">
            <TextArea
              rows={2}
              placeholder="详细描述（可选）"
              className="!bg-bg-tertiary !border-border"
            />
          </Form.Item>

          {/* 分类选择 */}
          <Form.Item label="分类">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat.id
                      ? "ring-2 ring-white/30"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: `${cat.color}20`,
                    color: cat.color,
                  }}
                >
                  <span className="material-symbols-outlined text-xs mr-1">
                    {cat.icon || "folder"}
                  </span>
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <span className="text-xs text-text-tertiary">暂无分类</span>
              )}
            </div>
          </Form.Item>

          {/* 优先级和时间 */}
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="priority" label="优先级" initialValue="medium">
              <Select className="!bg-bg-tertiary">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <span className={config.color}>{config.label}</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="dueDate" label="截止时间">
              <DatePicker
                className="w-full !bg-bg-tertiary"
                showTime
                format="MM-DD HH:mm"
                placeholder="选择时间"
              />
            </Form.Item>
          </div>

          {/* 提醒和重复 */}
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="reminderTime" label="提醒时间">
              <DatePicker
                className="w-full !bg-bg-tertiary"
                showTime
                format="MM-DD HH:mm"
                placeholder="提前提醒"
              />
            </Form.Item>

            <Form.Item name="repeatType" label="重复" initialValue="none">
              <Select className="!bg-bg-tertiary">
                {Object.entries(REPEAT_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">
                        {config.icon}
                      </span>
                      {config.label}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </div>

      {/* 底部操作栏 */}
      <div className="px-4 py-3 border-t border-border flex gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 py-2 rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-hover transition-colors text-sm"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          添加待办
        </button>
      </div>

      {/* 快捷键提示 */}
      <div className="px-4 pb-2 text-center">
        <span className="text-[10px] text-text-tertiary">
          快捷键: ⌘+Shift+T 唤起/隐藏
        </span>
      </div>
    </div>
  );
};

export default TodoFloat;
