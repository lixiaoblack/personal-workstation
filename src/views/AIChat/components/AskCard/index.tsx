/**
 * AskCard - 通用交互询问卡片组件
 * 
 * 支持多种交互类型：
 * - select: 单选
 * - multi: 多选
 * - confirm: 确认（是/否）
 * - input: 文本输入
 * - cascade: 级联选择
 * - api_select: API 动态选项
 */
import React, { memo, useState, useCallback, useMemo } from "react";
import { Button, Input, Checkbox, Radio, List, Spin } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import type {
  AskOption,
  AskMessage,
  AskInputConfig,
} from "@/types/electron";

interface AskCardProps {
  /** 询问消息 */
  message: AskMessage;
  /** 用户响应回调 */
  onRespond?: (askId: string, action: "submit" | "cancel", value?: unknown) => void;
  /** 是否已响应（禁用状态） */
  responded?: boolean;
  /** 响应结果 */
  result?: {
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  };
}

// 单选组件
const AskSelect: React.FC<{
  options: AskOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled: boolean;
}> = memo(({ options, value, onChange, disabled }) => (
  <Radio.Group
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="w-full"
  >
    <List
      dataSource={options}
      renderItem={(option) => (
        <List.Item
          className="!py-2 !px-3 hover:bg-bg-tertiary/50 rounded-lg cursor-pointer transition-colors"
          onClick={() => !disabled && onChange(option.id)}
        >
          <Radio value={option.id} className="w-full">
            <div className="flex flex-col">
              <span className="text-text-primary">{option.label}</span>
              {option.description && (
                <span className="text-xs text-text-tertiary">{option.description}</span>
              )}
            </div>
          </Radio>
        </List.Item>
      )}
    />
  </Radio.Group>
));

AskSelect.displayName = "AskSelect";

// 多选组件
const AskMulti: React.FC<{
  options: AskOption[];
  value?: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}> = memo(({ options, value = [], onChange, disabled }) => (
  <Checkbox.Group
    value={value}
    onChange={(checkedValues) => onChange(checkedValues as string[])}
    disabled={disabled}
    className="w-full"
  >
    <List
      dataSource={options}
      renderItem={(option) => (
        <List.Item
          className="!py-2 !px-3 hover:bg-bg-tertiary/50 rounded-lg transition-colors"
        >
          <Checkbox value={option.id} className="w-full">
            <div className="flex flex-col">
              <span className="text-text-primary">{option.label}</span>
              {option.description && (
                <span className="text-xs text-text-tertiary">{option.description}</span>
              )}
            </div>
          </Checkbox>
        </List.Item>
      )}
    />
  </Checkbox.Group>
));

AskMulti.displayName = "AskMulti";

// 确认组件
const AskConfirm: React.FC<{
  value?: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}> = memo(({ value, onChange, disabled }) => (
  <div className="flex gap-3 justify-center py-2">
    <Button
      type={value === true ? "primary" : "default"}
      icon={<CheckCircleOutlined />}
      onClick={() => onChange(true)}
      disabled={disabled}
      className="min-w-[100px]"
    >
      确认
    </Button>
    <Button
      type={value === false ? "primary" : "default"}
      danger={value === false}
      icon={<CloseCircleOutlined />}
      onClick={() => onChange(false)}
      disabled={disabled}
      className="min-w-[100px]"
    >
      取消
    </Button>
  </div>
));

AskConfirm.displayName = "AskConfirm";

// 输入组件
const AskInput: React.FC<{
  config?: AskInputConfig;
  value?: string;
  onChange: (value: string) => void;
  disabled: boolean;
}> = memo(({ config, value = "", onChange, disabled }) => (
  <Input
    placeholder={config?.placeholder}
    defaultValue={config?.defaultValue}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="mt-2"
    status={
      config?.required && !value.trim() ? "error" : undefined
    }
  />
));

AskInput.displayName = "AskInput";

// 级联选择组件
const AskCascade: React.FC<{
  options: AskOption[];
  value?: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}> = memo(({ options, value = [], onChange, disabled }) => {
  const [level, setLevel] = useState(0);
  const currentOptions = useMemo(() => {
    let opts = options;
    for (let i = 0; i < level; i++) {
      const parent = opts.find((o) => o.id === value[i]);
      opts = parent?.children || [];
    }
    return opts;
  }, [options, value, level]);

  const handleSelect = useCallback(
    (id: string) => {
      const newValue = [...value.slice(0, level), id];
      const selected = currentOptions.find((o) => o.id === id);
      if (selected?.children?.length) {
        onChange(newValue);
        setLevel(level + 1);
      } else {
        onChange(newValue);
      }
    },
    [currentOptions, value, level, onChange]
  );

  const handleBack = useCallback(() => {
    setLevel(Math.max(0, level - 1));
  }, [level]);

  return (
    <div>
      {level > 0 && (
        <Button
          type="link"
          onClick={handleBack}
          disabled={disabled}
          className="mb-2 p-0"
        >
          ← 返回上一级
        </Button>
      )}
      <List
        dataSource={currentOptions}
        renderItem={(option) => (
          <List.Item
            className="!py-2 !px-3 hover:bg-bg-tertiary/50 rounded-lg cursor-pointer transition-colors"
            onClick={() => !disabled && handleSelect(option.id)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-text-primary">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-text-tertiary">{option.description}</span>
                )}
              </div>
              {option.children && option.children.length > 0 && (
                <span className="text-text-tertiary">→</span>
              )}
            </div>
          </List.Item>
        )}
      />
    </div>
  );
});

AskCascade.displayName = "AskCascade";

// 主组件
const AskCard: React.FC<AskCardProps> = memo(
  ({ message, onRespond, responded = false, result }) => {
    // 内部状态
    const [value, setValue] = useState<unknown>(message.defaultValue);
    const [loading, setLoading] = useState(false);

    // 是否禁用
    const isDisabled = responded || loading;

    // 处理提交
    const handleSubmit = useCallback(() => {
      if (onRespond && !isDisabled) {
        setLoading(true);
        onRespond(message.askId, "submit", value);
      }
    }, [onRespond, message.askId, value, isDisabled]);

    // 处理取消
    const handleCancel = useCallback(() => {
      if (onRespond && !isDisabled) {
        onRespond(message.askId, "cancel");
      }
    }, [onRespond, message.askId, isDisabled]);

    // 渲染结果
    if (responded && result) {
      return (
        <div className="p-4 bg-bg-secondary rounded-xl border border-border">
          <div className="flex items-center gap-3">
            {result.success ? (
              <CheckCircleOutlined className="text-success text-lg" />
            ) : (
              <CloseCircleOutlined className="text-error text-lg" />
            )}
            <div>
              <div className="text-text-primary font-medium">{message.title}</div>
              {result.message && (
                <div className="text-sm text-text-secondary">{result.message}</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 渲染询问内容
    return (
      <div className="p-4 bg-bg-secondary rounded-xl border border-border">
        {/* 标题和描述 */}
        <div className="mb-4">
          <div className="text-text-primary font-medium mb-1">{message.title}</div>
          {message.description && (
            <div className="text-sm text-text-secondary">{message.description}</div>
          )}
        </div>

        {/* 交互内容 */}
        <div className="mb-4">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Spin indicator={<LoadingOutlined spin />} />
              <span className="ml-2 text-text-secondary">处理中...</span>
            </div>
          )}

          {!loading && message.askType === "select" && message.options && (
            <AskSelect
              options={message.options}
              value={value as string}
              onChange={setValue}
              disabled={isDisabled}
            />
          )}

          {!loading && message.askType === "multi" && message.options && (
            <AskMulti
              options={message.options}
              value={value as string[]}
              onChange={setValue}
              disabled={isDisabled}
            />
          )}

          {!loading && message.askType === "confirm" && (
            <AskConfirm
              value={value as boolean}
              onChange={setValue}
              disabled={isDisabled}
            />
          )}

          {!loading && message.askType === "input" && (
            <AskInput
              config={message.inputConfig}
              value={value as string}
              onChange={setValue}
              disabled={isDisabled}
            />
          )}

          {!loading && message.askType === "cascade" && message.options && (
            <AskCascade
              options={message.options}
              value={value as string[]}
              onChange={setValue}
              disabled={isDisabled}
            />
          )}

          {!loading && message.askType === "api_select" && (
            <div className="text-center py-4 text-text-secondary">
              API 动态选项加载中...
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {!loading && !responded && (
          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <Button onClick={handleCancel} disabled={isDisabled}>
              跳过
            </Button>
            <Button type="primary" onClick={handleSubmit} disabled={isDisabled}>
              确认
            </Button>
          </div>
        )}
      </div>
    );
  }
);

AskCard.displayName = "AskCard";

export default AskCard;
