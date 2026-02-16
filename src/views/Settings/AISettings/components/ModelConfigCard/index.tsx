/**
 * ModelConfigCard 模型配置卡片组件
 * 显示单个模型配置的信息和操作
 */
import React, { useState } from "react";
import { App, Switch, Tag, Dropdown, Modal, Spin } from "antd";
import type { MenuProps } from "antd";
import type { ModelConfigListItem, ModelProvider } from "@/types/electron";

interface ModelConfigCardProps {
  config: ModelConfigListItem;
  onEdit: (config: ModelConfigListItem) => void;
  onDelete: (id: number) => void;
  onToggleEnabled: (id: number, enabled: boolean) => void;
  onSetDefault: (id: number) => void;
  onTest: (config: ModelConfigListItem) => void;
  testing?: boolean;
}

const providerIcons: Record<ModelProvider, { icon: string; color: string }> = {
  openai: { icon: "api", color: "emerald" },
  bailian: { icon: "filter_drama", color: "orange" },
  zhipu: { icon: "psychology", color: "blue" },
  ollama: { icon: "dns", color: "purple" },
  custom: { icon: "settings", color: "gray" },
};

const providerNames: Record<ModelProvider, string> = {
  openai: "OpenAI",
  bailian: "百炼",
  zhipu: "智谱",
  ollama: "Ollama",
  custom: "自定义",
};

const ModelConfigCard: React.FC<ModelConfigCardProps> = ({
  config,
  onEdit,
  onDelete,
  onToggleEnabled,
  onSetDefault,
  onTest,
  testing,
}) => {
  const { message } = App.useApp();
  const [enabledLoading, setEnabledLoading] = useState(false);

  const providerInfo = providerIcons[config.provider] || providerIcons.custom;

  const getIconColorClass = (color: string) => {
    const colors: Record<string, string> = {
      emerald: "bg-emerald-500/10 text-emerald-500",
      orange: "bg-orange-500/10 text-orange-500",
      blue: "bg-blue-500/10 text-blue-500",
      purple: "bg-purple-500/10 text-purple-500",
      gray: "bg-gray-500/10 text-gray-500",
    };
    return colors[color] || colors.gray;
  };

  const getStatusTag = () => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      active: { color: "success", text: "正常" },
      inactive: { color: "default", text: "未激活" },
      error: { color: "error", text: "错误" },
    };
    const status = statusConfig[config.status] || statusConfig.inactive;
    return (
      <Tag color={status.color} className="text-xs">
        {status.text}
      </Tag>
    );
  };

  const handleToggleEnabled = async (checked: boolean) => {
    setEnabledLoading(true);
    try {
      await onToggleEnabled(config.id, checked);
      message.success(checked ? "已启用" : "已禁用");
    } catch (error) {
      message.error("操作失败");
    } finally {
      setEnabledLoading(false);
    }
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "edit",
      label: "编辑配置",
      icon: <span className="material-symbols-outlined text-sm">edit</span>,
      onClick: () => onEdit(config),
    },
    {
      key: "test",
      label: "测试连接",
      icon: <span className="material-symbols-outlined text-sm">nest_remote_comfort_sensor</span>,
      onClick: () => onTest(config),
    },
    {
      key: "default",
      label: config.isDefault ? "已是默认" : "设为默认",
      icon: <span className="material-symbols-outlined text-sm">star</span>,
      disabled: config.isDefault,
      onClick: () => !config.isDefault && onSetDefault(config.id),
    },
    { type: "divider" },
    {
      key: "delete",
      label: "删除",
      icon: <span className="material-symbols-outlined text-sm">delete</span>,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: "确认删除",
          content: `确定要删除模型配置「${config.name}」吗？`,
          okText: "删除",
          okButtonProps: { danger: true },
          cancelText: "取消",
          onOk: () => onDelete(config.id),
        });
      },
    },
  ];

  return (
    <div className="p-5 bg-bg-secondary border border-border rounded-xl hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColorClass(
              providerInfo.color
            )}`}
          >
            <span className="material-symbols-outlined">{providerInfo.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-text-primary">{config.name}</h3>
              {config.isDefault && (
                <Tag color="gold" className="text-xs">
                  默认
                </Tag>
              )}
              {getStatusTag()}
            </div>
            <p className="text-xs text-text-tertiary mt-0.5">
              {providerNames[config.provider]} · {config.modelId}
            </p>
          </div>
        </div>

        <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
          <button className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors text-text-tertiary">
            <span className="material-symbols-outlined text-lg">more_vert</span>
          </button>
        </Dropdown>
      </div>

      {config.lastError && (
        <div className="mb-3 p-2 bg-error/5 border border-error/20 rounded-lg">
          <p className="text-xs text-error truncate">{config.lastError}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-tertiary">优先级: {config.priority}</span>
          <button
            className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
            onClick={() => onTest(config)}
            disabled={testing}
          >
            {testing ? (
              <Spin size="small" />
            ) : (
              <span className="material-symbols-outlined text-xs">nest_remote_comfort_sensor</span>
            )}
            测试连接
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-tertiary">启用</span>
          <Switch
            size="small"
            checked={config.enabled}
            onChange={handleToggleEnabled}
            loading={enabledLoading}
          />
        </div>
      </div>
    </div>
  );
};

export { ModelConfigCard };
