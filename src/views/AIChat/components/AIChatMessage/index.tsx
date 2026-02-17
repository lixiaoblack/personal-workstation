/**
 * AIChatMessage - 消息渲染组件
 * 显示单条消息，支持用户消息和 AI 消息
 */
import React, { memo } from "react";
import { Bubble } from "@ant-design/x";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { formatTime } from "../../config";
import type { AgentStepItem } from "../../config";
import AIChatAgentSteps from "../AIChatAgentSteps";
import type { Message, ModelConfig } from "@/types/electron";

interface AIChatMessageProps {
  message: Message;
  currentModel: ModelConfig | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const AIChatMessage: React.FC<AIChatMessageProps> = memo(
  ({ message, currentModel, isExpanded, onToggleExpand }) => {
    const isUser = message.role === "user";

    // 检查消息是否包含 Agent 思考步骤
    const agentStepsInMessage =
      (message.metadata?.agentSteps as AgentStepItem[]) || [];
    const hasAgentSteps = agentStepsInMessage.length > 0;

    // 过滤掉 answer 类型（答案已显示在消息内容中）
    const thinkingSteps = agentStepsInMessage.filter(
      (step) => step.type !== "answer"
    );

    return (
      <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}>
        <div
          className={`flex gap-3 max-w-[85%] ${
            isUser ? "flex-row-reverse" : ""
          }`}
        >
          {/* 头像 */}
          <div
            className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
              isUser
                ? "bg-primary/10 border border-primary/20"
                : "bg-bg-tertiary border border-border"
            }`}
          >
            <span
              className={`material-symbols-outlined text-lg ${
                isUser ? "text-primary" : "text-text-secondary"
              }`}
            >
              {isUser ? "person" : "smart_toy"}
            </span>
          </div>

          {/* 消息内容 */}
          <div className="flex flex-col gap-1">
            {/* 时间戳 */}
            <div
              className={`flex items-center gap-2 text-[11px] font-medium text-text-tertiary ${
                isUser ? "justify-end" : ""
              }`}
            >
              {isUser ? (
                <>
                  <span>{formatTime(message.timestamp)}</span>
                  <span>我</span>
                </>
              ) : (
                <>
                  <span className="text-primary">
                    AI 助手 ({currentModel?.name || "未知模型"})
                  </span>
                  <span>{formatTime(message.timestamp)}</span>
                  {hasAgentSteps && (
                    <span className="text-success">思考完成</span>
                  )}
                </>
              )}
            </div>

            {/* Agent 思考过程（可展开/收起） */}
            {!isUser && thinkingSteps.length > 0 && (
              <AIChatAgentSteps
                steps={thinkingSteps}
                isStreaming={false}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
              />
            )}

            {/* 消息气泡 */}
            <Bubble
              placement={isUser ? "end" : "start"}
              variant="filled"
              shape="default"
              content={message.content}
              contentRender={(content) => {
                if (isUser) {
                  return <span className="whitespace-pre-wrap">{content}</span>;
                }
                return <MarkdownRenderer content={content as string} />;
              }}
              styles={{
                content: isUser
                  ? { backgroundColor: "var(--color-primary)", color: "#fff" }
                  : {
                      backgroundColor: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                    },
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);

AIChatMessage.displayName = "AIChatMessage";

export default AIChatMessage;
