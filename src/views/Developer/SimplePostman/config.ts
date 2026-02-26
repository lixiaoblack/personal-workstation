/**
 * SimplePostman 配置文件
 */

// HTTP 方法配置
export const HTTP_METHODS = [
  { value: "GET", label: "GET", color: "#10b981" },
  { value: "POST", label: "POST", color: "#f59e0b" },
  { value: "PUT", label: "PUT", color: "#3b82f6" },
  { value: "DELETE", label: "DELETE", color: "#ef4444" },
  { value: "PATCH", label: "PATCH", color: "#8b5cf6" },
  { value: "HEAD", label: "HEAD", color: "#6b7280" },
  { value: "OPTIONS", label: "OPTIONS", color: "#6b7280" },
] as const;

// 请求标签页配置
export const REQUEST_TABS = [
  { key: "body", label: "正文 (Body)" },
  { key: "params", label: "参数 (Params)" },
  { key: "headers", label: "请求头 (Headers)" },
  { key: "auth", label: "授权 (Auth)" },
  { key: "settings", label: "设置" },
] as const;

// Body 类型配置
export const BODY_TYPES = [
  { value: "json", label: "JSON (application/json)" },
  { value: "form-data", label: "Form Data (multipart/form-data)" },
  {
    value: "x-www-form-urlencoded",
    label: "URL Encoded (application/x-www-form-urlencoded)",
  },
  { value: "raw", label: "Raw (text/plain)" },
  { value: "binary", label: "Binary" },
  { value: "none", label: "无" },
] as const;

// Auth 类型配置
export const AUTH_TYPES = [
  { value: "none", label: "无认证" },
  { value: "bearer", label: "Bearer Token" },
  { value: "basic", label: "Basic Auth" },
  { value: "api-key", label: "API Key" },
] as const;

// 侧边栏菜单项
export const SIDEBAR_MENU_ITEMS = [
  { key: "history", icon: "history", label: "历史记录" },
  { key: "favorites", icon: "star", label: "收藏夹" },
  { key: "collections", icon: "folder_open", label: "API 集合" },
] as const;

// 类型定义
export type HttpMethod = (typeof HTTP_METHODS)[number]["value"];
export type RequestTabKey = (typeof REQUEST_TABS)[number]["key"];
export type BodyType = (typeof BODY_TYPES)[number]["value"];
export type AuthType = (typeof AUTH_TYPES)[number]["value"];
export type SidebarMenuKey = (typeof SIDEBAR_MENU_ITEMS)[number]["key"];

// 请求参数接口
export interface RequestParam {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

// 请求头接口
export interface RequestHeader {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

// 请求配置接口
export interface RequestConfig {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: RequestParam[];
  headers: RequestHeader[];
  bodyType: BodyType;
  body: string;
  authType: AuthType;
  authConfig: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  folderId?: string;
  isFavorite?: boolean;
}

// 响应接口
export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

// API 文件夹接口
export interface ApiFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: number;
  updatedAt: number;
}

// Swagger 解析结果接口
export interface SwaggerParseResult {
  success: boolean;
  error?: string;
  info?: {
    title: string;
    version: string;
    description?: string;
  };
  endpoints?: SwaggerEndpoint[];
}

export interface SwaggerEndpoint {
  path: string;
  method: HttpMethod;
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: SwaggerParameter[];
  requestBody?: SwaggerRequestBody;
  responses?: Record<string, SwaggerResponse>;
}

export interface SwaggerParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema?: Record<string, unknown>;
}

export interface SwaggerRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: Record<string, unknown> }>;
}

export interface SwaggerResponse {
  description: string;
  content?: Record<string, { schema?: Record<string, unknown> }>;
}

// 默认请求配置
export const DEFAULT_REQUEST_CONFIG: Partial<RequestConfig> = {
  method: "GET",
  params: [],
  headers: [
    {
      id: "1",
      key: "Content-Type",
      value: "application/json",
      enabled: true,
    },
  ],
  bodyType: "json",
  body: "",
  authType: "none",
  authConfig: {},
};

// 默认请求头
export const DEFAULT_HEADERS: RequestHeader[] = [
  { id: "1", key: "Content-Type", value: "application/json", enabled: true },
];
