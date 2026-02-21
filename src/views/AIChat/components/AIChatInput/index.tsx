/**
 * AIChatInput - 输入区域组件
 * 使用 Ant Design X Sender 组件
 * 包含工具栏、输入框、发送按钮、知识库选择器
 */
import React, { memo, useCallback } from "react";
import { Select, Switch, Tooltip } from "antd";
import { Sender } from "@ant-design/x";
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
  onCancel?: () => void;
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
    onCancel,
    knowledgeList,
    selectedKnowledgeId,
    onKnowledgeChange,
  }) => {
    // 判断是否可以发送
    const canSend =
      inputValue.trim() &&
      connectionState === ConnectionState.CONNECTED &&
      streamState.status !== "streaming" &&
      currentModel;

    // 是否处于加载/流式状态
    const isLoading = streamState.status === "streaming";

    // 是否禁用输入
    const isDisabled =
      connectionState !== ConnectionState.CONNECTED || isLoading;

    // 处理提交
    const handleSubmit = useCallback(() => {
      if (canSend) {
        onSend();
      }
    }, [canSend, onSend]);

    // 处理取消
    const handleCancel = useCallback(() => {
      if (onCancel) {
        onCancel();
      }
    }, [onCancel]);

    // 处理内容变化
    const handleChange = useCallback(
      (value: string) => {
        onInputChange(value);
      },
      [onInputChange]
    );

    // 处理键盘事件（Sender 组件已内置处理 Enter 发送）
    // 如需添加额外的键盘快捷键，可在此处理
    const handleKeyDown = useCallback(() => {
      // 预留给额外的键盘快捷键处理
    }, []);

    // 工具栏头部
    const header = (
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1">
          {/* 添加附件按钮 */}
          <Tooltip title="添加附件">
            <button
              className="p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">
                attach_file
              </span>
            </button>
          </Tooltip>

          {/* 上传图片按钮 */}
          <Tooltip title="上传图片">
            <button
              className="p-2 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">image</span>
            </button>
          </Tooltip>

          <div className="h-4 w-[1px] bg-border mx-1"></div>

          {/* 快捷模板按钮 */}
          <Tooltip title="快捷模板">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-text-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-all text-xs font-medium"
              type="button"
            >
              <span className="material-symbols-outlined text-base">
                temp_preferences_custom
              </span>
              <span>快捷模板</span>
            </button>
          </Tooltip>

          <div className="h-4 w-[1px] bg-border mx-1"></div>

          {/* 知识库选择器 - 仅在 Agent 模式下显示 */}
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

        {/* 快捷键提示 */}
        <div className="text-[10px] text-text-tertiary font-medium">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    );

    // 底部提示
    const footer = (
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <span className="material-symbols-outlined text-base">info</span>
          <span>AI 可能会产生错误，请核实重要信息</span>
        </div>
      </div>
    );

    return (
      <div className="p-6 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <Sender
            value={inputValue}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={isLoading ? handleCancel : undefined}
            onKeyDown={handleKeyDown}
            loading={isLoading}
            disabled={isDisabled}
            placeholder="在这里输入您的问题，例如：'如何使用 Python 处理地理栅格数据？'"
            submitType="enter"
            autoSize={{ minRows: 3, maxRows: 8 }}
            header={header}
            footer={footer}
            className="bg-bg-secondary border border-border rounded-2xl shadow-xl focus-within:border-primary/50 transition-all"
            classNames={{
              input: "text-text-primary placeholder:text-text-tertiary",
            }}
          />
        </div>
      </div>
    );
  }
);

AIChatInput.displayName = "AIChatInput";

export default AIChatInput;
