/**
 * AI 模型配置服务
 * 管理模型配置的 CRUD 操作
 */
import { getDatabase } from "../database";
import type {
  ModelConfig,
  ModelConfigListItem,
  CreateModelConfigInput,
  UpdateModelConfigInput,
  ModelProvider,
  ModelConfigStatus,
  ModelUsageType,
} from "../types/model";
import {
  DEFAULT_MODEL_CONFIGS,
  DEFAULT_EMBEDDING_MODEL_CONFIGS,
} from "../types/model";

// 数据库行类型
interface ModelConfigRow {
  id: number;
  usage_type: string;
  provider: string;
  name: string;
  model_id: string;
  api_key: string | null;
  api_base_url: string | null;
  organization: string | null;
  host: string | null;
  enabled: number;
  is_default: number;
  priority: number;
  status: string;
  last_error: string | null;
  max_tokens: number | null;
  temperature: number | null;
  keep_alive: string | null;
  extra_params: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 将数据库行转换为模型配置对象
 */
function rowToModelConfig(row: ModelConfigRow): ModelConfig {
  const baseConfig = {
    id: row.id,
    usageType: (row.usage_type || "llm") as ModelUsageType,
    provider: row.provider as ModelProvider,
    name: row.name,
    modelId: row.model_id,
    enabled: row.enabled === 1,
    isDefault: row.is_default === 1,
    priority: row.priority,
    status: row.status as ModelConfigStatus,
    lastError: row.last_error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // 解析额外参数
  const extraParams = row.extra_params
    ? (JSON.parse(row.extra_params) as Record<string, unknown>)
    : undefined;

  if (row.provider === "ollama") {
    return {
      ...baseConfig,
      provider: "ollama",
      host: row.host || "http://127.0.0.1:11434",
      keepAlive: row.keep_alive || undefined,
      maxTokens: row.max_tokens || undefined,
      temperature: row.temperature || undefined,
      extraParams,
    };
  }

  return {
    ...baseConfig,
    provider: row.provider as "openai" | "bailian" | "zhipu" | "custom",
    apiKey: row.api_key || "",
    apiBaseUrl: row.api_base_url || undefined,
    organization: row.organization || undefined,
    maxTokens: row.max_tokens || undefined,
    temperature: row.temperature || undefined,
    extraParams,
  };
}

/**
 * 将模型配置转换为数据库行
 */
function modelConfigToRow(
  input: CreateModelConfigInput | UpdateModelConfigInput
): Partial<ModelConfigRow> {
  const row: Partial<ModelConfigRow> = {};

  if ("usageType" in input) row.usage_type = input.usageType;
  if ("provider" in input) row.provider = input.provider;
  if ("name" in input) row.name = input.name;
  if ("modelId" in input) row.model_id = input.modelId;
  if ("apiKey" in input) row.api_key = input.apiKey;
  if ("apiBaseUrl" in input) row.api_base_url = input.apiBaseUrl;
  if ("organization" in input) row.organization = input.organization;
  if ("host" in input) row.host = input.host;
  if ("enabled" in input) row.enabled = input.enabled ? 1 : 0;
  if ("isDefault" in input) row.is_default = input.isDefault ? 1 : 0;
  if ("priority" in input) row.priority = input.priority;
  if ("status" in input) row.status = input.status;
  if ("lastError" in input) row.last_error = input.lastError;
  if ("maxTokens" in input) row.max_tokens = input.maxTokens;
  if ("temperature" in input) row.temperature = input.temperature;
  if ("keepAlive" in input) row.keep_alive = input.keepAlive;
  if ("extraParams" in input)
    row.extra_params = JSON.stringify(input.extraParams);

  return row;
}

/**
 * 获取所有模型配置列表
 */
export function getModelConfigs(
  usageType?: ModelUsageType
): ModelConfigListItem[] {
  const db = getDatabase();
  let query = `SELECT id, usage_type, provider, name, model_id, enabled, is_default, priority, 
              status, last_error, created_at, updated_at
       FROM model_configs`;
  const params: string[] = [];

  if (usageType) {
    query += ` WHERE usage_type = ?`;
    params.push(usageType);
  }

  query += ` ORDER BY priority ASC, id ASC`;

  const rows = db.prepare(query).all(...params) as ModelConfigRow[];

  return rows.map((row) => ({
    id: row.id,
    usageType: (row.usage_type || "llm") as ModelUsageType,
    provider: row.provider as ModelProvider,
    name: row.name,
    modelId: row.model_id,
    enabled: row.enabled === 1,
    isDefault: row.is_default === 1,
    priority: row.priority,
    status: row.status as ModelConfigStatus,
    lastError: row.last_error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 获取单个模型配置（包含敏感信息）
 */
export function getModelConfigById(id: number): ModelConfig | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM model_configs WHERE id = ?").get(id) as
    | ModelConfigRow
    | undefined;

  return row ? rowToModelConfig(row) : null;
}

/**
 * 获取默认模型配置
 */
export function getDefaultModelConfig(
  usageType: ModelUsageType = "llm"
): ModelConfig | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT * FROM model_configs 
       WHERE is_default = 1 AND enabled = 1 AND usage_type = ?
       ORDER BY priority ASC 
       LIMIT 1`
    )
    .get(usageType) as ModelConfigRow | undefined;

  return row ? rowToModelConfig(row) : null;
}

/**
 * 获取启用的模型配置列表（按优先级排序）
 */
export function getEnabledModelConfigs(
  usageType?: ModelUsageType
): ModelConfig[] {
  const db = getDatabase();
  let query = `SELECT * FROM model_configs WHERE enabled = 1`;
  const params: string[] = [];

  if (usageType) {
    query += ` AND usage_type = ?`;
    params.push(usageType);
  }

  query += ` ORDER BY priority ASC, id ASC`;

  const rows = db.prepare(query).all(...params) as ModelConfigRow[];

  return rows.map(rowToModelConfig);
}

/**
 * 获取启用的嵌入模型配置列表
 */
export function getEnabledEmbeddingModelConfigs(): ModelConfig[] {
  return getEnabledModelConfigs("embedding");
}

/**
 * 获取默认嵌入模型配置
 */
export function getDefaultEmbeddingModelConfig(): ModelConfig | null {
  return getDefaultModelConfig("embedding");
}

/**
 * 创建模型配置
 */
export function createModelConfig(input: CreateModelConfigInput): ModelConfig {
  const db = getDatabase();
  const row = modelConfigToRow(input);

  // 如果设置为默认，先取消同类型的其他默认
  const usageType = input.usageType || "llm";
  if (input.isDefault) {
    db.prepare(
      "UPDATE model_configs SET is_default = 0 WHERE usage_type = ?"
    ).run(usageType);
  }

  const stmt = db.prepare(`
    INSERT INTO model_configs (
      usage_type, provider, name, model_id, api_key, api_base_url, organization,
      host, enabled, is_default, priority, status, max_tokens, 
      temperature, keep_alive, extra_params
    ) VALUES (
      @usage_type, @provider, @name, @model_id, @api_key, @api_base_url, @organization,
      @host, @enabled, @is_default, @priority, @status, @max_tokens,
      @temperature, @keep_alive, @extra_params
    )
  `);

  const result = stmt.run({
    usage_type: row.usage_type || "llm",
    provider: row.provider || "openai",
    name: row.name || "",
    model_id: row.model_id || "",
    api_key: row.api_key || null,
    api_base_url: row.api_base_url || null,
    organization: row.organization || null,
    host: row.host || null,
    enabled: row.enabled ?? 0,
    is_default: row.is_default ?? 0,
    priority: row.priority ?? 10,
    // 如果有 API Key（在线模型）或 host（Ollama），则标记为 active
    status: row.status || (row.api_key || row.host ? "active" : "inactive"),
    max_tokens: row.max_tokens || null,
    temperature: row.temperature || null,
    keep_alive: row.keep_alive || null,
    extra_params: row.extra_params || null,
  });

  return getModelConfigById(result.lastInsertRowid as number)!;
}

/**
 * 更新模型配置
 */
export function updateModelConfig(
  id: number,
  input: UpdateModelConfigInput
): ModelConfig | null {
  const db = getDatabase();
  const existing = getModelConfigById(id);

  if (!existing) {
    return null;
  }

  // 如果设置为默认，先取消同类型的其他默认
  if (input.isDefault) {
    const usageType = existing.usageType;
    db.prepare(
      "UPDATE model_configs SET is_default = 0 WHERE usage_type = ?"
    ).run(usageType);
  }

  const row = modelConfigToRow(input);
  const updates: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(row)) {
    updates.push(`${key} = @${key}`);
    values[key] = value;
  }

  updates.push("updated_at = datetime('now', 'localtime')");

  if (updates.length > 1) {
    db.prepare(
      `UPDATE model_configs SET ${updates.join(", ")} WHERE id = @id`
    ).run(values);
  }

  return getModelConfigById(id);
}

/**
 * 删除模型配置
 */
export function deleteModelConfig(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare("DELETE FROM model_configs WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * 设置默认模型
 */
export function setDefaultModelConfig(id: number): boolean {
  const db = getDatabase();
  const config = getModelConfigById(id);

  if (!config) {
    return false;
  }

  const usageType = config.usageType;

  // 使用事务确保原子性
  const transaction = db.transaction(() => {
    // 取消同类型的所有默认
    db.prepare(
      "UPDATE model_configs SET is_default = 0 WHERE usage_type = ?"
    ).run(usageType);
    // 设置指定模型为默认
    db.prepare(
      "UPDATE model_configs SET is_default = 1, enabled = 1 WHERE id = ?"
    ).run(id);
  });

  transaction();
  return true;
}

/**
 * 更新模型状态
 */
export function updateModelStatus(
  id: number,
  status: ModelConfigStatus,
  lastError?: string
): void {
  const db = getDatabase();
  db.prepare(
    `UPDATE model_configs 
     SET status = ?, last_error = ?, updated_at = datetime('now', 'localtime') 
     WHERE id = ?`
  ).run(status, lastError || null, id);
}

/**
 * 初始化默认模型配置
 */
export function initializeDefaultConfigs(): void {
  const db = getDatabase();
  const count = db
    .prepare("SELECT COUNT(*) as count FROM model_configs")
    .get() as {
    count: number;
  };

  if (count.count > 0) {
    return;
  }

  // 导入默认 LLM 配置
  for (const config of DEFAULT_MODEL_CONFIGS) {
    createModelConfig(config as CreateModelConfigInput);
  }

  // 导入默认嵌入模型配置
  for (const config of DEFAULT_EMBEDDING_MODEL_CONFIGS) {
    createModelConfig(config as CreateModelConfigInput);
  }
}

export default {
  getModelConfigs,
  getModelConfigById,
  getDefaultModelConfig,
  getEnabledModelConfigs,
  getEnabledEmbeddingModelConfigs,
  getDefaultEmbeddingModelConfig,
  createModelConfig,
  updateModelConfig,
  deleteModelConfig,
  setDefaultModelConfig,
  updateModelStatus,
  initializeDefaultConfigs,
};
