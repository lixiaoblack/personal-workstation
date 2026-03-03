/**
 * AgentCard 智能体卡片组件
 *
 * 用于在智能体列表中展示单个智能体信息
 * 支持点击进入对话、编辑、删除、复制等操作
 */
import React, { useState } from "react";
import { Dropdown, Modal } from "antd";
import type { MenuProps } from "antd";
import type { AgentConfig } from "@/types/agent";
import { AGENT_AVATARS } from "@/types/agent";

interface AgentCardProps {
  /** 智能体配置 */
  agent: AgentConfig;
  /** 点击卡片回调（进入对话） */
  onClick?: (agent: AgentConfig) => void;
  /** 编辑回调 */
  onEdit?: (agent: AgentConfig) => void;
  /** 删除回调 */
  onDelete?: (agent: AgentConfig) => void;
  /** 复制回调 */
  onDuplicate?: (agent: AgentConfig) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // 获取头像显示
  const getAvatarDisplay = () => {
    if (
      agent.avatar &&
      AGENT_AVATARS.includes(agent.avatar as (typeof AGENT_AVATARS)[number])
    ) {
      return agent.avatar;
    }
    return "🤖";
  };

  // 下拉菜单项
  const menuItems: MenuProps["items"] = [
    {
      key: "edit",
      label: "编辑",
      icon: <span className="material-symbols-outlined text-sm">edit</span>,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onEdit?.(agent);
      },
    },
    {
      key: "duplicate",
      label: "复制",
      icon: (
        <span className="material-symbols-outlined text-sm">content_copy</span>
      ),
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onDuplicate?.(agent);
      },
    },
    { type: "divider" },
    {
      key: "delete",
      label: "删除",
      icon: <span className="material-symbols-outlined text-sm">delete</span>,
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        setDeleteModalVisible(true);
      },
    },
  ];

  // 确认删除
  const handleConfirmDelete = () => {
    setDeleteModalVisible(false);
    onDelete?.(agent);
  };

  // 格式化更新时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "今天";
    } else if (days === 1) {
      return "昨天";
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString("zh-CN");
    }
  };

  return (
    <>
      <div
        className="agent-card group relative bg-bg-secondary rounded-xl border border-border p-4 cursor-pointer transition-all hover:border-primary/50 hover:-translate-y-1"
        onClick={() => onClick?.(agent)}
      >
        {/* 头像 */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
            {getAvatarDisplay()}
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-text-primary truncate">
                {agent.name}
              </h4>
              {agent.status === "draft" && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">
                  草稿
                </span>
              )}
            </div>
            <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
              {agent.description || "暂无描述"}
            </p>
          </div>

          {/* 操作菜单 */}
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-bg-tertiary"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined text-text-secondary">
                more_vert
              </span>
            </button>
          </Dropdown>
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            {agent.model_name && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  smart_toy
                </span>
                {agent.model_name}
              </span>
            )}
          </div>
          <span className="text-xs text-text-tertiary">
            {formatTime(agent.updated_at)}
          </span>
        </div>

        {/* 工具标签 */}
        {agent.tools && agent.tools.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {agent.tools.slice(0, 3).map((tool) => (
              <span
                key={tool}
                className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary"
              >
                {tool}
              </span>
            ))}
            {agent.tools.length > 3 && (
              <span className="text-xs text-text-tertiary">
                +{agent.tools.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 悬停提示 */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-primary text-sm">
            arrow_outward
          </span>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleConfirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>
          确定要删除智能体 <strong>{agent.name}</strong> 吗？
        </p>
        <p className="text-text-tertiary text-sm mt-2">此操作不可恢复。</p>
      </Modal>
    </>
  );
};

export { AgentCard };
export type { AgentCardProps };
