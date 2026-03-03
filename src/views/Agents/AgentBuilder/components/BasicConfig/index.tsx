/**
 * BasicConfig 基础配置组件
 *
 * 功能：
 * 1. 头像选择（预设图标）
 * 2. 名称输入
 * 3. 描述输入
 * 4. 模型选择
 */
import React from "react";
import { Input, Select } from "antd";
import { AGENT_AVATARS } from "@/types/agent";

const { TextArea } = Input;

export interface BasicConfigValue {
  name: string;
  description: string;
  avatar: string;
  model_id: number | undefined;
  model_name: string | undefined;
}

interface BasicConfigProps {
  value: BasicConfigValue;
  onChange: (value: BasicConfigValue) => void;
  models: Array<{ id: number; name: string; modelId: string }>;
}

const BasicConfig: React.FC<BasicConfigProps> = ({
  value,
  onChange,
  models,
}) => {
  // 更新字段
  const updateField = <K extends keyof BasicConfigValue>(
    field: K,
    fieldValue: BasicConfigValue[K]
  ) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-border">
      <h3 className="text-base font-medium text-text-primary mb-4">基础配置</h3>

      {/* 头像选择 */}
      <div className="mb-4">
        <label className="block text-sm text-text-secondary mb-2">头像</label>
        <div className="flex gap-2 flex-wrap">
          {AGENT_AVATARS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                value.avatar === avatar
                  ? "bg-primary/20 ring-2 ring-primary"
                  : "bg-bg-tertiary hover:bg-bg-hover"
              }`}
              onClick={() => updateField("avatar", avatar)}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>

      {/* 名称 */}
      <div className="mb-4">
        <label className="block text-sm text-text-secondary mb-2">
          名称 <span className="text-error">*</span>
        </label>
        <Input
          value={value.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="给智能体起个名字"
          maxLength={50}
        />
      </div>

      {/* 描述 */}
      <div className="mb-4">
        <label className="block text-sm text-text-secondary mb-2">描述</label>
        <TextArea
          value={value.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="描述这个智能体的功能和用途"
          rows={2}
          maxLength={200}
          showCount
        />
      </div>

      {/* 模型选择 */}
      <div>
        <label className="block text-sm text-text-secondary mb-2">模型</label>
        <Select
          value={value.model_id}
          onChange={(val) => {
            const selectedModel = models.find((m) => m.id === val);
            onChange({
              ...value,
              model_id: val,
              model_name: selectedModel?.modelId,
            });
          }}
          placeholder="选择模型"
          className="w-full"
          allowClear
          options={models.map((m) => ({
            value: m.id,
            label: m.name,
          }))}
        />
      </div>
    </div>
  );
};

export { BasicConfig };
