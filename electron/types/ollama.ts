/**
 * Ollama 相关类型定义
 */

// Ollama 模型信息
export interface OllamaModel {
  name: string;
  modifiedAt: string;
  size: number;
  sizeGB: number;
  sizeMB: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    parameterSize?: string;
    quantizationLevel?: string;
  };
}

// Ollama 服务状态
export interface OllamaStatus {
  running: boolean;
  host: string;
  version?: string;
  error?: string;
  models: OllamaModel[];
  modelCount: number;
}

// Ollama 连接测试结果
export interface OllamaTestResult {
  success: boolean;
  latency?: number;
  host: string;
  modelCount?: number;
  error?: string;
}
