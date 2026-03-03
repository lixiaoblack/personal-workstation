/**
 * 知识检索节点
 */

import React, { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";

export const KnowledgeNode = memo<NodeProps>((props) => {
  return (
    <BaseNode
      {...props}
      icon={
        <svg
          className="w-4 h-4 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      }
      label="知识检索"
      color="#F59E0B"
      inputs={1}
      outputs={1}
    />
  );
});

KnowledgeNode.displayName = "KnowledgeNode";
