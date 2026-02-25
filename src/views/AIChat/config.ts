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
  progress: "⏳", // 进度
};

export const AGENT_STEP_LABELS: Record<AgentStepType, string> = {
  thought: "思考中",
  tool_call: "调用工具",
  tool_result: "工具结果",
  answer: "回答",
  progress: "处理中",
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
  /** 进度信息（仅 progress 类型） */
  progress?: number;
  /** 进度阶段（仅 progress 类型） */
  stage?: string;
  /** 工具名称（仅 progress 类型） */
  toolName?: string;
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
 * 格式化工具参数，处理长路径
 */
function formatToolArguments(args: Record<string, unknown>): string {
  const formatted: string[] = [];

  for (const [key, value] of Object.entries(args)) {
    if (key === "file_path" && typeof value === "string") {
      // 文件路径特殊处理：显示文件名，完整路径可折叠
      const pathStr = value as string;
      const fileName = pathStr.split("/").pop() || pathStr;
      if (pathStr.length > 50) {
        formatted.push(`${key}: ${fileName}`);
        formatted.push(`  (完整路径: ${pathStr})`);
      } else {
        formatted.push(`${key}: ${pathStr}`);
      }
    } else if (typeof value === "string" && value.length > 100) {
      // 其他长字符串截断
      formatted.push(`${key}: ${value.substring(0, 100)}...`);
    } else {
      formatted.push(`${key}: ${JSON.stringify(value)}`);
    }
  }

  return formatted.join("\n");
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
    let title: React.ReactNode = AGENT_STEP_LABELS[step.type] || step.type;
    let description: React.ReactNode = "";
    let content: React.ReactNode = step.content || "";

    // 进度类型特殊处理
    if (step.type === "progress") {
      status = step.stage === "ocr_complete" ? "success" : "loading";
      title = step.toolName
        ? `${step.toolName}: ${step.content}`
        : step.content;

      // 如果有进度，存储进度值供组件使用
      if (step.progress !== undefined && step.progress !== null) {
        // 使用 extra 字段存储进度信息
        content = JSON.stringify({
          progress: step.progress,
          content: step.content,
        });
      }
    }
    // 工具调用特殊处理
    else if (step.type === "tool_call" && step.toolCall) {
      title = `${AGENT_STEP_LABELS[step.type]}: ${step.toolCall.name}`;
      description = formatToolArguments(step.toolCall.arguments);
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
 * 判断步骤是否包含真正的工具调用
 * 条件：step.type === "tool_call" 且 step.toolCall 有值且 toolCall.name 存在
 * 或者：step.toolCall 存在且 toolCall.name 存在（兼容旧格式）
 */
export function hasToolCalls(steps: AgentStepItem[]): boolean {
  return steps.some(
    (step) =>
      (step.type === "tool_call" && step.toolCall && step.toolCall.name) ||
      (step.toolCall && step.toolCall.name)
  );
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
