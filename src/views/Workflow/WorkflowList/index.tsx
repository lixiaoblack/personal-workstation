/**
 * 工作流列表页面
 *
 * 显示所有工作流，支持创建、编辑、删除、发布操作
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Empty, Spin, Tag, Dropdown, Modal, Input, message } from "antd";
import type { MenuProps } from "antd";
import type { WorkflowConfig } from "@/types/workflow";

/**
 * 工作流列表组件
 */
const WorkflowList: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // 加载工作流列表
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.workflowList();
      if (result.success) {
        setWorkflows(result.data);
      } else {
        message.error("加载工作流列表失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("加载工作流列表失败: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  // 创建新工作流
  const handleCreate = async () => {
    if (!newWorkflowName.trim()) {
      message.warning("请输入工作流名称");
      return;
    }

    setCreating(true);
    try {
      const result = await window.electronAPI.workflowCreate({
        name: newWorkflowName.trim(),
        description: newWorkflowDescription,
        nodes: [
          {
            id: "start-1",
            type: "start",
            position: { x: 100, y: 200 },
            data: { label: "开始" },
          },
        ],
        edges: [],
        variables: {},
      });

      if (result.success && result.data) {
        message.success("工作流创建成功");
        setIsCreateModalOpen(false);
        setNewWorkflowName("");
        setNewWorkflowDescription("");
        // 跳转到编辑页面
        navigate(`/workflow/edit?id=${result.data.id}`);
      } else {
        message.error("创建失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("创建失败: " + String(error));
    } finally {
      setCreating(false);
    }
  };

  // 编辑工作流
  const handleEdit = (workflow: WorkflowConfig) => {
    navigate(`/workflow/edit?id=${workflow.id}`);
  };

  // 删除工作流
  const handleDelete = async (workflow: WorkflowConfig) => {
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除工作流 "${workflow.name}" 吗？此操作不可恢复。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          const result = await window.electronAPI.workflowDelete(workflow.id);
          if (result.success) {
            message.success("工作流已删除");
            loadWorkflows();
          } else {
            message.error("删除失败: " + (result.error || "未知错误"));
          }
        } catch (error) {
          message.error("删除失败: " + String(error));
        }
      },
    });
  };

  // 复制工作流
  const handleDuplicate = async (workflow: WorkflowConfig) => {
    try {
      const result = await window.electronAPI.workflowDuplicate(workflow.id);
      if (result.success) {
        message.success("工作流已复制");
        loadWorkflows();
      } else {
        message.error("复制失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("复制失败: " + String(error));
    }
  };

  // 发布工作流
  const handlePublish = async (workflow: WorkflowConfig) => {
    try {
      const result = await window.electronAPI.workflowPublish(workflow.id);
      if (result.success) {
        message.success("工作流已发布");
        loadWorkflows();
      } else {
        message.error("发布失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      message.error("发布失败: " + String(error));
    }
  };

  // 获取操作菜单
  const getActionMenu = (workflow: WorkflowConfig): MenuProps["items"] => {
    const items: MenuProps["items"] = [
      {
        key: "edit",
        label: "编辑",
        onClick: () => handleEdit(workflow),
      },
      {
        key: "duplicate",
        label: "复制",
        onClick: () => handleDuplicate(workflow),
      },
    ];

    if (workflow.status === "draft") {
      items.push({
        key: "publish",
        label: "发布",
        onClick: () => handlePublish(workflow),
      });
    }

    items.push({ type: "divider" });
    items.push({
      key: "delete",
      label: <span className="text-error">删除</span>,
      onClick: () => handleDelete(workflow),
    });

    return items;
  };

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "green";
      case "draft":
        return "blue";
      default:
        return "default";
    }
  };

  // 状态标签文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "published":
        return "已发布";
      case "draft":
        return "草稿";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="workflow-list h-full p-6 overflow-auto">
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">工作流管理</h1>
          <p className="text-sm text-text-secondary mt-1">
            创建和管理自动化工作流
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          新建工作流
        </button>
      </div>

      {/* 工作流列表 */}
      {workflows.length === 0 ? (
        <Empty
          description="暂无工作流"
          className="py-16"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="text-primary hover:text-primary-hover"
          >
            创建第一个工作流
          </button>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              hoverable
              className="cursor-pointer border-border hover:border-primary/50 transition-all"
              onClick={() => handleEdit(workflow)}
              styles={{ body: { padding: "16px" } }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-medium text-text-primary truncate">
                      {workflow.name}
                    </h3>
                    <Tag color={getStatusColor(workflow.status)}>
                      {getStatusText(workflow.status)}
                    </Tag>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                    {workflow.description || "暂无描述"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        account_tree
                      </span>
                      {workflow.nodes?.length || 0} 个节点
                    </span>
                    <span>
                      更新于{" "}
                      {new Date(workflow.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Dropdown
                  menu={{ items: getActionMenu(workflow) }}
                  trigger={["click"]}
                >
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 hover:bg-bg-tertiary rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-text-secondary">
                      more_vert
                    </span>
                  </button>
                </Dropdown>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 创建工作流对话框 */}
      <Modal
        title="创建新工作流"
        open={isCreateModalOpen}
        onOk={handleCreate}
        onCancel={() => setIsCreateModalOpen(false)}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
      >
        <div className="py-4">
          <label className="block text-sm text-text-secondary mb-2">
            工作流名称
          </label>
          <Input
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            placeholder="请输入工作流名称"
            onPressEnter={handleCreate}
          />
        </div>
        <div className="pb-4">
          <label className="block text-sm text-text-secondary mb-2">
            描述（可选）
          </label>
          <Input.TextArea
            value={newWorkflowDescription}
            onChange={(e) => setNewWorkflowDescription(e.target.value)}
            placeholder="请输入工作流描述"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};

export default WorkflowList;
