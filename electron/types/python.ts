/**
 * Python 环境检测相关类型定义
 */

// 操作系统类型
export type OSType = "darwin" | "win32" | "linux" | "unknown";

// Python 版本信息
export interface PythonVersion {
  major: number;
  minor: number;
  patch: number;
  raw: string; // 原始版本字符串，如 "3.11.5"
}

// 包管理器类型
export type PackageManagerType = "pip" | "pip3" | "poetry" | "conda" | "none";

// 包管理器信息
export interface PackageManagerInfo {
  type: PackageManagerType;
  version: string | null;
  path: string | null;
}

// 虚拟环境类型
export type VirtualEnvType = "venv" | "virtualenv" | "conda" | "none";

// 虚拟环境信息
export interface VirtualEnvInfo {
  type: VirtualEnvType;
  active: boolean;
  path: string | null;
  name: string | null;
}

// Python 环境检测结果
export interface PythonEnvironment {
  // 系统信息
  os: OSType;
  osVersion: string;
  
  // Python 信息
  pythonInstalled: boolean;
  pythonVersion: PythonVersion | null;
  pythonPath: string | null;
  python3Path: string | null;
  
  // 包管理器
  packageManagers: PackageManagerInfo[];
  defaultPackageManager: PackageManagerType;
  
  // 虚拟环境
  virtualEnv: VirtualEnvInfo;
  
  // 检测时间
  detectedAt: number;
  
  // 是否满足最低要求（Python 3.9+）
  meetsRequirements: boolean;
  
  // 错误信息
  errors: string[];
  
  // 建议
  recommendations: string[];
}

// Python 环境检测选项
export interface PythonDetectOptions {
  timeout?: number; // 超时时间（毫秒），默认 30000
  checkPip?: boolean; // 是否检测 pip，默认 true
  checkPoetry?: boolean; // 是否检测 poetry，默认 true
  checkConda?: boolean; // 是否检测 conda，默认 false
}

// Python 安装引导
export interface PythonInstallGuide {
  platform: OSType;
  methods: PythonInstallMethod[];
}

export interface PythonInstallMethod {
  name: string;
  description: string;
  url: string;
  command?: string; // 安装命令
  recommended: boolean;
}

// AI 智能体依赖要求
export const AI_AGENT_REQUIREMENTS = {
  pythonMinVersion: "3.9.0",
  requiredPackages: [
    "langgraph>=1.0.0",
    "langchain>=0.3.0",
    "langchain-community>=0.3.0",
    "lancedb>=0.8.0",
    "mcp>=1.0.0",
  ],
  optionalPackages: [
    "torch",
    "transformers",
    "sentence-transformers",
  ],
} as const;
