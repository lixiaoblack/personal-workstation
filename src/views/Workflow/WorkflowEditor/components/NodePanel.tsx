/**
 * 节点面板组件
 *
 * 左侧节点列表，支持拖拽添加节点到画布
 */

import React from "react";

// 节点类型定义
interface NodeTypeConfig {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

// 节点类型列表
const nodeTypes: NodeTypeConfig[] = [
  // 基础节点
  {
    type: "start",
    label: "开始",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    ),
    color: "#10B981",
    category: "基础",
  },
  {
    type: "end",
    label: "结束",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z" />
      </svg>
    ),
    color: "#EF4444",
    category: "基础",
  },
  // AI 节点
  {
    type: "llm",
    label: "LLM 调用",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
    color: "#3B82F6",
    category: "AI",
  },
  {
    type: "tool",
    label: "工具调用",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
      </svg>
    ),
    color: "#8B5CF6",
    category: "AI",
  },
  {
    type: "knowledge",
    label: "知识检索",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.41 3.59-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.41-3.59 8-8 8z" />
      </svg>
    ),
    color: "#F59E0B",
    category: "AI",
  },
  // 流程控制
  {
    type: "condition",
    label: "条件分支",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
      </svg>
    ),
    color: "#EC4899",
    category: "流程控制",
  },
  {
    type: "loop",
    label: "循环",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
      </svg>
    ),
    color: "#06B6D4",
    category: "流程控制",
  },
  // 交互节点
  {
    type: "file_select",
    label: "文件选择",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z" />
      </svg>
    ),
    color: "#84CC16",
    category: "交互",
  },
  {
    type: "user_input",
    label: "用户输入",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
      </svg>
    ),
    color: "#F97316",
    category: "交互",
  },
  {
    type: "human_review",
    label: "人工审核",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
    color: "#6366F1",
    category: "交互",
  },
  {
    type: "message",
    label: "消息输出",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
    ),
    color: "#14B8A6",
    category: "交互",
  },
  {
    type: "webhook",
    label: "Webhook",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
    color: "#A855F7",
    category: "触发器",
  },
];

// 按分类分组
const groupedNodes = nodeTypes.reduce(
  (acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  },
  {} as Record<string, NodeTypeConfig[]>
);

interface NodePanelProps {
  onAddNode: (type: string) => void;
}

export const NodePanel: React.FC<NodePanelProps> = ({ onAddNode }) => {
  return (
    <div className="w-60 bg-bg-secondary border-r border-border flex flex-col">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">节点面板</h3>
        <p className="text-xs text-text-tertiary mt-1">点击添加节点到画布</p>
      </div>

      {/* 节点列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groupedNodes).map(([category, nodes]) => (
          <div key={category} className="mb-4">
            <div className="px-2 py-1 text-xs font-medium text-text-tertiary uppercase tracking-wider">
              {category}
            </div>
            <div className="space-y-1">
              {nodes.map((node) => (
                <button
                  key={node.type}
                  onClick={() => onAddNode(node.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-tertiary transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: node.color }}
                  >
                    <span className="text-white">{node.icon}</span>
                  </div>
                  <span className="text-sm text-text-primary">
                    {node.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
