/**
 * Python 数据服务 HTTP API 客户端
 *
 * 封装与 Python FastAPI 数据服务的通信，提供：
 * 1. 统一的 HTTP 请求方法
 * 2. 错误处理和重试逻辑
 * 3. 健康检查
 */

import http from "http";

// Python HTTP 服务配置
const PYTHON_API_HOST = "127.0.0.1";
const PYTHON_API_PORT = 8766;
const PYTHON_API_BASE = `http://${PYTHON_API_HOST}:${PYTHON_API_PORT}`;

// 请求超时时间（毫秒）
const DEFAULT_TIMEOUT = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;

// API 响应类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 检查 Python HTTP 服务是否可用
 */
export async function checkPythonApiHealth(): Promise<boolean> {
  try {
    const response = await request<{ status: string }>("/health", {
      timeout: 2000,
      retries: 1,
    });
    return response.success && response.data?.status === "healthy";
  } catch {
    return false;
  }
}

/**
 * 等待 Python HTTP 服务就绪
 */
export async function waitForPythonApi(
  maxWaitMs: number = 30000,
  intervalMs: number = 500
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await checkPythonApiHealth()) {
      console.log("[PythonApiClient] Python HTTP 服务已就绪");
      return true;
    }
    await sleep(intervalMs);
  }

  console.error("[PythonApiClient] 等待 Python HTTP 服务超时");
  return false;
}

/**
 * 发送 GET 请求
 */
export async function get<T = unknown>(
  path: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>(path, { ...options, method: "GET" });
}

/**
 * 发送 POST 请求
 */
export async function post<T = unknown>(
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>(path, { ...options, method: "POST", body });
}

/**
 * 发送 PUT 请求
 */
export async function put<T = unknown>(
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>(path, { ...options, method: "PUT", body });
}

/**
 * 发送 DELETE 请求
 */
export async function del<T = unknown>(
  path: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>(path, { ...options, method: "DELETE" });
}

// ==================== 请求选项 ====================

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// ==================== 内部实现 ====================

/**
 * 发送 HTTP 请求
 */
async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    headers = {},
  } = options;

  const url = path.startsWith("http") ? path : `${PYTHON_API_BASE}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await httpRequest<T>(url, {
        method,
        body,
        timeout,
        headers,
      });
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[PythonApiClient] 请求失败 (尝试 ${attempt}/${retries}): ${path}`,
        error
      );

      if (attempt < retries) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "请求失败",
  };
}

/**
 * 底层 HTTP 请求实现
 */
function httpRequest<T>(
  url: string,
  options: {
    method: string;
    body?: unknown;
    timeout: number;
    headers: Record<string, string>;
  }
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyData = options.body ? JSON.stringify(options.body) : undefined;

    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname + urlObj.search,
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
          ...(bodyData
            ? { "Content-Length": Buffer.byteLength(bodyData) }
            : {}),
        },
        timeout: options.timeout,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json as ApiResponse<T>);
          } catch {
            reject(new Error(`Invalid JSON response: ${data.slice(0, 100)}`));
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== 导出 ====================

export const pythonApiClient = {
  checkHealth: checkPythonApiHealth,
  waitForReady: waitForPythonApi,
  get,
  post,
  put,
  delete: del,
  // 暴露配置以便测试
  config: {
    host: PYTHON_API_HOST,
    port: PYTHON_API_PORT,
    baseUrl: PYTHON_API_BASE,
  },
};

export default pythonApiClient;
