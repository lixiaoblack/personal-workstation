/**
 * 文件选择节点（Electron 客户端特性）
 */

import React, { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";

export const FileSelectNode = memo<NodeProps>((props) => {
  return (
    <BaseNode
      {...props}
      icon={
        <svg
          className="w-4 h-4 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
        </svg>
      }
      label="文件选择"
      color="#84CC16"
      inputs={0}
      outputs={1}
    />
  );
});

FileSelectNode.displayName = "FileSelectNode";
