/**
 * 结束节点
 */

import React, { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";

export const EndNode = memo<NodeProps>((props) => {
  return (
    <BaseNode
      {...props}
      icon={
        <svg
          className="w-4 h-4 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      }
      label="结束"
      color="#EF4444"
      inputs={1}
      outputs={0}
    />
  );
});

EndNode.displayName = "EndNode";
