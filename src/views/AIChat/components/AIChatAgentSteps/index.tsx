/**
 * AIChatAgentSteps - Agent 思考过程显示组件
 * 支持展开/收起，显示思考步骤
 */
import React, { memo } from "react";
import { AGENT_STEP_ICONS, AGENT_STEP_LABELS } from "../../config";
import type { AgentStepItem } from "../../config";

interface AIChatAgentStepsProps {
  steps: AgentStepItem[];
  isStreaming?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * 单个步骤渲染
 */
const StepItem: React.FC<{ step: AgentStepItem }> = memo(({ step }) => {
  // 过滤掉 None、空内容或无意义的步骤
  const isValidContent =
    step.content && step.content !== "None" && step.content.trim() !== "";
  const isToolCall = step.type === "tool_call" && step.toolCall;
  const isToolResult = step.type === "tool_result";

  // 如果不是工具调用/结果，且内容无效，则不渲染
  if (!isToolCall && !isToolResult && !isValidContent) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 text-sm">
      {/* 步骤图标 */}
      <span className="shrink-0 text-base">{AGENT_STEP_ICONS[step.type]}</span>

      {/* 步骤内容 */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-xs font-medium text-text-secondary">
          {AGENT_STEP_LABELS[step.type]}
        </span>
        <div className="text-text-primary text-sm whitespace-pre-wrap break-words">
          {isToolCall ? (
            <div className="flex flex-col gap-1">
              <span className="text-primary font-medium">
                {step.toolCall!.name}
              </span>
              <code className="text-xs bg-bg-tertiary px-2 py-1 rounded text-text-secondary">
                {JSON.stringify(step.toolCall!.arguments)}
              </code>
            </div>
          ) : isToolResult ? (
            <code className="text-xs bg-bg-tertiary px-2 py-1 rounded text-text-secondary block max-h-20 overflow-auto">
              {step.content || ""}
            </code>
          ) : (
            step.content
          )}
        </div>
      </div>
    </div>
  );
});

StepItem.displayName = "StepItem";

/**
 * 流式状态的思考过程（始终展开）
 */
const StreamingAgentSteps: React.FC<{ steps: AgentStepItem[] }> = ({
  steps,
}) => (
  <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden mb-2">
    {/* 标题栏 */}
    <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary/50">
      <span className="material-symbols-outlined text-sm text-warning animate-pulse">
        psychology
      </span>
      <span className="text-xs font-medium text-text-secondary">
        思考中 ({steps.length} 步)
      </span>
    </div>

    {/* 步骤列表 */}
    <div className="px-3 pb-3 space-y-2">
      {steps.map((step, index) => (
        <StepItem key={`${step.timestamp}-${index}`} step={step} />
      ))}
    </div>
  </div>
);

/**
 * 完成状态的思考过程（可展开/收起）
 */
const CompletedAgentSteps: React.FC<{
  steps: AgentStepItem[];
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ steps, isExpanded, onToggle }) => {
  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-tertiary/50 hover:bg-bg-tertiary rounded-lg text-xs text-text-tertiary hover:text-text-secondary transition-colors mb-2"
      >
        <span className="material-symbols-outlined text-sm">expand_more</span>
        <span>查看思考过程 ({steps.length} 步)</span>
      </button>
    );
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden mb-2">
      {/* 标题栏 */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-success">
            check_circle
          </span>
          <span className="text-xs font-medium text-text-secondary">
            思考过程 ({steps.length} 步)
          </span>
        </div>
        <span className="material-symbols-outlined text-sm text-text-tertiary">
          expand_less
        </span>
      </button>

      {/* 步骤列表 */}
      <div className="px-3 pb-3 space-y-2">
        {steps.map((step, index) => (
          <StepItem key={`${step.timestamp}-${index}`} step={step} />
        ))}
      </div>
    </div>
  );
};

const AIChatAgentSteps: React.FC<AIChatAgentStepsProps> = memo(
  ({ steps, isStreaming = false, isExpanded = false, onToggleExpand }) => {
    if (steps.length === 0) return null;

    // 流式状态：始终展开显示
    if (isStreaming) {
      return <StreamingAgentSteps steps={steps} />;
    }

    // 完成状态：可展开/收起
    return (
      <CompletedAgentSteps
        steps={steps}
        isExpanded={isExpanded}
        onToggle={onToggleExpand || (() => {})}
      />
    );
  }
);

AIChatAgentSteps.displayName = "AIChatAgentSteps";

export default AIChatAgentSteps;
