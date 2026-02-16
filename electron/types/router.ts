/**
 * 模型路由相关类型定义
 */

import type { ModelConfig } from "./model";

// 聊天消息角色
export type ChatRole = "system" | "user" | "assistant";

// AI 聊天消息（用于模型路由）
export interface AIChatMessage {
  role: ChatRole;
  content: string;
}

// 聊天请求参数
export interface ChatRequest {
  messages: AIChatMessage[];
  model?: string; // 可选，覆盖配置中的模型
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

// 聊天响应块（流式）
export interface ChatStreamChunk {
  id: string;
  model: string;
  content: string;
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 聊天完成响应（非流式）
export interface ChatCompletionResponse {
  id: string;
  model: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 模型路由结果
export interface ModelRouteResult {
  success: boolean;
  config: ModelConfig | null;
  error?: string;
}

// 流式回调
export type StreamCallback = (chunk: ChatStreamChunk) => void;

// 错误回调
export type ErrorCallback = (error: Error) => void;
