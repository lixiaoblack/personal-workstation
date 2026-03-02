/**
 * PromptEditor 提示词编辑器组件
 *
 * 功能：
 * 1. 多行文本编辑
 * 2. 变量插入
 * 3. 字数统计
 */
import React from "react";
import { Input, Button, Tooltip } from "antd";

const { TextArea } = Input;

// 预设变量
const PRESET_VARIABLES = [
  { key: "{{current_date}}", label: "当前日期", description: "插入当前日期" },
  { key: "{{current_time}}", label: "当前时间", description: "插入当前时间" },
  { key: "{{user_name}}", label: "用户名称", description: "插入用户名称" },
];

export interface PromptEditorValue {
  system_prompt: string;
}

interface PromptEditorProps {
  value: PromptEditorValue;
  onChange: (value: PromptEditorValue) => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ value, onChange }) => {
  // 插入变量
  const insertVariable = (variable: string) => {
    onChange({
      system_prompt: value.system_prompt + variable,
    });
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-text-primary">系统提示词</h3>
        <div className="flex items-center gap-2">
          {PRESET_VARIABLES.map((v) => (
            <Tooltip key={v.key} title={v.description}>
              <Button
                size="small"
                onClick={() => insertVariable(v.key)}
                className="text-xs"
              >
                {v.label}
              </Button>
            </Tooltip>
          ))}
        </div>
      </div>

      <TextArea
        value={value.system_prompt}
        onChange={(e) => onChange({ system_prompt: e.target.value })}
        placeholder="定义智能体的角色、行为和能力...&#10;&#10;例如：&#10;你是一个专业的助手，负责帮助用户解答问题。&#10;请用简洁、准确的语言回答用户的问题。"
        rows={8}
        showCount
        maxLength={4000}
      />

      <div className="mt-2 text-xs text-text-tertiary">
        提示：使用变量可以让提示词更加动态，例如在每次对话时自动插入当前日期。
      </div>
    </div>
  );
};

export { PromptEditor };
