/**
 * 用户输入节点
 */

import React, { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";

export const UserInputNode = memo<NodeProps>((props) => {
  return (
    <BaseNode
      {...props}
      icon={
        <svg
          className="w-4 h-4 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
        </svg>
      }
      label="用户输入"
      color="#F97316"
      inputs={1}
      outputs={1}
    />
  );
});

UserInputNode.displayName = "UserInputNode";
