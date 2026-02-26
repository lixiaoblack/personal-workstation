/**
 * LLM 服务模块
 * 封装 LLM API 调用逻辑，支持多种模型提供商
 */

import type { ModelConfig } from "@/types/electron";

// 默认 API URLs
const DEFAULT_API_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  bailian: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
};

// LLM 响应接口
export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// 消息接口
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 从 Markdown 文本中提取 TypeScript 代码
 * 支持 ```typescript 和 ```ts 代码块
 */
export function extractTypeScriptFromMarkdown(text: string): string {
  // 匹配 ```typescript 或 ```ts 代码块
  const tsCodeBlockRegex = /```(?:typescript|ts)\s*\n([\s\S]*?)```/g;
  const matches = [...text.matchAll(tsCodeBlockRegex)];

  if (matches.length > 0) {
    // 合并所有代码块
    return matches.map((m) => m[1].trim()).join("\n\n");
  }

  // 如果没有代码块标记，检查是否整个内容就是代码
  const trimmedText = text.trim();

  // 如果内容以 interface、type、export 等开头，说明是纯代码
  if (
    /^(export\s+)?(interface|type|class|enum|const|let|var)\s+/m.test(trimmedText)
  ) {
    return trimmedText;
  }

  // 尝试匹配任意代码块
  const anyCodeBlockRegex = /```\s*\n([\s\S]*?)```/g;
  const anyMatches = [...trimmedText.matchAll(anyCodeBlockRegex)];

  if (anyMatches.length > 0) {
    return anyMatches.map((m) => m[1].trim()).join("\n\n");
  }

  // 返回原始内容
  return trimmedText;
}

/**
 * 调用 Ollama API
 */
async function callOllamaApi(
  host: string,
  modelId: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  try {
    const response = await fetch(`${host || "http://127.0.0.1:11434"}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.3,
          num_predict: options?.maxTokens ?? 4096,
        },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Ollama API 请求失败: ${response.status}`,
      };
    }

    const result = await response.json();
    if (result.message?.content) {
      return {
        success: true,
        content: result.message.content,
      };
    }

    return {
      success: false,
      error: "Ollama 响应格式错误",
    };
  } catch (error) {
    return {
      success: false,
      error: `Ollama 调用失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}

/**
 * 调用 OpenAI 兼容 API
 */
async function callOpenAiCompatibleApi(
  apiBaseUrl: string,
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  try {
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API 请求失败: ${response.status}`,
      };
    }

    const result = await response.json();
    if (result.choices?.[0]?.message?.content) {
      return {
        success: true,
        content: result.choices[0].message.content,
      };
    }

    return {
      success: false,
      error: "API 响应格式错误",
    };
  } catch (error) {
    return {
      success: false,
      error: `API 调用失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}

/**
 * 调用 Python 服务的 LLM API
 */
async function callPythonLlmApi(
  messages: ChatMessage[],
  modelId: number
): Promise<LLMResponse> {
  try {
    const response = await fetch("http://127.0.0.1:8766/api/llm/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        model_id: modelId,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Python API 不可用",
      };
    }

    const result = await response.json();
    if (result.success && result.content) {
      return {
        success: true,
        content: result.content,
      };
    }

    return {
      success: false,
      error: result.error || "生成失败",
    };
  } catch (error) {
    return {
      success: false,
      error: "Python API 连接失败",
    };
  }
}

/**
 * 使用模型配置调用 LLM
 * 优先尝试 Python API，失败后使用备用方案直接调用模型 API
 */
export async function callLlm(
  modelConfig: ModelConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  // 首先尝试 Python API
  if (modelConfig.id) {
    const pythonResult = await callPythonLlmApi(messages, modelConfig.id);
    if (pythonResult.success) {
      return pythonResult;
    }
    console.log("[LLM Service] Python API 不可用，使用备用方案");
  }

  // 备用方案：直接调用模型 API
  if (modelConfig.provider === "ollama") {
    const ollamaConfig = modelConfig as ModelConfig & { host?: string };
    return callOllamaApi(
      ollamaConfig.host || "http://127.0.0.1:11434",
      modelConfig.modelId,
      messages,
      options
    );
  }

  // OpenAI 兼容 API
  const onlineConfig = modelConfig as ModelConfig & {
    apiBaseUrl?: string;
    apiKey?: string;
  };

  const apiBaseUrl =
    onlineConfig.apiBaseUrl || DEFAULT_API_URLS[modelConfig.provider] || "";
  const apiKey = onlineConfig.apiKey;

  if (!apiKey) {
    return {
      success: false,
      error: "模型未配置 API Key",
    };
  }

  return callOpenAiCompatibleApi(
    apiBaseUrl,
    apiKey,
    modelConfig.modelId,
    messages,
    options
  );
}

/**
 * 生成 TypeScript 类型定义
 */
export async function generateTypeScriptTypes(
  modelConfig: ModelConfig,
  jsonData: string
): Promise<LLMResponse> {
  const systemPrompt = `你是一个专业的 TypeScript 类型定义专家。根据用户提供的 JSON 数据，生成完整的 TypeScript 类型定义。

要求：
1. 分析 JSON 结构，生成合适的 interface 或 type 定义
2. 如果有嵌套对象，需要为嵌套对象也生成类型定义
3. 属性名使用 PascalCase 命名
4. 为每个属性添加注释说明其类型和用途
5. 根据属性值推断合适的类型（string、number、boolean、数组等）
6. 如果数组元素是对象，为元素生成单独的类型定义
7. 只输出 TypeScript 类型定义代码，不要输出其他说明文字
8. 使用 export 导出所有类型
9. 不要使用 markdown 代码块包裹，直接输出纯代码`;

  const userPrompt = `请根据以下 JSON 数据生成 TypeScript 类型定义：

\`\`\`json
${jsonData}
\`\`\`

请生成完整的 TypeScript 类型定义：`;

  const result = await callLlm(
    modelConfig,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 4096 }
  );

  // 提取纯 TypeScript 代码
  if (result.success && result.content) {
    result.content = extractTypeScriptFromMarkdown(result.content);
  }

  return result;
}
