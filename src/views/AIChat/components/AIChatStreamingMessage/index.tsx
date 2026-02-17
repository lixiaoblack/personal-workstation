/**
 * AIChatStreamingMessage - 流式消息渲染组件
 * 显示正在生成中的 AI 消息
 */
import React, { memo } from "react";
import { Bubble } from "@ant-design/x";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { ModelConfig } from "@/types/electron";
import type { AgentStepItem } from "../../config";
import AIChatAgentSteps from "../AIChatAgentSteps";

interface AIChatStreamingMessageProps {
  content: string;
  currentModel: ModelConfig | null;
  agentSteps: AgentStepItem[];
}

const AIChatStreamingMessage: React.FC<AIChatStreamingMessageProps> = memo(
  ({ content, currentModel, agentSteps }) => {
    // 获取当前思考步骤（过滤掉 answer）
    const thinkingSteps = agentSteps.filter((step) => step.type !== "answer");

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
            {/* 时间戳 */}
            <div className="flex items-center gap-2 text-[11px] font-medium text-text-tertiary">
              <span className="text-primary">
                AI 助手 ({currentModel?.name || "未知模型"})
              </span>
              <span className="animate-pulse text-warning">思考中...</span>
            </div>

            {/* 思考过程（流式阶段始终展开显示） */}
            {thinkingSteps.length > 0 && (
              <AIChatAgentSteps steps={thinkingSteps} isStreaming={true} />
            )}

            {/* 流式消息气泡（有内容时才显示） */}
            {content && (
              <Bubble
                placement="start"
                variant="filled"
                shape="default"
                streaming
                content={content}
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
