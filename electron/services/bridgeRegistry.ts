/**
 * 前端桥接服务注册表
 *
 * 定义所有可被 Agent 调用的 Electron 服务方法。
 * 每个方法都包含完整的参数说明、返回值类型和示例。
 *
 * 使用方式：
 * 1. Agent 通过 frontend_bridge 工具调用
 * 2. Python 发送请求到 Electron
 * 3. Electron 根据注册表查找并执行方法
 */

import type { BridgeMethod, BridgeMethodParam } from "../types/websocket";

// ==================== 服务导入 ====================
import * as knowledgeService from "./knowledgeService";
import * as conversationService from "./conversationService";
import * as memoryService from "./memoryService";
import * as userService from "./userService";

// ==================== 参数定义工具函数 ====================

function param(
  name: string,
  type: BridgeMethodParam["type"],
  required: boolean,
  description: string,
  defaultValue?: unknown
): BridgeMethodParam {
  const p: BridgeMethodParam = { name, type, required, description };
  if (defaultValue !== undefined) {
    p.default = defaultValue;
  }
  return p;
}

// ==================== 方法注册表 ====================

/**
 * 所有可被 Agent 调用的方法
 *
 * 命名规范：service.method
 * - service: 服务名称，对应文件名（不含 Service 后缀）
 * - method: 方法名称
 */
export const BRIDGE_METHODS: BridgeMethod[] = [
  // ==================== 知识库服务 ====================
  {
    service: "knowledgeService",
    method: "createKnowledge",
    description: "创建一个新的知识库，用于存储文档和网页内容",
    params: [
      param("name", "string", true, "知识库名称，如 '前端技术栈'、'服务器配置'"),
      param("description", "string", false, "知识库描述信息"),
      param("embeddingModel", "string", false, "嵌入模型类型：'ollama' 或 'openai'", "ollama"),
      param("embeddingModelName", "string", false, "嵌入模型名称", "nomic-embed-text"),
    ],
    returns: "KnowledgeInfo 对象，包含 id、name、documentCount 等字段",
    example: '{"name": "前端文档", "description": "前端技术文档合集"}',
  },
  {
    service: "knowledgeService",
    method: "deleteKnowledge",
    description: "删除指定知识库及其所有文档",
    params: [param("knowledgeId", "string", true, "要删除的知识库 ID")],
    returns: "boolean，表示是否删除成功",
    example: '{"knowledgeId": "kb_abc123"}',
  },
  {
    service: "knowledgeService",
    method: "listKnowledge",
    description: "获取所有知识库列表",
    params: [],
    returns: "KnowledgeInfo[] 数组，包含所有知识库信息",
    example: "{}",
  },
  {
    service: "knowledgeService",
    method: "getKnowledge",
    description: "获取指定知识库的详细信息",
    params: [param("knowledgeId", "string", true, "知识库 ID")],
    returns: "KnowledgeInfo 对象或 null",
    example: '{"knowledgeId": "kb_abc123"}',
  },
  {
    service: "knowledgeService",
    method: "updateKnowledge",
    description: "更新知识库的名称或描述",
    params: [
      param("knowledgeId", "string", true, "知识库 ID"),
      param("data", "object", true, "要更新的字段对象，包含 name 和/或 description"),
    ],
    returns: "更新后的 KnowledgeInfo 对象或 null",
    example: '{"knowledgeId": "kb_abc123", "data": {"name": "更新后的名称"}}',
  },
  {
    service: "knowledgeService",
    method: "listDocuments",
    description: "获取知识库中的所有文档列表",
    params: [param("knowledgeId", "string", true, "知识库 ID")],
    returns: "KnowledgeDocumentInfo[] 数组",
    example: '{"knowledgeId": "kb_abc123"}',
  },

  // ==================== 对话服务 ====================
  {
    service: "conversationService",
    method: "createConversation",
    description: "创建一个新的对话",
    params: [
      param("title", "string", false, "对话标题"),
      param("modelId", "number", false, "模型配置 ID"),
      param("modelName", "string", false, "模型名称"),
    ],
    returns: "Conversation 对象，包含 id、title、messageCount 等字段",
    example: '{"title": "新对话", "modelName": "gpt-4"}',
  },
  {
    service: "conversationService",
    method: "deleteConversation",
    description: "删除指定对话及其所有消息",
    params: [param("id", "number", true, "对话 ID")],
    returns: "boolean，表示是否删除成功",
    example: '{"id": 1}',
  },
  {
    service: "conversationService",
    method: "getConversationList",
    description: "获取所有对话列表",
    params: [],
    returns: "ConversationListItem[] 数组",
    example: "{}",
  },
  {
    service: "conversationService",
    method: "getConversationById",
    description: "获取对话详情，包含所有消息",
    params: [param("id", "number", true, "对话 ID")],
    returns: "Conversation 对象（包含 messages）或 null",
    example: '{"id": 1}',
  },
  {
    service: "conversationService",
    method: "updateConversationTitle",
    description: "更新对话标题",
    params: [
      param("id", "number", true, "对话 ID"),
      param("title", "string", true, "新标题"),
    ],
    returns: "boolean，表示是否更新成功",
    example: '{"id": 1, "title": "新标题"}',
  },

  // ==================== 记忆服务 ====================
  {
    service: "memoryService",
    method: "saveMemory",
    description: "保存用户记忆，用于长期存储用户偏好、项目信息等",
    params: [
      param("memoryType", "string", true, "记忆类型：'preference'（偏好）、'project'（项目）、'task'（任务）、'fact'（事实）、'context'（上下文）"),
      param("memoryKey", "string", true, "记忆键名，如 'preferred_language'、'current_project'"),
      param("memoryValue", "string", true, "记忆值"),
      param("sourceConversationId", "number", false, "来源对话 ID"),
      param("confidence", "number", false, "置信度 (0-1)", 1.0),
    ],
    returns: "UserMemory 对象",
    example: '{"memoryType": "preference", "memoryKey": "preferred_framework", "memoryValue": "React"}',
  },
  {
    service: "memoryService",
    method: "getAllMemories",
    description: "获取所有用户记忆",
    params: [],
    returns: "UserMemory[] 数组",
    example: "{}",
  },
  {
    service: "memoryService",
    method: "getMemoriesByType",
    description: "按类型获取用户记忆",
    params: [param("memoryType", "string", true, "记忆类型")],
    returns: "UserMemory[] 数组",
    example: '{"memoryType": "preference"}',
  },
  {
    service: "memoryService",
    method: "deleteMemory",
    description: "删除指定记忆",
    params: [param("memoryId", "number", true, "记忆 ID")],
    returns: "boolean，表示是否删除成功",
    example: '{"memoryId": 1}',
  },
  {
    service: "memoryService",
    method: "buildMemoryContext",
    description: "构建记忆上下文，用于增强对话",
    params: [],
    returns: "MemoryContext 对象，包含 memories、summaries、contextPrompt",
    example: "{}",
  },

  // ==================== 用户服务 ====================
  {
    service: "userService",
    method: "getCurrentUser",
    description: "获取当前登录用户信息",
    params: [param("userId", "number", true, "用户 ID")],
    returns: "User 对象或 null",
    example: '{"userId": 1}',
  },
  {
    service: "userService",
    method: "updateProfile",
    description: "更新用户资料",
    params: [
      param("userId", "number", true, "用户 ID"),
      param("data", "object", true, "要更新的字段对象，包含 nickname、bio 等字段"),
    ],
    returns: "更新后的 User 对象或 null",
    example: '{"userId": 1, "data": {"nickname": "新昵称"}}',
  },
];

// ==================== 方法执行器 ====================

/**
 * 服务方法映射表
 */
const SERVICE_MAP: Record<string, Record<string, (...args: unknown[]) => unknown>> = {
  knowledgeService: knowledgeService as unknown as Record<string, (...args: unknown[]) => unknown>,
  conversationService: conversationService as unknown as Record<string, (...args: unknown[]) => unknown>,
  memoryService: memoryService as unknown as Record<string, (...args: unknown[]) => unknown>,
  userService: userService as unknown as Record<string, (...args: unknown[]) => unknown>,
};

/**
 * 执行桥接方法
 *
 * @param service 服务名称
 * @param method 方法名称
 * @param params 参数对象
 * @returns 执行结果
 */
export async function executeBridgeMethod(
  service: string,
  method: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  // 检查服务是否存在
  const serviceMethods = SERVICE_MAP[service];
  if (!serviceMethods) {
    return {
      success: false,
      error: `服务 '${service}' 不存在。可用服务: ${Object.keys(SERVICE_MAP).join(", ")}`,
    };
  }

  // 检查方法是否存在
  const methodFn = serviceMethods[method];
  if (!methodFn || typeof methodFn !== "function") {
    const availableMethods = Object.keys(serviceMethods).filter(
      (k) => typeof serviceMethods[k] === "function"
    );
    return {
      success: false,
      error: `方法 '${service}.${method}' 不存在。可用方法: ${availableMethods.join(", ")}`,
    };
  }

  // 验证方法是否在注册表中（安全检查）
  const methodDef = BRIDGE_METHODS.find(
    (m) => m.service === service && m.method === method
  );
  if (!methodDef) {
    return {
      success: false,
      error: `方法 '${service}.${method}' 未在桥接注册表中注册，禁止调用`,
    };
  }

  try {
    // 根据方法定义转换参数
    const args = transformParams(methodDef, params);

    // 执行方法
    const result = await Promise.resolve(methodFn(...args));

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error(`[BridgeRegistry] 执行 ${service}.${method} 失败:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 根据方法定义转换参数
 *
 * 将对象参数转换为函数调用参数数组
 */
function transformParams(
  methodDef: BridgeMethod,
  params: Record<string, unknown>
): unknown[] {
  // 如果方法没有参数，返回空数组
  if (methodDef.params.length === 0) {
    return [];
  }

  // 特殊处理：某些方法需要将参数打包为对象
  const objectParamMethods = ["updateKnowledge", "updateProfile"];

  if (objectParamMethods.includes(methodDef.method)) {
    // 这些方法需要特定的参数结构
    switch (methodDef.method) {
      case "updateKnowledge":
        return [params.knowledgeId as string, params.data as Record<string, unknown>];
      case "updateProfile":
        return [params.userId as number, params.data as Record<string, unknown>];
    }
  }

  // 通用处理：按参数定义顺序提取参数值
  return methodDef.params.map((p) => {
    const value = params[p.name];
    if (value === undefined && p.default !== undefined) {
      return p.default;
    }
    return value;
  });
}

/**
 * 获取可用方法列表
 *
 * @param service 可选，筛选指定服务的方法
 */
export function getBridgeMethods(service?: string): BridgeMethod[] {
  if (service) {
    return BRIDGE_METHODS.filter((m) => m.service === service);
  }
  return BRIDGE_METHODS;
}

/**
 * 获取方法定义
 */
export function getBridgeMethod(service: string, method: string): BridgeMethod | undefined {
  return BRIDGE_METHODS.find((m) => m.service === service && m.method === method);
}

/**
 * 生成方法描述（用于 Agent 提示）
 */
export function generateMethodDescription(method: BridgeMethod): string {
  const paramsDesc = method.params.length > 0
    ? method.params
        .map((p) => {
          const req = p.required ? "必填" : "可选";
          const def = p.default !== undefined ? `，默认: ${JSON.stringify(p.default)}` : "";
          return `  - ${p.name} (${p.type}, ${req}): ${p.description}${def}`;
        })
        .join("\n")
    : "  无参数";

  const example = method.example ? `\n示例参数: ${method.example}` : "";

  return `### ${method.service}.${method.method}

${method.description}

参数:
${paramsDesc}

返回: ${method.method}${example}`;
}

/**
 * 生成所有方法的 Agent 提示
 */
export function generateBridgePrompt(): string {
  const methods = BRIDGE_METHODS.map(generateMethodDescription).join("\n\n---\n\n");

  return `# 前端服务桥接工具

你可以通过 \`frontend_bridge\` 工具调用 Electron 前端的服务方法。
以下是所有可用的方法：

---

${methods}

## 使用说明

1. 调用格式: \`frontend_bridge(service="xxx", method="xxx", params={...})\`
2. 参数必须是 JSON 格式的对象
3. 方法执行后会返回结果或错误信息
`;
}

export default {
  BRIDGE_METHODS,
  executeBridgeMethod,
  getBridgeMethods,
  getBridgeMethod,
  generateBridgePrompt,
};
