/**
 * AIChatAgentSteps - Agent 思考过程显示组件
 * 使用 Ant Design X 的 ThoughtChain 组件
 * 支持展开/收起，显示思考步骤
 */
import React, { memo, useMemo } from "react";
import { ThoughtChain } from "@ant-design/x";
import {
  convertToThoughtChainItems,
  filterThinkingSteps,
  hasErrors,
} from "../../config";
import type { AgentStepItem } from "../../config";

interface AIChatAgentStepsProps {
  steps: AgentStepItem[];
  isStreaming?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const AIChatAgentSteps: React.FC<AIChatAgentStepsProps> = memo(
  ({ steps, isStreaming = false, isExpanded = false }) => {
    // 过滤掉 answer 类型
    const thinkingSteps = useMemo(() => filterThinkingSteps(steps), [steps]);

    // 转换为 ThoughtChain 格式
    const thoughtChainItems = useMemo(
      () => convertToThoughtChainItems(thinkingSteps),
      [thinkingSteps]
    );

    // 检查是否有错误
    const hasError = useMemo(() => hasErrors(thinkingSteps), [thinkingSteps]);

    // 流式状态：最后一个节点显示 loading
    const itemsWithStatus = useMemo(() => {
      if (!isStreaming) return thoughtChainItems;

      return thoughtChainItems.map((item, index) => {
        // 最后一个节点显示 loading 状态
        if (index === thoughtChainItems.length - 1) {
          return { ...item, status: "loading" as const, blink: true };
        }
        return item;
      });
    }, [thoughtChainItems, isStreaming]);

    // 如果没有思考步骤，不渲染
    if (thinkingSteps.length === 0) return null;

    // 流式状态：始终展开
    if (isStreaming) {
      return (
        <div className="mb-2 bg-bg-secondary rounded-lg border border-border p-3">
          <ThoughtChain
            items={itemsWithStatus}
            defaultExpandedKeys={
              thoughtChainItems
                .map((item) => item.key)
                .filter(Boolean) as string[]
            }
            line="dashed"
          />
        </div>
      );
    }

    // 完成状态：默认折叠，可展开
    return (
      <div
        className={`mb-2 bg-bg-secondary rounded-lg p-3 ${
          hasError ? "border border-error" : "border border-border"
        }`}
      >
        <ThoughtChain
          items={thoughtChainItems}
          defaultExpandedKeys={
            isExpanded
              ? (thoughtChainItems
                  .map((item) => item.key)
                  .filter(Boolean) as string[])
              : []
          }
          line="dashed"
        />
      </div>
    );
  }
);

AIChatAgentSteps.displayName = "AIChatAgentSteps";

export default AIChatAgentSteps;
