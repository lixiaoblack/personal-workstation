/**
 * AIChatHeader - 头部栏组件
 * 包含模型选择、Agent 选择、连接状态显示
 */
import React, { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown, Tag, Tooltip } from "antd";
import type { ModelConfig } from "@/types/electron";
import { ConnectionState } from "@/types/electron";
import { PROVIDER_LABELS, isOllamaModel } from "../../config";
import type { AgentConfig } from "../../../../../electron/preload";

interface AIChatHeaderProps {
  currentModel: ModelConfig | null;
  llmModels: ModelConfig[];
  connectionState: ConnectionState;
  onSelectModel: (model: ModelConfig) => void;
  // Agent 相关
  agentList?: AgentConfig[];
  selectedAgent?: AgentConfig | null;
  onSelectAgent?: (agent: AgentConfig | null) => void;
}

const AIChatHeader: React.FC<AIChatHeaderProps> = memo(
  ({
    currentModel,
    llmModels,
    connectionState,
    onSelectModel,
    agentList = [],
    selectedAgent,
    onSelectAgent,
  }) => {
    const navigate = useNavigate();

    // Agent 选择下拉菜单
    const agentMenuItems = useMemo(() => {
      const items = [
        {
          key: "none",
          label: (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-text-secondary">
                smart_toy
              </span>
              <span>默认助手</span>
            </div>
          ),
          onClick: () => onSelectAgent?.(null),
        },
        ...agentList.map((agent) => ({
          key: agent.id,
          label: (
            <div className="flex items-center gap-2">
              <span className="text-lg">{agent.avatar || "🤖"}</span>
              <span className="font-medium">{agent.name}</span>
              {agent.workflow_id && (
                <Tag
                  color="blue"
                  className="text-[10px] leading-tight px-1.5 py-0 m-0"
                >
                  工作流
                </Tag>
              )}
            </div>
          ),
          onClick: () => onSelectAgent?.(agent),
        })),
      ];
      return items;
    }, [agentList, onSelectAgent]);
    const modelMenuItems = useMemo(() => {
      return llmModels.map((model) => {
        const providerInfo = PROVIDER_LABELS[model.provider] || {
          name: model.provider,
          color: "default",
        };
        const isOllama = isOllamaModel(model);

        return {
          key: String(model.id),
          label: (
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{model.name}</span>
                <Tag
                  color={providerInfo.color}
                  className="text-[10px] leading-tight px-1.5 py-0 m-0"
                >
                  {providerInfo.name}
                </Tag>
                {isOllama && (
                  <Tooltip title={`本地运行: ${model.host}`}>
                    <span className="material-symbols-outlined text-xs text-success">
                      offline_bolt
                    </span>
                  </Tooltip>
                )}
              </div>
              {model.isDefault && (
                <span className="text-xs text-primary">默认</span>
              )}
            </div>
          ),
          onClick: () => onSelectModel(model),
        };
      });
    }, [llmModels, onSelectModel]);

    // 连接状态渲染
    const renderConnectionStatus = () => {
      const statusConfig: Record<
        ConnectionState,
        { color: string; text: string; animate: boolean }
      > = {
        [ConnectionState.CONNECTED]: {
          color: "bg-success",
          text: "已连接",
          animate: false,
        },
        [ConnectionState.CONNECTING]: {
          color: "bg-warning",
          text: "连接中",
          animate: true,
        },
        [ConnectionState.DISCONNECTED]: {
          color: "bg-error",
          text: "已断开",
          animate: false,
        },
        [ConnectionState.RECONNECTING]: {
          color: "bg-warning",
          text: "重连中",
          animate: true,
        },
        [ConnectionState.ERROR]: {
          color: "bg-error",
          text: "连接错误",
          animate: false,
        },
      };
      const config = statusConfig[connectionState];

      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-success/10 rounded-full border border-success/20">
          <span
            className={`flex h-2 w-2 rounded-full ${config.color} ${
              config.animate ? "animate-pulse" : ""
            }`}
          ></span>
          <span className="text-xs text-success font-medium tracking-wide">
            {config.text}
          </span>
        </div>
      );
    };

    return (
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-bg-secondary/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-6">
          {/* Agent 选择器 */}
          {agentList.length > 0 && (
            <Dropdown menu={{ items: agentMenuItems }} trigger={["click"]}>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/30 cursor-pointer hover:border-primary/50 transition-colors">
                <span className="text-lg">{selectedAgent?.avatar || "🤖"}</span>
                <span className="text-sm font-medium text-text-primary">
                  {selectedAgent?.name || "AI 助手"}
                </span>
                {selectedAgent?.workflow_id && (
                  <Tag
                    color="blue"
                    className="text-[10px] leading-tight px-1.5 py-0 m-0"
                  >
                    工作流
                  </Tag>
                )}
                <span className="material-symbols-outlined text-base text-text-tertiary">
                  expand_more
                </span>
              </div>
            </Dropdown>
          )}
          {/* 未选择 Agent 时显示标题 */}
          {agentList.length === 0 && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                smart_toy
              </span>
              <h2 className="text-text-primary font-bold tracking-tight">
                AI 助手
              </h2>
            </div>
          )}
          <div className="h-6 w-[1px] bg-border"></div>
          <div className="flex items-center gap-4">
            {/* 模型选择 */}
            {currentModel && (
              <Dropdown menu={{ items: modelMenuItems }} trigger={["click"]}>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-bg-tertiary rounded-full border border-border cursor-pointer hover:border-primary/50 transition-colors">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-tighter">
                    {currentModel.name}
                  </span>
                  <Tag
                    color={
                      PROVIDER_LABELS[currentModel.provider]?.color || "default"
                    }
                    className="text-[9px] leading-tight px-1 py-0 m-0"
                  >
                    {PROVIDER_LABELS[currentModel.provider]?.name ||
                      currentModel.provider}
                  </Tag>
                  <span className="material-symbols-outlined text-base text-text-tertiary">
                    expand_more
                  </span>
                </div>
              </Dropdown>
            )}
            {/* 其他模型快捷入口 */}
            <div className="flex items-center gap-3 text-xs font-medium text-text-tertiary">
              {llmModels
                .filter((m) => m.id !== currentModel?.id)
                .slice(0, 3)
                .map((model) => {
                  const isOllama = isOllamaModel(model);
                  return (
                    <button
                      key={model.id}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={() => onSelectModel(model)}
                    >
                      <span>{model.name}</span>
                      {isOllama && (
                        <Tooltip title="本地模型">
                          <span className="material-symbols-outlined text-[10px] text-success">
                            offline_bolt
                          </span>
                        </Tooltip>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {renderConnectionStatus()}
          <div className="flex items-center gap-1">
            <Tooltip title="Agent 管理">
              <button
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-all"
                onClick={() => navigate("/agents")}
              >
                <span className="material-symbols-outlined text-xl">
                  smart_toy
                </span>
              </button>
            </Tooltip>
            <Tooltip title="设置">
              <button
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-all"
                onClick={() => navigate("/settings/ai")}
              >
                <span className="material-symbols-outlined text-xl">
                  settings
                </span>
              </button>
            </Tooltip>
          </div>
        </div>
      </header>
    );
  }
);

AIChatHeader.displayName = "AIChatHeader";

export default AIChatHeader;
