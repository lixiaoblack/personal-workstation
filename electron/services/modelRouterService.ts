/**
 * 模型路由服务
 * 负责路由到正确的 AI 模型提供商并处理请求
 */
import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import type { ModelConfig, OnlineModelConfig } from "../types/model";
import type {
  ChatRequest,
  ChatCompletionResponse,
  StreamCallback,
} from "../types/router";
import {
  getDefaultModelConfig,
  getModelConfigById,
  updateModelStatus,
} from "./modelConfigService";

// 默认 API URLs
const DEFAULT_API_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  bailian: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
};

/**
 * 创建 OpenAI 客户端
 */
function createOpenAIClient(config: OnlineModelConfig): OpenAI {
  const baseURL = config.apiBaseUrl || DEFAULT_API_URLS[config.provider] || DEFAULT_API_URLS.openai;

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL,
    organization: config.organization,
    dangerouslyAllowBrowser: false, // 只在主进程使用
  });
}

/**
 * 获取路由配置
 * @param configId 指定配置 ID，不传则使用默认配置
 */
export async function routeToModel(configId?: number): Promise<{
  config: ModelConfig | null;
  error?: string;
}> {
  let config: ModelConfig | null = null;

  if (configId) {
    config = await getModelConfigById(configId);
  } else {
    config = await getDefaultModelConfig();
  }

  if (!config) {
    return {
      config: null,
      error: configId ? `配置 ID ${configId} 不存在` : "没有启用的默认模型配置",
    };
  }

  if (!config.enabled) {
    return {
      config: null,
      error: `模型配置「${config.name}」未启用`,
    };
  }

  // 检查在线 API 是否有 API Key
  if (config.provider !== "ollama") {
    const onlineConfig = config as OnlineModelConfig;
    if (!onlineConfig.apiKey) {
      return {
        config: null,
        error: `模型配置「${config.name}」未设置 API Key`,
      };
    }
  }

  return { config };
}

/**
 * 发送聊天请求（非流式）
 */
export async function sendChatRequest(
  request: ChatRequest,
  configId?: number
): Promise<ChatCompletionResponse> {
  const { config, error } = await routeToModel(configId);
  
  if (!config || error) {
    throw new Error(error || "无法获取模型配置");
  }

  if (config.provider === "ollama") {
    throw new Error("Ollama 模型暂不支持，请使用 AI-015 实现");
  }

  const onlineConfig = config as OnlineModelConfig;
  const client = createOpenAIClient(onlineConfig);

  try {
    const response = await client.chat.completions.create({
      model: request.model || config.modelId,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: request.maxTokens || config.maxTokens,
      temperature: request.temperature ?? config.temperature ?? 0.7,
      stream: false,
    });

    const choice = response.choices[0];

    // 更新状态为活跃
    await updateModelStatus(config.id, "active");

    return {
      id: response.id,
      model: response.model,
      content: choice.message.content || "",
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await updateModelStatus(config.id, "error", errorMessage);
    throw new Error(`聊天请求失败: ${errorMessage}`);
  }
}

/**
 * 发送聊天请求（流式）
 */
export async function sendChatRequestStream(
  request: ChatRequest,
  onChunk: StreamCallback,
  configId?: number
): Promise<void> {
  const { config, error } = await routeToModel(configId);
  
  if (!config || error) {
    throw new Error(error || "无法获取模型配置");
  }

  if (config.provider === "ollama") {
    throw new Error("Ollama 模型暂不支持，请使用 AI-015 实现");
  }

  const onlineConfig = config as OnlineModelConfig;
  const client = createOpenAIClient(onlineConfig);

  try {
    const stream = await client.chat.completions.create({
      model: request.model || config.modelId,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: request.maxTokens || config.maxTokens,
      temperature: request.temperature ?? config.temperature ?? 0.7,
      stream: true,
    });

    let responseId = "";
    let model = config.modelId;

    for await (const chunk of stream as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>) {
      responseId = chunk.id || responseId;
      model = chunk.model || model;

      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason || null;

      if (delta?.content) {
        onChunk({
          id: responseId,
          model,
          content: delta.content,
          finishReason,
        });
      }

      if (finishReason) {
        onChunk({
          id: responseId,
          model,
          content: "",
          finishReason,
          usage: chunk.usage
            ? {
                promptTokens: chunk.usage.prompt_tokens || 0,
                completionTokens: chunk.usage.completion_tokens || 0,
                totalTokens: chunk.usage.total_tokens || 0,
              }
            : undefined,
        });
      }
    }

    // 更新状态为活跃
    await updateModelStatus(config.id, "active");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await updateModelStatus(config.id, "error", errorMessage);
    throw new Error(`流式聊天请求失败: ${errorMessage}`);
  }
}

/**
 * 测试模型连接
 */
export async function testModelConnection(configId: number): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  const config = await getModelConfigById(configId);
  
  if (!config) {
    return { success: false, error: "配置不存在" };
  }

  if (config.provider === "ollama") {
    return { success: false, error: "Ollama 模型暂不支持" };
  }

  const onlineConfig = config as OnlineModelConfig;
  
  if (!onlineConfig.apiKey) {
    return { success: false, error: "未设置 API Key" };
  }

  const client = createOpenAIClient(onlineConfig);
  const startTime = Date.now();

  try {
    // 发送一个简单的测试请求
    const response = await client.chat.completions.create({
      model: config.modelId,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
      stream: false,
    });

    void response; // 使用变量避免 lint 错误

    const latency = Date.now() - startTime;
    await updateModelStatus(config.id, "active");

    return {
      success: true,
      latency,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await updateModelStatus(config.id, "error", errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export default {
  routeToModel,
  sendChatRequest,
  sendChatRequestStream,
  testModelConnection,
};
