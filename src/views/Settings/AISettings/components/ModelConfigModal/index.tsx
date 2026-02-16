/**
 * ModelConfigModal 模型配置编辑弹窗组件
 */
import React, { useState, useEffect } from "react";
import { Modal, Input, Select, InputNumber, App } from "antd";
import type { ModelConfig, ModelProvider, CreateModelConfigInput } from "@/types/electron";

interface ModelConfigModalProps {
  open: boolean;
  config: ModelConfig | null; // 使用完整配置类型
  onClose: () => void;
  onSave: (id: number | null, input: CreateModelConfigInput) => Promise<boolean>;
}

// 掩码 API Key（只显示前4位和后4位）
const maskApiKey = (key: string): string => {
  if (!key || key.length < 12) return key;
  return `${key.slice(0, 4)}${"*".repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
};

const providerOptions: { value: ModelProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "bailian", label: "百炼（阿里云）" },
  { value: "zhipu", label: "智谱 AI" },
  { value: "ollama", label: "Ollama（本地）" },
  { value: "custom", label: "自定义 API" },
];

const defaultApiUrls: Record<ModelProvider, string> = {
  openai: "https://api.openai.com/v1",
  bailian: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  ollama: "http://127.0.0.1:11434",
  custom: "",
};

const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  open,
  config,
  onClose,
  onSave,
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  // 表单状态
  const [provider, setProvider] = useState<ModelProvider>("openai");
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false); // 是否已有存储的 apiKey
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [host, setHost] = useState("http://127.0.0.1:11434");
  const [priority, setPriority] = useState(10);
  const [maxTokens, setMaxTokens] = useState<number | null>(4096);
  const [temperature, setTemperature] = useState<number | null>(0.7);

  // 初始化表单
  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setName(config.name);
      setModelId(config.modelId);
      setPriority(config.priority);
      setMaxTokens(config.maxTokens || null);
      setTemperature(config.temperature || null);

      if (config.provider === "ollama") {
        setHost(config.host || "http://127.0.0.1:11434");
      } else {
        // 在线 API 配置
        const onlineConfig = config as Extract<ModelConfig, { provider: "openai" | "bailian" | "zhipu" | "custom" }>;
        const storedApiKey = onlineConfig.apiKey || "";
        setHasApiKey(!!storedApiKey);
        setApiKey(""); // 编辑时不显示实际值，用户可以选择修改
        setApiBaseUrl(onlineConfig.apiBaseUrl || defaultApiUrls[config.provider]);
      }
    } else {
      // 重置为默认值
      setProvider("openai");
      setName("");
      setModelId("");
      setApiKey("");
      setHasApiKey(false);
      setApiBaseUrl(defaultApiUrls.openai);
      setHost("http://127.0.0.1:11434");
      setPriority(10);
      setMaxTokens(4096);
      setTemperature(0.7);
    }
  }, [config, open]);

  // 提供商变更时更新默认 API 地址
  const handleProviderChange = (value: ModelProvider) => {
    setProvider(value);
    if (value === "ollama") {
      setHost(defaultApiUrls.ollama);
    } else {
      setApiBaseUrl(defaultApiUrls[value]);
    }
  };

  // 保存
  const handleSave = async () => {
    if (!name.trim()) {
      message.warning("请输入配置名称");
      return;
    }
    if (!modelId.trim()) {
      message.warning("请输入模型 ID");
      return;
    }
    // 编辑时：如果已有 apiKey 且用户没有输入新的，则不传 apiKey（保留原值）
    // 新建时：必须输入 apiKey
    if (provider !== "ollama") {
      if (!config && !apiKey.trim()) {
        message.warning("请输入 API Key");
        return;
      }
    }

    setLoading(true);
    try {
      const input: CreateModelConfigInput = {
        provider,
        name: name.trim(),
        modelId: modelId.trim(),
        priority,
        maxTokens: maxTokens || undefined,
        temperature: temperature || undefined,
      };

      if (provider === "ollama") {
        input.host = host;
      } else {
        // 只有输入了新的 apiKey 才更新
        if (apiKey.trim()) {
          input.apiKey = apiKey.trim();
        }
        input.apiBaseUrl = apiBaseUrl || undefined;
      }

      const success = await onSave(config?.id || null, input);
      if (success) {
        message.success(config ? "配置已更新" : "配置已创建");
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const isOllama = provider === "ollama";

  return (
    <Modal
      title={config ? "编辑模型配置" : "添加模型配置"}
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      width={520}
      destroyOnClose
    >
      <div className="space-y-4 py-4">
        {/* 提供商 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-tertiary">
            提供商
          </label>
          <Select
            className="w-full"
            value={provider}
            onChange={handleProviderChange}
            options={providerOptions}
            disabled={!!config}
          />
        </div>

        {/* 配置名称 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-tertiary">
            配置名称 <span className="text-error">*</span>
          </label>
          <Input
            placeholder="例如: GPT-4o, Qwen-Max"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* 模型 ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-tertiary">
            模型 ID <span className="text-error">*</span>
          </label>
          <Input
            placeholder={
              isOllama ? "例如: llama3, qwen2" : "例如: gpt-4o, qwen-max"
            }
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
          />
        </div>

        {/* Ollama 配置 */}
        {isOllama ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-tertiary">
              服务地址
            </label>
            <Input
              placeholder="http://127.0.0.1:11434"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
        ) : (
          <>
            {/* API Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-tertiary">
                API Key{" "}
                {config && hasApiKey ? (
                  <span className="text-success">(已存储)</span>
                ) : (
                  <span className="text-error">*</span>
                )}
              </label>
              {config && hasApiKey ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-bg-tertiary rounded-lg">
                    <span className="material-symbols-outlined text-success text-sm">lock</span>
                    <span className="text-sm text-text-secondary font-mono">
                      {maskApiKey((config as Extract<ModelConfig, { provider: "openai" | "bailian" | "zhipu" | "custom" }>).apiKey)}
                    </span>
                  </div>
                  <Input.Password
                    placeholder="输入新的 API Key 以更新"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-text-tertiary">留空则保留原 API Key</p>
                </div>
              ) : (
                <Input.Password
                  placeholder="请输入 API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              )}
            </div>

            {/* API Base URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-tertiary">
                API Base URL
              </label>
              <Input
                placeholder="自定义 API 地址（可选）"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
              />
            </div>
          </>
        )}

        {/* 高级设置 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-tertiary">
              优先级
            </label>
            <InputNumber
              className="w-full"
              min={1}
              max={100}
              value={priority}
              onChange={(v) => setPriority(v || 10)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-tertiary">
              最大 Token
            </label>
            <InputNumber
              className="w-full"
              min={1}
              value={maxTokens}
              onChange={(v) => setMaxTokens(v)}
              placeholder="4096"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-tertiary">
              温度
            </label>
            <InputNumber
              className="w-full"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(v) => setTemperature(v)}
              placeholder="0.7"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export { ModelConfigModal };
