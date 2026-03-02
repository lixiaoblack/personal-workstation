/**
 * AdvancedConfig 高级配置组件
 *
 * 功能：
 * 1. 温度滑块
 * 2. 最大令牌数
 * 3. 开场白配置
 */
import React from "react";
import { Input, Slider } from "antd";

const { TextArea } = Input;

export interface AdvancedConfigValue {
  parameters: {
    temperature: number;
    max_tokens: number;
    top_p?: number;
  };
  opening_message?: string;
}

interface AdvancedConfigProps {
  value: AdvancedConfigValue;
  onChange: (value: AdvancedConfigValue) => void;
}

const AdvancedConfig: React.FC<AdvancedConfigProps> = ({ value, onChange }) => {
  // 更新参数
  const updateParameter = <K extends keyof AdvancedConfigValue["parameters"]>(
    key: K,
    val: AdvancedConfigValue["parameters"][K]
  ) => {
    onChange({
      ...value,
      parameters: {
        ...value.parameters,
        [key]: val,
      },
    });
  };

  // 更新开场白
  const updateOpeningMessage = (text: string) => {
    onChange({
      ...value,
      opening_message: text,
    });
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-border">
      <h3 className="text-base font-medium text-text-primary mb-4">高级配置</h3>

      {/* 温度 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-text-secondary">温度 (Temperature)</label>
          <span className="text-sm text-text-primary font-medium">
            {value.parameters?.temperature ?? 0.7}
          </span>
        </div>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={value.parameters?.temperature ?? 0.7}
          onChange={(val) => updateParameter("temperature", val)}
          tooltip={{ formatter: (v) => v?.toFixed(1) }}
        />
        <div className="flex justify-between text-xs text-text-tertiary">
          <span>精确 (0)</span>
          <span>创意 (2)</span>
        </div>
      </div>

      {/* 最大令牌数 */}
      <div className="mb-6">
        <label className="block text-sm text-text-secondary mb-2">
          最大令牌数 (Max Tokens)
        </label>
        <Input
          type="number"
          value={value.parameters?.max_tokens ?? 4096}
          onChange={(e) =>
            updateParameter("max_tokens", parseInt(e.target.value) || 4096)
          }
          min={1}
          max={128000}
        />
        <div className="mt-1 text-xs text-text-tertiary">
          限制 AI 回复的最大长度
        </div>
      </div>

      {/* Top P */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-text-secondary">Top P</label>
          <span className="text-sm text-text-primary font-medium">
            {value.parameters?.top_p ?? 1}
          </span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={value.parameters?.top_p ?? 1}
          onChange={(val) => updateParameter("top_p", val)}
          tooltip={{ formatter: (v) => v?.toFixed(1) }}
        />
        <div className="flex justify-between text-xs text-text-tertiary">
          <span>保守 (0)</span>
          <span>多样 (1)</span>
        </div>
      </div>

      {/* 开场白 */}
      <div>
        <label className="block text-sm text-text-secondary mb-2">开场白</label>
        <TextArea
          value={value.opening_message || ""}
          onChange={(e) => updateOpeningMessage(e.target.value)}
          placeholder="设置智能体的开场白，会在对话开始时自动发送..."
          rows={3}
          maxLength={500}
          showCount
        />
      </div>
    </div>
  );
};

export { AdvancedConfig };
