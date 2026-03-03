/**
 * Webhook 节点
 */

import React, { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";

export const WebhookNode = memo<NodeProps>((props) => {
  return (
    <BaseNode
      {...props}
      icon={
        <svg
          className="w-4 h-4 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm10-1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-3.31 0-6 2.69-6 6h2c0-2.21 1.79-4 4-4s4 1.79 4 4h2c0-3.31-2.69-6-6-6z" />
        </svg>
      }
      label="Webhook"
      color="#A855F7"
      inputs={0}
      outputs={1}
    />
  );
});

WebhookNode.displayName = "WebhookNode";
