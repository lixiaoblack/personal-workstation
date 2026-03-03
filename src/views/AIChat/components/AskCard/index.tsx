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
import type { AskOption, AskMessage, AskInputConfig } from "@/types/electron";

interface AskCardProps {
  /** 询问消息 */
  message: AskMessage;
  /** 用户响应回调 */
  onRespond?: (
    askId: string,
    action: "submit" | "cancel",
    value?: unknown
  ) => void;
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
  value?: string | { id: string; input?: string };
  onChange: (value: string | { id: string; input?: string }) => void;
  disabled: boolean;
}> = memo(({ options, value, onChange, disabled }) => {
  // 获取当前选中的选项 ID
  const selectedId = typeof value === "string" ? value : value?.id;
  // 获取当前选中的选项
  const selectedOption = options.find((o) => o.id === selectedId);
  // 是否需要输入
  const needInput = Boolean(selectedOption?.metadata?.inputRequired);
  // 输入值
  const [inputValue, setInputValue] = useState("");

  const handleSelect = (id: string) => {
    const option = options.find((o) => o.id === id);
    if (option?.metadata?.inputRequired) {
      // 需要输入的选项，设置为对象
      onChange({ id, input: "" });
    } else {
      // 普通选项，直接设置 ID
      onChange(id);
    }
  };

  const handleInputChange = (newInputValue: string) => {
    setInputValue(newInputValue);
    if (typeof value === "object" && value?.id) {
      onChange({ ...value, input: newInputValue });
    }
  };

  // 获取输入框的值
  const getInputValue = (): string => {
    if (typeof value === "object" && value?.input !== undefined) {
      return value.input;
    }
    return inputValue;
  };

  return (
    <div>
      <Radio.Group
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
        className="w-full"
      >
        <List
          dataSource={options}
          renderItem={(option) => (
            <List.Item
              className="!py-1.5 !px-2 !border-b-0 hover:bg-bg-tertiary/50 rounded cursor-pointer transition-colors"
              onClick={() => !disabled && handleSelect(option.id)}
            >
              <Radio value={option.id} className="w-full">
                <div className="flex flex-col">
                  <span className="text-text-primary text-sm">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="text-xs text-text-tertiary">
                      {option.description}
                    </span>
                  )}
                </div>
              </Radio>
            </List.Item>
          )}
        />
      </Radio.Group>
      {/* 当选中需要输入的选项时，显示输入框 */}
      {needInput && (
        <div className="mt-2 ml-5">
          <Input
            size="small"
            placeholder={String(
              selectedOption?.metadata?.inputPlaceholder || "请输入"
            )}
            value={getInputValue()}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={disabled}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
});

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
        <List.Item className="!py-1.5 !px-2 !border-b-0 hover:bg-bg-tertiary/50 rounded transition-colors">
          <Checkbox value={option.id} className="w-full">
            <div className="flex flex-col">
              <span className="text-text-primary text-sm">{option.label}</span>
              {option.description && (
                <span className="text-xs text-text-tertiary">
                  {option.description}
                </span>
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
  <div className="flex gap-2 justify-center py-1">
    <Button
      size="small"
      type={value === true ? "primary" : "default"}
      icon={<CheckCircleOutlined />}
      onClick={() => onChange(true)}
      disabled={disabled}
    >
      确认
    </Button>
    <Button
      size="small"
      type={value === false ? "primary" : "default"}
      danger={value === false}
      icon={<CloseCircleOutlined />}
      onClick={() => onChange(false)}
      disabled={disabled}
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
    size="small"
    placeholder={config?.placeholder}
    defaultValue={config?.defaultValue}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    status={config?.required && !value.trim() ? "error" : undefined}
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
          size="small"
          onClick={handleBack}
          disabled={disabled}
          className="mb-1 p-0 text-xs"
        >
          ← 返回上一级
        </Button>
      )}
      <List
        dataSource={currentOptions}
        renderItem={(option) => (
          <List.Item
            className="!py-1.5 !px-2 !border-b-0 hover:bg-bg-tertiary/50 rounded cursor-pointer transition-colors"
            onClick={() => !disabled && handleSelect(option.id)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-text-primary text-sm">
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-text-tertiary">
                    {option.description}
                  </span>
                )}
              </div>
              {option.children && option.children.length > 0 && (
                <span className="text-text-tertiary text-xs">→</span>
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
        <div className="p-3 bg-bg-secondary rounded-lg border border-border">
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircleOutlined className="text-success" />
            ) : (
              <CloseCircleOutlined className="text-error" />
            )}
            <div>
              <div className="text-text-primary text-sm font-medium">
                {message.title}
              </div>
              {result.message && (
                <div className="text-xs text-text-secondary">
                  {result.message}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 渲染询问内容
    return (
      <div className="p-3 bg-bg-secondary rounded-lg border border-border">
        {/* 标题和描述 */}
        <div className="mb-2">
          <div className="text-text-primary text-sm font-medium">
            {message.title}
          </div>
          {message.description && (
            <div className="text-xs text-text-secondary">
              {message.description}
            </div>
          )}
        </div>

        {/* 交互内容 */}
        <div className="mb-2">
          {loading && (
            <div className="flex items-center justify-center py-2">
              <Spin indicator={<LoadingOutlined spin />} size="small" />
              <span className="ml-2 text-xs text-text-secondary">
                处理中...
              </span>
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
            <div className="text-center py-2 text-xs text-text-secondary">
              API 动态选项加载中...
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {!loading && !responded && (
          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <Button size="small" onClick={handleCancel} disabled={isDisabled}>
              跳过
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={handleSubmit}
              disabled={isDisabled}
            >
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
