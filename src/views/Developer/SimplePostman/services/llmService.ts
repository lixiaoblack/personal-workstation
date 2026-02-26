/**
 * LLM 服务模块
 * 封装 LLM API 调用逻辑
 */

import type { ModelConfig } from "@/types/electron";

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
 * 只调用 Python API，失败不重试
 */
export async function callLlm(
  modelConfig: ModelConfig,
  messages: ChatMessage[]
): Promise<LLMResponse> {
  // 只使用 Python API
  if (modelConfig.id) {
    return callPythonLlmApi(messages, modelConfig.id);
  }

  return {
    success: false,
    error: "模型配置无效，缺少模型 ID",
  };
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
    ]
  );

  // 提取纯 TypeScript 代码
  if (result.success && result.content) {
    result.content = extractTypeScriptFromMarkdown(result.content);
  }

  return result;
}
