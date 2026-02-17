/**
 * AI 模型配置相关类型定义
 */

// 模型用途类型
export type ModelUsageType = "llm" | "embedding"; // 大语言模型 | 嵌入模型

// 模型提供商类型
export type ModelProvider =
  | "openai" // OpenAI API
  | "bailian" // 百炼（阿里云）
  | "zhipu" // 智谱 AI
  | "ollama" // Ollama 本地
  | "custom"; // 自定义 API

// 模型配置状态
export type ModelConfigStatus = "active" | "inactive" | "error";

// 基础模型配置
export interface BaseModelConfig {
  id: number;
  usageType: ModelUsageType; // 模型用途
  provider: ModelProvider;
  name: string; // 配置名称，如 "GPT-4", "Qwen-Max"
  modelId: string; // 模型 ID，如 "gpt-4-turbo", "qwen-max"
  enabled: boolean; // 是否启用
  isDefault: boolean; // 是否默认模型
  priority: number; // 优先级（用于降级策略）
  status: ModelConfigStatus; // 状态
  lastError?: string; // 最后错误信息
  createdAt: string;
  updatedAt: string;
}

// 在线 API 模型配置
export interface OnlineModelConfig extends BaseModelConfig {
  provider: "openai" | "bailian" | "zhipu" | "custom";
  apiKey: string; // API Key（加密存储）
  apiBaseUrl?: string; // 自定义 API 地址
  organization?: string; // OpenAI Organization ID
  maxTokens?: number; // 最大 token 数
  temperature?: number; // 温度参数
  extraParams?: Record<string, unknown>; // 额外参数
}

// Ollama 本地模型配置
export interface OllamaModelConfig extends BaseModelConfig {
  provider: "ollama";
  host: string; // Ollama 服务地址，默认 http://127.0.0.1:11434
  keepAlive?: string; // 模型保持时间
  maxTokens?: number;
  temperature?: number;
  extraParams?: Record<string, unknown>;
}

// 联合类型
export type ModelConfig = OnlineModelConfig | OllamaModelConfig;

// 模型配置创建/更新参数
export interface CreateModelConfigInput {
  usageType?: ModelUsageType; // 默认 "llm"
  provider: ModelProvider;
  name: string;
  modelId: string;
  apiKey?: string;
  apiBaseUrl?: string;
  organization?: string;
  host?: string;
  enabled?: boolean;
  isDefault?: boolean;
  priority?: number;
  maxTokens?: number;
  temperature?: number;
  keepAlive?: string;
  extraParams?: Record<string, unknown>;
}

export interface UpdateModelConfigInput {
  usageType?: ModelUsageType;
  name?: string;
  modelId?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  organization?: string;
  host?: string;
  enabled?: boolean;
  isDefault?: boolean;
  priority?: number;
  maxTokens?: number;
  temperature?: number;
  keepAlive?: string;
  extraParams?: Record<string, unknown>;
  status?: ModelConfigStatus;
  lastError?: string;
}

// 模型配置列表项（不包含敏感信息）
export interface ModelConfigListItem {
  id: number;
  usageType: ModelUsageType;
  provider: ModelProvider;
  name: string;
  modelId: string;
  enabled: boolean;
  isDefault: boolean;
  priority: number;
  status: ModelConfigStatus;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

// 模型测试结果
export interface ModelTestResult {
  success: boolean;
  latency?: number; // 响应延迟（毫秒）
  error?: string;
  modelInfo?: {
    name: string;
    contextLength?: number;
  };
}

// 默认嵌入模型配置
export const DEFAULT_EMBEDDING_MODEL_CONFIGS: Omit<
  CreateModelConfigInput,
  "apiKey"
>[] = [
  {
    usageType: "embedding",
    provider: "ollama",
    name: "Nomic Embed Text",
    modelId: "nomic-embed-text",
    host: "http://127.0.0.1:11434",
    enabled: false,
    isDefault: false,
    priority: 1,
  },
  {
    usageType: "embedding",
    provider: "ollama",
    name: "Mxbai Embed Large",
    modelId: "mxbai-embed-large",
    host: "http://127.0.0.1:11434",
    enabled: false,
    isDefault: false,
    priority: 2,
  },
  {
    usageType: "embedding",
    provider: "openai",
    name: "OpenAI text-embedding-3-small",
    modelId: "text-embedding-3-small",
    enabled: false,
    isDefault: false,
    priority: 3,
    maxTokens: 8191,
  },
  {
    usageType: "embedding",
    provider: "openai",
    name: "OpenAI text-embedding-3-large",
    modelId: "text-embedding-3-large",
    enabled: false,
    isDefault: false,
    priority: 4,
    maxTokens: 8191,
  },
];

// 默认模型配置
export const DEFAULT_MODEL_CONFIGS: Omit<CreateModelConfigInput, "apiKey">[] = [
  {
    provider: "openai",
    name: "GPT-4o",
    modelId: "gpt-4o",
    enabled: false,
    isDefault: false,
    priority: 1,
    maxTokens: 4096,
    temperature: 0.7,
  },
  {
    provider: "openai",
    name: "GPT-3.5-Turbo",
    modelId: "gpt-3.5-turbo",
    enabled: false,
    isDefault: false,
    priority: 2,
    maxTokens: 4096,
    temperature: 0.7,
  },
  {
    provider: "bailian",
    name: "Qwen-Max",
    modelId: "qwen-max",
    enabled: false,
    isDefault: false,
    priority: 3,
    maxTokens: 4096,
    temperature: 0.7,
    apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    provider: "zhipu",
    name: "GLM-4",
    modelId: "glm-4",
    enabled: false,
    isDefault: false,
    priority: 4,
    maxTokens: 4096,
    temperature: 0.7,
    apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
  },
  {
    provider: "ollama",
    name: "Llama 3",
    modelId: "llama3",
    host: "http://127.0.0.1:11434",
    enabled: false,
    isDefault: false,
    priority: 10,
    maxTokens: 4096,
    temperature: 0.7,
  },
];
