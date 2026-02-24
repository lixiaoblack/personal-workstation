/**
 * AIChatStreamingMessage - 流式消息渲染组件
 * 显示正在生成中的 AI 消息
 * 使用 Ant Design X 的 Think 组件显示思考过程
 */
import React, { memo, useMemo } from "react";
import { Bubble, Think } from "@ant-design/x";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useTypewriter } from "@/hooks/useTypewriter";
import type { ModelConfig } from "@/types/electron";
import type { AgentStepItem } from "../../config";
import { filterThinkingSteps, hasToolCalls, hasErrors } from "../../config";
import AIChatAgentSteps from "../AIChatAgentSteps";

interface AIChatStreamingMessageProps {
  content: string;
  currentModel: ModelConfig | null;
  agentSteps: AgentStepItem[];
}

const AIChatStreamingMessage: React.FC<AIChatStreamingMessageProps> = memo(
  ({ content, currentModel, agentSteps }) => {
    // 过滤掉 answer 类型
    const thinkingSteps = useMemo(
      () => filterThinkingSteps(agentSteps),
      [agentSteps]
    );

    // 是否有工具调用
    const hasToolCallsFlag = useMemo(
      () => hasToolCalls(thinkingSteps),
      [thinkingSteps]
    );

    // 是否有错误
    const hasError = useMemo(() => hasErrors(thinkingSteps), [thinkingSteps]);

    // 是否显示思考过程（只有有工具调用时才显示）
    const showThinking = thinkingSteps.length > 0 && hasToolCallsFlag;

    // 是否正在流式传输（有内容或正在思考）
    const isStreaming = !!content || showThinking;

    // 打字机效果 - 快速模式
    const { displayText, isTyping, skip } = useTypewriter(content, {
      charDelay: 5, // 快速打字
      enabled: true,
    });

    return (
      <div className="flex justify-start mb-6">
        <div className="flex gap-3 max-w-[85%]">
          {/* AI 头像 */}
          <div className="size-8 rounded-lg bg-bg-tertiary border border-border flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg text-text-secondary">
              smart_toy
            </span>
          </div>

          {/* 消息内容 */}
          <div className="flex flex-col gap-1">
            {/* 时间戳和状态 */}
            <div className="flex items-center gap-2 text-[11px] font-medium text-text-tertiary">
              <span className="text-primary">
                AI 助手 ({currentModel?.name || "未知模型"})
              </span>
              {showThinking ? (
                <span className="animate-pulse text-warning">
                  {!content ? "思考中..." : "生成中..."}
                </span>
              ) : isStreaming ? (
                <span className="animate-pulse text-primary">生成中...</span>
              ) : null}
              {hasError && <span className="text-error">部分工具调用失败</span>}
              {isTyping && displayText && (
                <button
                  onClick={skip}
                  className="text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  跳过
                </button>
              )}
            </div>

            {/* 思考过程（有工具调用时才显示，使用 Think 组件包裹） */}
            {showThinking && (
              <Think
                loading={!content && thinkingSteps.length > 0}
                title="思考过程"
                defaultExpanded={true}
                blink={thinkingSteps.length > 0 && !content}
                className="mb-2"
              >
                <AIChatAgentSteps
                  steps={thinkingSteps}
                  isStreaming={true}
                  defaultExpanded={true}
                />
              </Think>
            )}

            {/* 流式消息气泡（有内容时才显示） */}
            {displayText && (
              <Bubble
                placement="start"
                variant="filled"
                shape="default"
                streaming={isTyping}
                content={displayText}
                contentRender={(c) => (
                  <MarkdownRenderer content={c as string} />
                )}
                styles={{
                  content: {
                    backgroundColor: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

AIChatStreamingMessage.displayName = "AIChatStreamingMessage";

export default AIChatStreamingMessage;
