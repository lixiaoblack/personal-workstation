/**
 * 人工审核节点
 */

import React, { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";

export const HumanReviewNode = memo<NodeProps>((props) => {
  return (
    <BaseNode
      {...props}
      icon={
        <svg
          className="w-4 h-4 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      }
      label="人工审核"
      color="#6366F1"
      inputs={1}
      outputs={2}
    />
  );
});

HumanReviewNode.displayName = "HumanReviewNode";
