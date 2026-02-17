/**
 * AIChat 页面配置文件
 * 包含常量定义、类型定义、工具函数
 */

import type {
  ModelConfig,
  OllamaModelConfig,
  AgentStepType,
} from "@/types/electron";

// ==================== 常量定义 ====================

/**
 * 提供商显示名称映射
 */
export const PROVIDER_LABELS: Record<string, { name: string; color: string }> =
  {
    openai: { name: "OpenAI", color: "processing" },
    bailian: { name: "百炼", color: "cyan" },
    zhipu: { name: "智谱", color: "purple" },
    ollama: { name: "Ollama", color: "success" },
    custom: { name: "自定义", color: "default" },
  };

/**
 * 上下文配置：默认保留最近 N 条消息
 */
export const DEFAULT_CONTEXT_LIMIT = 20;

/**
 * Agent 步骤显示配置
 */
export const AGENT_STEP_ICONS: Record<AgentStepType, string> = {
  thought: "💭", // 思考
  tool_call: "🔧", // 调用工具
  tool_result: "📊", // 工具结果
  answer: "💬", // 最终答案
};

export const AGENT_STEP_LABELS: Record<AgentStepType, string> = {
  thought: "思考中",
  tool_call: "调用工具",
  tool_result: "工具结果",
  answer: "回答",
};

// ==================== 类型定义 ====================

/**
 * 流式消息状态
 */
export interface StreamState {
  status: "idle" | "streaming" | "done" | "error";
  content: string;
  conversationId: number | null;
}

/**
 * Agent 步骤项
 */
export interface AgentStepItem {
  type: AgentStepType;
  content: string;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  iteration?: number;
  timestamp: number;
}

// ==================== 工具函数 ====================

/**
 * 格式化时间
 */
export const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * 检查是否为 Ollama 模型配置
 */
export const isOllamaModel = (
  model: ModelConfig
): model is OllamaModelConfig => {
  return model.provider === "ollama";
};
