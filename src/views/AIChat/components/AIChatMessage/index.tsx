/**
 * AIChatMessage - 消息渲染组件
 * 显示单条消息，支持用户消息和 AI 消息
 * 使用 Ant Design X 的 Think 组件显示思考过程
 */
import React, { memo, useMemo, useState, useEffect } from "react";
import { Bubble, Think } from "@ant-design/x";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useTypewriter } from "@/hooks/useTypewriter";
import {
  formatTime,
  filterThinkingSteps,
  hasToolCalls,
  hasErrors,
} from "../../config";
import type { AgentStepItem } from "../../config";
import AIChatAgentSteps from "../AIChatAgentSteps";
import KnowledgeDocumentListCard, {
  type DocumentItem,
} from "../KnowledgeDocumentListCard";
import type { Message, ModelConfig } from "@/types/electron";

// 附件文件类型
interface AttachmentFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  type: "image" | "document" | "code" | "other";
}

interface AIChatMessageProps {
  message: Message;
  currentModel: ModelConfig | null;
}

// 从工具结果中提取文档列表
function extractDocumentsFromSteps(
  steps: AgentStepItem[]
): { knowledgeId: string; documents: unknown[] } | null {
  // 方式1：查找 tool_result 类型的步骤（工具名称在 toolCall.name 中）
  for (const step of steps) {
    if (
      step.type === "tool_result" &&
      step.toolCall?.name === "knowledge_list_documents" &&
      step.content
    ) {
      try {
        const result = JSON.parse(step.content);
        if (result.knowledge_id && Array.isArray(result.documents)) {
          return {
            knowledgeId: result.knowledge_id,
            documents: result.documents,
          };
        }
      } catch {
        // 解析失败，继续尝试其他方式
      }
    }
  }

  // 方式2：查找 tool_call 类型的步骤，然后找下一个 tool_result
  for (const step of steps) {
    if (
      step.type === "tool_call" &&
      step.toolCall?.name === "knowledge_list_documents"
    ) {
      // 找到对应的工具结果（下一个步骤）
      const stepIndex = steps.indexOf(step);
      const resultStep = steps[stepIndex + 1];
      if (resultStep?.type === "tool_result" && resultStep.content) {
        try {
          // 尝试解析 JSON
          const result = JSON.parse(resultStep.content);
          if (result.knowledge_id && Array.isArray(result.documents)) {
            return {
              knowledgeId: result.knowledge_id,
              documents: result.documents,
            };
          }
        } catch {
          // 解析失败，返回 null
          return null;
        }
      }
    }
  }
  return null;
}

// 格式化文件大小
function formatFileSize(size: number): string {
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

// 获取文件图标
function getFileIcon(type: string): string {
  switch (type) {
    case "image":
      return "image";
    case "document":
      return "description";
    case "code":
      return "code";
    default:
      return "insert_drive_file";
  }
}

const AIChatMessage: React.FC<AIChatMessageProps> = memo(
  ({ message, currentModel }) => {
    const isUser = message.role === "user";

    // 过滤掉 answer 类型
    const thinkingSteps = useMemo(() => {
      const agentStepsInMessage =
        (message.metadata?.agentSteps as AgentStepItem[]) || [];
      return filterThinkingSteps(agentStepsInMessage);
    }, [message.metadata?.agentSteps]);

    // 是否有工具调用
    const hasToolCallsFlag = useMemo(
      () => hasToolCalls(thinkingSteps),
      [thinkingSteps]
    );

    // 是否有错误
    const hasError = useMemo(() => hasErrors(thinkingSteps), [thinkingSteps]);

    // 是否显示思考过程（只有有工具调用时才显示）
    const showThinking = thinkingSteps.length > 0 && hasToolCallsFlag;

    // 提取文档列表（如果有 knowledge_list_documents 工具调用）
    const documentsData = useMemo(() => {
      if (isUser) return null;
      const agentStepsInMessage =
        (message.metadata?.agentSteps as AgentStepItem[]) || [];
      return extractDocumentsFromSteps(agentStepsInMessage);
    }, [isUser, message.metadata?.agentSteps]);

    // 提取用户消息的附件列表
    const attachments = useMemo(() => {
      if (!isUser) return [];
      return (message.metadata?.attachments as AttachmentFile[]) || [];
    }, [isUser, message.metadata?.attachments]);

    // 打字机效果 - 快速模式（只对 AI 消息生效）
    // 对于新消息（2秒内创建的）跳过打字机效果，因为流式输出已经显示过了
    const [enableTypewriter, setEnableTypewriter] = useState(() => {
      if (isUser) return false;
      // 如果消息是 2 秒内创建的，认为是刚从流式结束加载的，跳过打字机
      const messageAge = Date.now() - (message.timestamp || 0);
      return messageAge > 2000;
    });

    const { displayText, isTyping, skip } = useTypewriter(
      isUser ? "" : message.content,
      {
        charDelay: 5, // 快速打字
        enabled: enableTypewriter,
      }
    );

    // 打字完成后禁用打字机（避免重复动画）
    useEffect(() => {
      if (!isTyping && displayText === message.content) {
        setEnableTypewriter(false);
      }
    }, [isTyping, displayText, message.content]);

    // 用户消息直接显示，AI 消息使用打字机效果
    const contentToDisplay = isUser ? message.content : displayText;

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
                  {showThinking && (
                    <span className="text-success">思考完成</span>
                  )}
                  {hasError && <span className="text-error">部分失败</span>}
                  {isTyping && contentToDisplay && (
                    <button
                      onClick={skip}
                      className="text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      跳过
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Agent 思考过程（有工具调用时才显示，使用 Think 组件包裹）
                完成的消息默认折叠思考过程，只显示最终结果 */}
            {!isUser && showThinking && (
              <Think title="思考过程" defaultExpanded={false} className="mb-2">
                <AIChatAgentSteps
                  steps={thinkingSteps}
                  isStreaming={false}
                  defaultExpanded={false}
                />
              </Think>
            )}

            {/* 消息气泡 */}
            <Bubble
              placement={isUser ? "end" : "start"}
              variant="filled"
              shape="default"
              streaming={isTyping}
              content={contentToDisplay}
              contentRender={(content) => {
                if (isUser) {
                  return (
                    <div className="flex flex-col gap-2">
                      {/* 附件卡片在气泡内部 */}
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center gap-2 px-2 py-1.5 bg-white/20 rounded border border-white/30"
                            >
                              {/* 文件图标 */}
                              <span className="material-symbols-outlined text-sm text-white">
                                {getFileIcon(file.type)}
                              </span>
                              {/* 文件信息 */}
                              <div className="flex flex-col">
                                <span className="text-[11px] text-white max-w-[120px] truncate font-medium">
                                  {file.name}
                                </span>
                                <span className="text-[9px] text-white/70">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* 消息文本 */}
                      <span className="whitespace-pre-wrap">{content}</span>
                    </div>
                  );
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

            {/* 文档列表卡片（如果有 knowledge_list_documents 工具调用） */}
            {!isUser && documentsData && documentsData.documents.length > 0 && (
              <div className="mt-2">
                <KnowledgeDocumentListCard
                  knowledgeId={documentsData.knowledgeId}
                  documents={documentsData.documents as DocumentItem[]}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

AIChatMessage.displayName = "AIChatMessage";

export default AIChatMessage;
