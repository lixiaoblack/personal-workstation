/**
 * 工作流选择组件
 *
 * 用于智能体绑定工作流
 */

import React, { useEffect, useState } from "react";
import { Card, Empty, Spin, Tag } from "antd";
import type { WorkflowConfig } from "@/types/workflow";

export interface WorkflowSelectorValue {
  workflow_id: string | null;
}

interface WorkflowSelectorProps {
  value: WorkflowSelectorValue;
  onChange: (value: WorkflowSelectorValue) => void;
}

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({
  value,
  onChange,
}) => {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载工作流列表
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const result = await window.electronAPI.workflowList({
          status: "published",
        });
        if (result.success) {
          setWorkflows(result.data);
        }
      } catch (error) {
        console.error("加载工作流列表失败:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
  }, []);

  // 选择工作流
  const handleSelect = (workflow: WorkflowConfig) => {
    if (value.workflow_id === workflow.id) {
      // 取消选择
      onChange({ workflow_id: null });
    } else {
      onChange({ workflow_id: workflow.id });
    }
  };

  // 清除选择
  const handleClear = () => {
    onChange({ workflow_id: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spin />
      </div>
    );
  }

  return (
    <div className="workflow-selector">
      <div className="mb-4">
        <h3 className="text-base font-medium text-text-primary mb-1">
          绑定工作流
        </h3>
        <p className="text-sm text-text-secondary">
          为智能体绑定一个工作流，对话时将按工作流定义执行
        </p>
      </div>

      {/* 已选择的工作流 */}
      {value.workflow_id && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                account_tree
              </span>
              <span className="text-sm font-medium text-text-primary">
                {workflows.find((w) => w.id === value.workflow_id)?.name ||
                  "已选择工作流"}
              </span>
              <Tag color="blue">已绑定</Tag>
            </div>
            <button
              onClick={handleClear}
              className="text-sm text-text-secondary hover:text-error transition-colors"
            >
              解除绑定
            </button>
          </div>
        </div>
      )}

      {/* 工作流列表 */}
      {workflows.length === 0 ? (
        <Empty
          description="暂无已发布的工作流"
          className="py-8"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <a
            href="#/workflow"
            className="text-primary hover:text-primary-hover"
          >
            去创建工作流
          </a>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              hoverable
              className={`cursor-pointer transition-all ${
                value.workflow_id === workflow.id
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleSelect(workflow)}
              styles={{
                body: { padding: "12px" },
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary">
                    account_tree
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text-primary truncate">
                    {workflow.name}
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {workflow.description || "暂无描述"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Tag color="default" className="text-xs">
                      {workflow.nodes?.length || 0} 个节点
                    </Tag>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 提示信息 */}
      <div className="mt-4 p-3 bg-bg-tertiary rounded-lg">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-sm text-text-tertiary">
            info
          </span>
          <div className="text-xs text-text-secondary">
            <p className="mb-1">工作流模式说明：</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>绑定工作流后，对话将按工作流定义的流程执行</li>
              <li>如果需要用户交互（如文件选择），对话过程中会暂停等待</li>
              <li>不绑定工作流则使用普通对话模式</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
