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
    /^(export\s+)?(interface|type|class|enum|const|let|var)\s+/m.test(
      trimmedText
    )
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
 * 从 Markdown 文本中提取纯 Markdown 内容
 * 移除多余的代码块包裹
 */
export function extractMarkdownContent(text: string): string {
  const trimmedText = text.trim();

  // 如果整个内容被 ```markdown 包裹
  const mdCodeBlockRegex = /```markdown\s*\n([\s\S]*?)```/g;
  const matches = [...trimmedText.matchAll(mdCodeBlockRegex)];

  if (matches.length > 0) {
    return matches.map((m) => m[1].trim()).join("\n\n");
  }

  return trimmedText;
}

/**
 * API 文档输入数据
 */
export interface ApiDocInput {
  method: string;
  url: string;
  name?: string;
  description?: string;
  params?: Array<{ key: string; value: string; description?: string }>;
  headers?: Array<{ key: string; value: string; description?: string }>;
  requestBody?: string;
  responseBody?: string;
  responseStatus?: number;
}

/**
 * 生成 API 文档
 */
export async function generateApiDoc(
  modelConfig: ModelConfig,
  apiData: ApiDocInput
): Promise<LLMResponse> {
  const systemPrompt = `你是一个专业的 API 文档编写专家。根据用户提供的 API 请求和响应信息，生成清晰、完整的 Markdown 格式 API 文档。

要求：
1. 使用 Markdown 格式，结构清晰
2. 包含以下部分：
   - 接口名称和描述
   - 请求方法和 URL
   - 请求参数说明（Query/Path/Body）
   - 请求头说明
   - 响应结构说明
   - 请求示例（使用 curl 或 HTTP 格式）
   - 响应示例
   - 错误码说明（如果有）
3. 参数说明要包含：参数名、类型、是否必填、说明
4. 响应字段要包含：字段名、类型、说明
5. 使用表格展示参数和字段信息
6. 语言使用中文`;

  // 构建用户输入
  const parts: string[] = [];

  parts.push(`## API 信息`);
  parts.push(`- **方法**: ${apiData.method}`);
  parts.push(`- **URL**: ${apiData.url}`);
  if (apiData.name) parts.push(`- **名称**: ${apiData.name}`);
  if (apiData.description) parts.push(`- **描述**: ${apiData.description}`);

  if (apiData.params && apiData.params.length > 0) {
    parts.push(`\n## 请求参数`);
    apiData.params.forEach((p) => {
      parts.push(
        `- ${p.key}: ${p.value}${p.description ? ` (${p.description})` : ""}`
      );
    });
  }

  if (apiData.headers && apiData.headers.length > 0) {
    parts.push(`\n## 请求头`);
    apiData.headers.forEach((h) => {
      parts.push(
        `- ${h.key}: ${h.value}${h.description ? ` (${h.description})` : ""}`
      );
    });
  }

  if (apiData.requestBody) {
    parts.push(`\n## 请求体`);
    parts.push("```json");
    parts.push(apiData.requestBody);
    parts.push("```");
  }

  if (apiData.responseBody) {
    parts.push(`\n## 响应体 (状态码: ${apiData.responseStatus || "N/A"})`);
    parts.push("```json");
    parts.push(apiData.responseBody);
    parts.push("```");
  }

  const userPrompt = `请根据以下 API 信息生成完整的 API 文档：

${parts.join("\n")}

请生成 Markdown 格式的 API 文档：`;

  const result = await callLlm(modelConfig, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  // 提取纯 Markdown 内容
  if (result.success && result.content) {
    result.content = extractMarkdownContent(result.content);
  }

  return result;
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

  const result = await callLlm(modelConfig, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  // 提取纯 TypeScript 代码
  if (result.success && result.content) {
    result.content = extractTypeScriptFromMarkdown(result.content);
  }

  return result;
}
