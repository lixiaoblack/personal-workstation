/**
 * SimplePostman 数据持久化服务
 *
 * 直接使用 better-sqlite3 进行 CRUD 操作
 */
import { getDatabase } from "../database";
import type { RunResult } from "better-sqlite3";

// ==================== 类型定义 ====================

export interface PostmanProject {
  id: number;
  name: string;
  description?: string;
  baseUrl?: string;
  swaggerUrl?: string;
  authConfig?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface PostmanGroup {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  baseUrl?: string;
  authConfig?: Record<string, unknown>;
  overrideGlobal: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface PostmanRequest {
  id: number;
  groupId?: number;
  projectId: number;
  name?: string;
  method: string;
  url: string;
  params?: PostmanRequestParam[];
  headers?: PostmanRequestHeader[];
  bodyType: string;
  body?: string;
  authType: string;
  authConfig?: Record<string, unknown>;
  swaggerInfo?: Record<string, unknown>;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface PostmanRequestParam {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export interface PostmanRequestHeader {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

export interface PostmanHistory {
  id: number;
  requestId?: number;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseStatus: number;
  responseStatusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTime: number;
  responseSize: number;
  createdAt: number;
}

export interface PostmanSetting {
  id: number;
  key: string;
  value: Record<string, unknown>;
  updatedAt: number;
}

// ==================== 项目操作 ====================

/**
 * 获取所有项目
 */
export function getProjects(): PostmanProject[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, name, description, base_url, swagger_url, auth_config, created_at, updated_at
       FROM postman_projects
       ORDER BY updated_at DESC`
    )
    .all() as Array<{
    id: number;
    name: string;
    description: string | null;
    base_url: string | null;
    swagger_url: string | null;
    auth_config: string | null;
    created_at: number;
    updated_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    baseUrl: row.base_url || undefined,
    swaggerUrl: row.swagger_url || undefined,
    authConfig: row.auth_config ? JSON.parse(row.auth_config) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 根据 ID 获取项目
 */
export function getProjectById(id: number): PostmanProject | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, name, description, base_url, swagger_url, auth_config, created_at, updated_at
       FROM postman_projects
       WHERE id = ?`
    )
    .get(id) as
    | {
        id: number;
        name: string;
        description: string | null;
        base_url: string | null;
        swagger_url: string | null;
        auth_config: string | null;
        created_at: number;
        updated_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    baseUrl: row.base_url || undefined,
    swaggerUrl: row.swagger_url || undefined,
    authConfig: row.auth_config ? JSON.parse(row.auth_config) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 创建项目
 */
export function createProject(input: {
  name: string;
  description?: string;
  baseUrl?: string;
  swaggerUrl?: string;
  authConfig?: Record<string, unknown>;
}): PostmanProject {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO postman_projects (name, description, base_url, swagger_url, auth_config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.description || null,
      input.baseUrl || null,
      input.swaggerUrl || null,
      input.authConfig ? JSON.stringify(input.authConfig) : null,
      now,
      now
    ) as RunResult;

  return {
    id: result.lastInsertRowid as number,
    name: input.name,
    description: input.description,
    baseUrl: input.baseUrl,
    swaggerUrl: input.swaggerUrl,
    authConfig: input.authConfig,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 更新项目
 */
export function updateProject(
  id: number,
  input: {
    name?: string;
    description?: string;
    baseUrl?: string;
    swaggerUrl?: string;
    authConfig?: Record<string, unknown>;
  }
): PostmanProject | null {
  const db = getDatabase();
  const now = Date.now();

  const existing = getProjectById(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE postman_projects
     SET name = ?, description = ?, base_url = ?, swagger_url = ?, auth_config = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.name ?? existing.name,
    input.description ?? existing.description ?? null,
    input.baseUrl ?? existing.baseUrl ?? null,
    input.swaggerUrl ?? existing.swaggerUrl ?? null,
    input.authConfig
      ? JSON.stringify(input.authConfig)
      : existing.authConfig
        ? JSON.stringify(existing.authConfig)
        : null,
    now,
    id
  );

  return getProjectById(id);
}

/**
 * 删除项目（会级联删除分组和请求）
 */
export function deleteProject(id: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM postman_projects WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

// ==================== 分组操作 ====================

/**
 * 获取项目的所有分组
 */
export function getGroupsByProjectId(projectId: number): PostmanGroup[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, project_id, name, description, base_url, auth_config, override_global, sort_order, created_at, updated_at
       FROM postman_groups
       WHERE project_id = ?
       ORDER BY sort_order, created_at`
    )
    .all(projectId) as Array<{
    id: number;
    project_id: number;
    name: string;
    description: string | null;
    base_url: string | null;
    auth_config: string | null;
    override_global: number;
    sort_order: number;
    created_at: number;
    updated_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    baseUrl: row.base_url || undefined,
    authConfig: row.auth_config ? JSON.parse(row.auth_config) : undefined,
    overrideGlobal: row.override_global === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 创建分组
 */
export function createGroup(input: {
  projectId: number;
  name: string;
  description?: string;
  baseUrl?: string;
  authConfig?: Record<string, unknown>;
  overrideGlobal?: boolean;
  sortOrder?: number;
}): PostmanGroup {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO postman_groups (project_id, name, description, base_url, auth_config, override_global, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.projectId,
      input.name,
      input.description || null,
      input.baseUrl || null,
      input.authConfig ? JSON.stringify(input.authConfig) : null,
      input.overrideGlobal ? 1 : 0,
      input.sortOrder || 0,
      now,
      now
    ) as RunResult;

  return {
    id: result.lastInsertRowid as number,
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    baseUrl: input.baseUrl,
    authConfig: input.authConfig,
    overrideGlobal: input.overrideGlobal || false,
    sortOrder: input.sortOrder || 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 更新分组
 */
export function updateGroup(
  id: number,
  input: {
    name?: string;
    description?: string;
    baseUrl?: string;
    authConfig?: Record<string, unknown>;
    overrideGlobal?: boolean;
    sortOrder?: number;
  }
): PostmanGroup | null {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(
    `UPDATE postman_groups
     SET name = COALESCE(?, name),
         description = COALESCE(?, description),
         base_url = COALESCE(?, base_url),
         auth_config = COALESCE(?, auth_config),
         override_global = COALESCE(?, override_global),
         sort_order = COALESCE(?, sort_order),
         updated_at = ?
     WHERE id = ?`
  );

  stmt.run(
    input.name ?? null,
    input.description ?? null,
    input.baseUrl ?? null,
    input.authConfig ? JSON.stringify(input.authConfig) : null,
    input.overrideGlobal !== undefined ? (input.overrideGlobal ? 1 : 0) : null,
    input.sortOrder ?? null,
    now,
    id
  );

  const row = db
    .prepare(
      `SELECT id, project_id, name, description, base_url, auth_config, override_global, sort_order, created_at, updated_at
       FROM postman_groups WHERE id = ?`
    )
    .get(id) as
    | {
        id: number;
        project_id: number;
        name: string;
        description: string | null;
        base_url: string | null;
        auth_config: string | null;
        override_global: number;
        sort_order: number;
        created_at: number;
        updated_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    baseUrl: row.base_url || undefined,
    authConfig: row.auth_config ? JSON.parse(row.auth_config) : undefined,
    overrideGlobal: row.override_global === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 删除分组
 */
export function deleteGroup(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare("DELETE FROM postman_groups WHERE id = ?").run(id);
  return result.changes > 0;
}

// ==================== 请求操作 ====================

/**
 * 获取项目的所有请求
 */
export function getRequestsByProjectId(projectId: number): PostmanRequest[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, group_id, project_id, name, method, url, params, headers, body_type, body, auth_type, auth_config, swagger_info, is_favorite, sort_order, created_at, updated_at
       FROM postman_requests
       WHERE project_id = ?
       ORDER BY sort_order, created_at`
    )
    .all(projectId) as Array<{
    id: number;
    group_id: number | null;
    project_id: number;
    name: string | null;
    method: string;
    url: string;
    params: string | null;
    headers: string | null;
    body_type: string;
    body: string | null;
    auth_type: string;
    auth_config: string | null;
    swagger_info: string | null;
    is_favorite: number;
    sort_order: number;
    created_at: number;
    updated_at: number;
  }>;

  return rows.map(transformRequestRow);
}

/**
 * 获取分组的所有请求
 */
export function getRequestsByGroupId(groupId: number): PostmanRequest[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, group_id, project_id, name, method, url, params, headers, body_type, body, auth_type, auth_config, swagger_info, is_favorite, sort_order, created_at, updated_at
       FROM postman_requests
       WHERE group_id = ?
       ORDER BY sort_order, created_at`
    )
    .all(groupId) as Array<{
    id: number;
    group_id: number | null;
    project_id: number;
    name: string | null;
    method: string;
    url: string;
    params: string | null;
    headers: string | null;
    body_type: string;
    body: string | null;
    auth_type: string;
    auth_config: string | null;
    swagger_info: string | null;
    is_favorite: number;
    sort_order: number;
    created_at: number;
    updated_at: number;
  }>;

  return rows.map(transformRequestRow);
}

/**
 * 根据 ID 获取请求
 */
export function getRequestById(id: number): PostmanRequest | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, group_id, project_id, name, method, url, params, headers, body_type, body, auth_type, auth_config, swagger_info, is_favorite, sort_order, created_at, updated_at
       FROM postman_requests
       WHERE id = ?`
    )
    .get(id) as
    | {
        id: number;
        group_id: number | null;
        project_id: number;
        name: string | null;
        method: string;
        url: string;
        params: string | null;
        headers: string | null;
        body_type: string;
        body: string | null;
        auth_type: string;
        auth_config: string | null;
        swagger_info: string | null;
        is_favorite: number;
        sort_order: number;
        created_at: number;
        updated_at: number;
      }
    | undefined;

  if (!row) return null;
  return transformRequestRow(row);
}

/**
 * 创建请求
 */
export function createRequest(input: {
  groupId?: number;
  projectId: number;
  name?: string;
  method: string;
  url: string;
  params?: PostmanRequestParam[];
  headers?: PostmanRequestHeader[];
  bodyType?: string;
  body?: string;
  authType?: string;
  authConfig?: Record<string, unknown>;
  swaggerInfo?: Record<string, unknown>;
  isFavorite?: boolean;
  sortOrder?: number;
}): PostmanRequest {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO postman_requests (group_id, project_id, name, method, url, params, headers, body_type, body, auth_type, auth_config, swagger_info, is_favorite, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.groupId || null,
      input.projectId,
      input.name || null,
      input.method,
      input.url,
      input.params ? JSON.stringify(input.params) : null,
      input.headers ? JSON.stringify(input.headers) : null,
      input.bodyType || "json",
      input.body || null,
      input.authType || "none",
      input.authConfig ? JSON.stringify(input.authConfig) : null,
      input.swaggerInfo ? JSON.stringify(input.swaggerInfo) : null,
      input.isFavorite ? 1 : 0,
      input.sortOrder || 0,
      now,
      now
    ) as RunResult;

  return {
    id: result.lastInsertRowid as number,
    groupId: input.groupId,
    projectId: input.projectId,
    name: input.name,
    method: input.method,
    url: input.url,
    params: input.params,
    headers: input.headers,
    bodyType: input.bodyType || "json",
    body: input.body,
    authType: input.authType || "none",
    authConfig: input.authConfig,
    swaggerInfo: input.swaggerInfo,
    isFavorite: input.isFavorite || false,
    sortOrder: input.sortOrder || 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 更新请求
 */
export function updateRequest(
  id: number,
  input: {
    groupId?: number;
    name?: string;
    method?: string;
    url?: string;
    params?: PostmanRequestParam[];
    headers?: PostmanRequestHeader[];
    bodyType?: string;
    body?: string;
    authType?: string;
    authConfig?: Record<string, unknown>;
    swaggerInfo?: Record<string, unknown>;
    isFavorite?: boolean;
    sortOrder?: number;
  }
): PostmanRequest | null {
  const db = getDatabase();
  const now = Date.now();
  const existing = getRequestById(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE postman_requests
     SET group_id = ?, name = ?, method = ?, url = ?, params = ?, headers = ?, body_type = ?, body = ?, auth_type = ?, auth_config = ?, swagger_info = ?, is_favorite = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.groupId ?? existing.groupId ?? null,
    input.name ?? existing.name ?? null,
    input.method ?? existing.method,
    input.url ?? existing.url,
    input.params
      ? JSON.stringify(input.params)
      : existing.params
        ? JSON.stringify(existing.params)
        : null,
    input.headers
      ? JSON.stringify(input.headers)
      : existing.headers
        ? JSON.stringify(existing.headers)
        : null,
    input.bodyType ?? existing.bodyType,
    input.body ?? existing.body ?? null,
    input.authType ?? existing.authType,
    input.authConfig
      ? JSON.stringify(input.authConfig)
      : existing.authConfig
        ? JSON.stringify(existing.authConfig)
        : null,
    input.swaggerInfo
      ? JSON.stringify(input.swaggerInfo)
      : existing.swaggerInfo
        ? JSON.stringify(existing.swaggerInfo)
        : null,
    input.isFavorite !== undefined
      ? input.isFavorite
        ? 1
        : 0
      : existing.isFavorite
        ? 1
        : 0,
    input.sortOrder ?? existing.sortOrder,
    now,
    id
  );

  return getRequestById(id);
}

/**
 * 删除请求
 */
export function deleteRequest(id: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM postman_requests WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

/**
 * 批量创建请求（用于 Swagger 导入）
 */
export function batchCreateRequests(
  requests: Array<{
    groupId?: number;
    projectId: number;
    name?: string;
    method: string;
    url: string;
    params?: PostmanRequestParam[];
    headers?: PostmanRequestHeader[];
    bodyType?: string;
    body?: string;
    authType?: string;
    authConfig?: Record<string, unknown>;
    swaggerInfo?: Record<string, unknown>;
    sortOrder?: number;
  }>
): PostmanRequest[] {
  const db = getDatabase();
  const now = Date.now();
  const results: PostmanRequest[] = [];

  const stmt = db.prepare(
    `INSERT INTO postman_requests (group_id, project_id, name, method, url, params, headers, body_type, body, auth_type, auth_config, swagger_info, is_favorite, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
  );

  const insertMany = db.transaction((items: typeof requests) => {
    for (const item of items) {
      const result = stmt.run(
        item.groupId || null,
        item.projectId,
        item.name || null,
        item.method,
        item.url,
        item.params ? JSON.stringify(item.params) : null,
        item.headers ? JSON.stringify(item.headers) : null,
        item.bodyType || "json",
        item.body || null,
        item.authType || "none",
        item.authConfig ? JSON.stringify(item.authConfig) : null,
        item.swaggerInfo ? JSON.stringify(item.swaggerInfo) : null,
        item.sortOrder || 0,
        now,
        now
      ) as RunResult;

      results.push({
        id: result.lastInsertRowid as number,
        groupId: item.groupId,
        projectId: item.projectId,
        name: item.name,
        method: item.method,
        url: item.url,
        params: item.params,
        headers: item.headers,
        bodyType: item.bodyType || "json",
        body: item.body,
        authType: item.authType || "none",
        authConfig: item.authConfig,
        swaggerInfo: item.swaggerInfo,
        isFavorite: false,
        sortOrder: item.sortOrder || 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  insertMany(requests);
  return results;
}

// ==================== 历史记录操作 ====================

/**
 * 添加历史记录
 */
export function addHistory(input: {
  requestId?: number;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseStatus: number;
  responseStatusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTime: number;
  responseSize: number;
}): PostmanHistory {
  const db = getDatabase();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO postman_history (request_id, method, url, request_headers, request_body, response_status, response_status_text, response_headers, response_body, response_time, response_size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.requestId || null,
      input.method,
      input.url,
      input.requestHeaders ? JSON.stringify(input.requestHeaders) : null,
      input.requestBody || null,
      input.responseStatus,
      input.responseStatusText || null,
      input.responseHeaders ? JSON.stringify(input.responseHeaders) : null,
      input.responseBody || null,
      input.responseTime,
      input.responseSize,
      now
    ) as RunResult;

  return {
    id: result.lastInsertRowid as number,
    requestId: input.requestId,
    method: input.method,
    url: input.url,
    requestHeaders: input.requestHeaders,
    requestBody: input.requestBody,
    responseStatus: input.responseStatus,
    responseStatusText: input.responseStatusText,
    responseHeaders: input.responseHeaders,
    responseBody: input.responseBody,
    responseTime: input.responseTime,
    responseSize: input.responseSize,
    createdAt: now,
  };
}

/**
 * 获取历史记录列表
 */
export function getHistoryList(limit = 50): PostmanHistory[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT id, request_id, method, url, request_headers, request_body, response_status, response_status_text, response_headers, response_body, response_time, response_size, created_at
       FROM postman_history
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
    id: number;
    request_id: number | null;
    method: string;
    url: string;
    request_headers: string | null;
    request_body: string | null;
    response_status: number;
    response_status_text: string | null;
    response_headers: string | null;
    response_body: string | null;
    response_time: number;
    response_size: number;
    created_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    requestId: row.request_id || undefined,
    method: row.method,
    url: row.url,
    requestHeaders: row.request_headers
      ? JSON.parse(row.request_headers)
      : undefined,
    requestBody: row.request_body || undefined,
    responseStatus: row.response_status,
    responseStatusText: row.response_status_text || undefined,
    responseHeaders: row.response_headers
      ? JSON.parse(row.response_headers)
      : undefined,
    responseBody: row.response_body || undefined,
    responseTime: row.response_time,
    responseSize: row.response_size,
    createdAt: row.created_at,
  }));
}

/**
 * 清空历史记录
 */
export function clearHistory(): boolean {
  const db = getDatabase();
  db.exec("DELETE FROM postman_history");
  return true;
}

// ==================== 设置操作 ====================

/**
 * 获取设置
 */
export function getSetting(key: string): PostmanSetting | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, key, value, updated_at FROM postman_settings WHERE key = ?`
    )
    .get(key) as
    | {
        id: number;
        key: string;
        value: string;
        updated_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    key: row.key,
    value: JSON.parse(row.value),
    updatedAt: row.updated_at,
  };
}

/**
 * 保存设置
 */
export function saveSetting(
  key: string,
  value: Record<string, unknown>
): PostmanSetting {
  const db = getDatabase();
  const now = Date.now();

  const existing = getSetting(key);

  if (existing) {
    db.prepare(
      `UPDATE postman_settings SET value = ?, updated_at = ? WHERE key = ?`
    ).run(JSON.stringify(value), now, key);

    return {
      id: existing.id,
      key,
      value,
      updatedAt: now,
    };
  } else {
    const result = db
      .prepare(
        `INSERT INTO postman_settings (key, value, updated_at) VALUES (?, ?, ?)`
      )
      .run(key, JSON.stringify(value), now) as RunResult;

    return {
      id: result.lastInsertRowid as number,
      key,
      value,
      updatedAt: now,
    };
  }
}

// ==================== 辅助函数 ====================

function transformRequestRow(row: {
  id: number;
  group_id: number | null;
  project_id: number;
  name: string | null;
  method: string;
  url: string;
  params: string | null;
  headers: string | null;
  body_type: string;
  body: string | null;
  auth_type: string;
  auth_config: string | null;
  swagger_info: string | null;
  is_favorite: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}): PostmanRequest {
  return {
    id: row.id,
    groupId: row.group_id || undefined,
    projectId: row.project_id,
    name: row.name || undefined,
    method: row.method,
    url: row.url,
    params: row.params ? JSON.parse(row.params) : undefined,
    headers: row.headers ? JSON.parse(row.headers) : undefined,
    bodyType: row.body_type,
    body: row.body || undefined,
    authType: row.auth_type,
    authConfig: row.auth_config ? JSON.parse(row.auth_config) : undefined,
    swaggerInfo: row.swagger_info ? JSON.parse(row.swagger_info) : undefined,
    isFavorite: row.is_favorite === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default {
  // 项目
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  // 分组
  getGroupsByProjectId,
  createGroup,
  updateGroup,
  deleteGroup,
  // 请求
  getRequestsByProjectId,
  getRequestsByGroupId,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
  batchCreateRequests,
  // 历史
  addHistory,
  getHistoryList,
  clearHistory,
  // 设置
  getSetting,
  saveSetting,
};
