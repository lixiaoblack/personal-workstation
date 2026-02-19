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

/**
 * 思考过程状态 - 用于 Think 组件
 */
export type ThinkStatus = "loading" | "success" | "error";

/**
 * 思维链节点状态 - 用于 ThoughtChain 组件
 * 与 @ant-design/x 的 THOUGHT_CHAIN_ITEM_STATUS 保持一致
 */
export type ThoughtChainItemStatus = "loading" | "success" | "error" | "abort";

/**
 * 思维链节点 - 用于 ThoughtChain 组件
 * 与 @ant-design/x 的 ThoughtChainItemType 保持一致
 */
export interface ThoughtChainItem {
  /** 唯一标识 */
  key?: string;
  /** 节点状态 */
  status?: ThoughtChainItemStatus;
  /** 标题 */
  title?: React.ReactNode;
  /** 描述 */
  description?: React.ReactNode;
  /** 详细内容 */
  content?: React.ReactNode;
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 图标 */
  icon?: React.ReactNode;
  /** 底部 */
  footer?: React.ReactNode;
  /** 闪烁 */
  blink?: boolean;
}

/**
 * 将 AgentStepItem 转换为 ThoughtChainItem
 */
export function convertToThoughtChainItems(
  steps: AgentStepItem[]
): ThoughtChainItem[] {
  return steps.map((step, index) => {
    const key = `step_${index}_${step.type}`;

    // 根据步骤类型确定状态
    let status: ThoughtChainItemStatus = "success";
    if (step.content?.includes("失败") || step.content?.includes("错误")) {
      status = "error";
    }

    // 根据步骤类型确定标题
    let title = AGENT_STEP_LABELS[step.type] || step.type;
    let description = "";
    const content = step.content || "";

    // 工具调用特殊处理
    if (step.type === "tool_call" && step.toolCall) {
      title = `${AGENT_STEP_LABELS[step.type]}: ${step.toolCall.name}`;
      description = `参数: ${JSON.stringify(step.toolCall.arguments)}`;
    }

    return {
      key,
      status,
      title,
      description,
      content,
      collapsible: true,
    };
  });
}

/**
 * 判断步骤是否包含工具调用
 */
export function hasToolCalls(steps: AgentStepItem[]): boolean {
  return steps.some((step) => step.type === "tool_call");
}

/**
 * 判断步骤是否包含错误
 */
export function hasErrors(steps: AgentStepItem[]): boolean {
  return steps.some(
    (step) => step.content?.includes("失败") || step.content?.includes("错误")
  );
}

/**
 * 过滤出思考步骤（排除 answer）
 */
export function filterThinkingSteps(steps: AgentStepItem[]): AgentStepItem[] {
  return steps.filter((step) => step.type !== "answer");
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
