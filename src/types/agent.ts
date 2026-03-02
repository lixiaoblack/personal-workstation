/**
 * 智能体模块类型定义
 */

// 从 electron types 导入类型
import type {
  AgentConfig as ElectronAgentConfig,
  CreateAgentInput as ElectronCreateAgentInput,
  UpdateAgentInput as ElectronUpdateAgentInput,
} from "../../electron/preload";

// 重新导出类型
export type AgentConfig = ElectronAgentConfig;
export type CreateAgentInput = ElectronCreateAgentInput;
export type UpdateAgentInput = ElectronUpdateAgentInput;

// 智能体状态
export type AgentStatus = "active" | "draft" | "deleted";

// 智能体列表项（用于列表展示）
export interface AgentListItem {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  model_name: string | null;
  status: AgentStatus;
  updated_at: number;
}

// 智能体列表响应
export interface AgentListResponse {
  success: boolean;
  data: AgentConfig[];
  count: number;
  error?: string;
}

// 智能体详情响应
export interface AgentResponse {
  success: boolean;
  data?: AgentConfig;
  error?: string;
}

// 预设头像
export const AGENT_AVATARS = [
  "🤖",
  "🧠",
  "📚",
  "🔍",
  "✍️",
  "💻",
  "📊",
  "🎯",
  "⚡",
  "🌟",
] as const;

export type AgentAvatar = (typeof AGENT_AVATARS)[number];
