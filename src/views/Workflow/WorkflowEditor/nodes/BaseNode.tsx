/**
 * n8n 风格工作流节点基础组件
 */

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

/**
 * 基础节点属性
 */
export interface BaseNodeProps extends NodeProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  inputs?: number;
  outputs?: number;
}

/**
 * 基础节点组件
 */
export const BaseNode: React.FC<BaseNodeProps> = memo(
  ({ icon, label, color, inputs = 1, outputs = 1, selected }) => {
    return (
      <div
        className={`
          workflow-node
          min-w-[180px]
          bg-bg-secondary
          border
          rounded-lg
          shadow-md
          transition-all
          ${selected ? "border-primary ring-2 ring-primary/30" : "border-border"}
        `}
      >
        {/* 输入连接点 */}
        {inputs > 0 && (
          <Handle
            type="target"
            position={Position.Left}
            className="!w-3 !h-3 !bg-text-tertiary !border-2 !border-bg-primary"
          />
        )}

        {/* 节点头部 */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            {icon}
          </div>
          <span className="text-sm font-medium text-text-primary">{label}</span>
        </div>

        {/* 节点内容 */}
        <div className="px-3 py-2 text-xs text-text-secondary">
          点击配置参数
        </div>

        {/* 输出连接点 */}
        {outputs > 0 && (
          <Handle
            type="source"
            position={Position.Right}
            className="!w-3 !h-3 !bg-text-tertiary !border-2 !border-bg-primary"
          />
        )}
      </div>
    );
  }
);

BaseNode.displayName = "BaseNode";
