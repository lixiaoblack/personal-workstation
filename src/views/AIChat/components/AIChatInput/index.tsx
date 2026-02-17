/**
 * AIChatInput - 输入区域组件
 * 包含工具栏、输入框、发送按钮、知识库选择器
 */
import React, { memo } from "react";
import { Select, Switch, Tooltip } from "antd";
import type { ModelConfig, KnowledgeInfo } from "@/types/electron";
import { ConnectionState } from "@/types/electron";
import type { StreamState } from "../../config";

interface AIChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  currentModel: ModelConfig | null;
  connectionState: ConnectionState;
  streamState: StreamState;
  agentMode: boolean;
  onAgentModeChange: (checked: boolean) => void;
  onSend: () => void;
  // 知识库相关
  knowledgeList: KnowledgeInfo[];
  selectedKnowledgeId: string | null;
  onKnowledgeChange: (knowledgeId: string | null) => void;
}

const AIChatInput: React.FC<AIChatInputProps> = memo(
  ({
    inputValue,
    onInputChange,
    currentModel,
    connectionState,
    streamState,
    agentMode,
    onAgentModeChange,
    onSend,
    knowledgeList,
    selectedKnowledgeId,
    onKnowledgeChange,
  }) => {
    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    // 判断是否可以发送
    const canSend =
      inputValue.trim() &&
      connectionState === ConnectionState.CONNECTED &&
      streamState.status !== "streaming" &&
      currentModel;

    return (
      <div className="p-6 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="bg-bg-secondary border border-border rounded-2xl shadow-xl focus-within:border-primary/50 transition-all p-2">
            {/* 工具栏 */}
            <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border/50">
              <div className="flex items-center gap-1">
                <button
                  className="p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                  title="添加附件"
                >
                  <span className="material-symbols-outlined text-lg">
                    attach_file
                  </span>
                </button>
                <button
                  className="p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                  title="上传图片"
                >
                  <span className="material-symbols-outlined text-lg">
                    image
                  </span>
                </button>
                <div className="h-4 w-[1px] bg-border mx-1"></div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all text-xs font-medium"
                  title="快捷模板"
                >
                  <span className="material-symbols-outlined text-base">
                    temp_preferences_custom
                  </span>
                  <span>快捷模板</span>
                </button>
                <div className="h-4 w-[1px] bg-border mx-1"></div>

                {/* 知识库选择器 */}
                {agentMode && knowledgeList.length > 0 && (
                  <Select
                    value={selectedKnowledgeId}
                    onChange={onKnowledgeChange}
                    placeholder="选择知识库"
                    allowClear
                    size="small"
                    style={{ minWidth: 150 }}
                    options={knowledgeList.map((kb) => ({
                      value: kb.id,
                      label: `${kb.name} (${kb.documentCount}文档)`,
                    }))}
                  />
                )}

                <div className="h-4 w-[1px] bg-border mx-1"></div>

                {/* Agent 模式开关 */}
                <Tooltip
                  title={
                    agentMode
                      ? "Agent 模式：智能体将使用工具完成任务"
                      : "普通模式：直接对话"
                  }
                >
                  <div className="flex items-center gap-2 px-2">
                    <Switch
                      size="small"
                      checked={agentMode}
                      onChange={onAgentModeChange}
                      checkedChildren="🤖"
                      unCheckedChildren="💬"
                    />
                    <span
                      className={`text-xs font-medium ${
                        agentMode ? "text-primary" : "text-text-tertiary"
                      }`}
                    >
                      {agentMode ? "Agent" : "对话"}
                    </span>
                  </div>
                </Tooltip>
              </div>
              <div className="text-[10px] text-text-tertiary font-medium">
                按 Enter 发送，Shift + Enter 换行
              </div>
            </div>

            {/* 输入框和发送按钮 */}
            <div className="flex items-end gap-3 px-2 py-2">
              <textarea
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="在这里输入您的问题，例如：'如何使用 Python 处理地理栅格数据？'"
                className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary text-sm placeholder:text-text-tertiary resize-none custom-scrollbar py-1 outline-none"
                rows={3}
                disabled={
                  connectionState !== ConnectionState.CONNECTED ||
                  streamState.status === "streaming"
                }
              />
              <button
                className={`p-3 rounded-xl flex items-center justify-center transition-all shadow-lg shrink-0 ${
                  canSend
                    ? "bg-primary hover:bg-primary-hover text-white shadow-primary/20"
                    : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
                }`}
                onClick={onSend}
                disabled={!canSend}
              >
                <span className="material-symbols-outlined text-2xl">send</span>
              </button>
            </div>
          </div>

          {/* 底部提示 */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
              <span className="material-symbols-outlined text-base">info</span>
              <span>AI 可能会产生错误，请核实重要信息</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AIChatInput.displayName = "AIChatInput";

export default AIChatInput;
