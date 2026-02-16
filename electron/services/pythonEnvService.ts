/**
 * Python 环境检测服务
 * 检测系统 Python 环境、版本、包管理器等
 */
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import fs from "fs";
import type {
  OSType,
  PythonEnvironment,
  PythonVersion,
  PackageManagerInfo,
  PackageManagerType,
  VirtualEnvInfo,
  PythonDetectOptions,
  PythonInstallGuide,
  PythonInstallMethod,
} from "../types/python";
import { AI_AGENT_REQUIREMENTS } from "../types/python";

const execAsync = promisify(exec);

// 默认检测选项
const DEFAULT_OPTIONS: PythonDetectOptions = {
  timeout: 30000,
  checkPip: true,
  checkPoetry: true,
  checkConda: false,
};

/**
 * 获取操作系统类型
 */
function getOSType(): OSType {
  const platform = process.platform;
  if (platform === "darwin") return "darwin";
  if (platform === "win32") return "win32";
  if (platform === "linux") return "linux";
  return "unknown";
}

/**
 * 获取操作系统版本
 */
function getOSVersion(): string {
  const type = os.type();
  const release = os.release();
  return `${type} ${release}`;
}

/**
 * 解析 Python 版本字符串
 */
function parsePythonVersion(versionStr: string): PythonVersion | null {
  // 匹配版本号模式: Python 3.11.5 或 3.11.5
  const match = versionStr.match(/Python\s+(\d+)\.(\d+)\.(\d+)/i) ||
                versionStr.match(/^(\d+)\.(\d+)\.(\d+)$/);
  
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      raw: `${match[1]}.${match[2]}.${match[3]}`,
    };
  }
  
  return null;
}

/**
 * 比较版本号
 */
function compareVersions(v1: PythonVersion, v2: string): number {
  const parts = v2.split(".").map(Number);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;

  if (v1.major !== major) return v1.major - major;
  if (v1.minor !== minor) return v1.minor - minor;
  return v1.patch - patch;
}

/**
 * 安全执行命令
 */
async function safeExec(
  command: string,
  timeout: number = 30000
): Promise<{ stdout: string; stderr: string } | null> {
  try {
    const result = await execAsync(command, {
      timeout,
      encoding: "utf-8",
    });
    return result;
  } catch {
    return null;
  }
}

/**
 * 检测 Python 安装路径
 */
async function detectPythonPath(
  osType: OSType,
  timeout: number
): Promise<{ pythonPath: string | null; python3Path: string | null }> {
  let pythonPath: string | null = null;
  let python3Path: string | null = null;

  if (osType === "win32") {
    // Windows: 使用 where 命令
    const pythonResult = await safeExec("where python", timeout);
    if (pythonResult?.stdout) {
      pythonPath = pythonResult.stdout.split("\n")[0].trim();
    }
    
    const python3Result = await safeExec("where python3", timeout);
    if (python3Result?.stdout) {
      python3Path = python3Result.stdout.split("\n")[0].trim();
    }
  } else {
    // macOS / Linux: 使用 which 命令
    const pythonResult = await safeExec("which python", timeout);
    if (pythonResult?.stdout) {
      pythonPath = pythonResult.stdout.trim();
    }
    
    const python3Result = await safeExec("which python3", timeout);
    if (python3Result?.stdout) {
      python3Path = python3Result.stdout.trim();
    }
  }

  return { pythonPath, python3Path };
}

/**
 * 检测 Python 版本
 */
async function detectPythonVersion(
  timeout: number
): Promise<PythonVersion | null> {
  // 优先检测 python3
  const result3 = await safeExec("python3 --version", timeout);
  if (result3?.stdout) {
    const version = parsePythonVersion(result3.stdout);
    if (version) return version;
  }

  // 尝试 python
  const result = await safeExec("python --version", timeout);
  if (result?.stdout) {
    const version = parsePythonVersion(result.stdout);
    if (version) return version;
  }

  return null;
}

/**
 * 检测包管理器
 */
async function detectPackageManagers(
  osType: OSType,
  options: PythonDetectOptions
): Promise<PackageManagerInfo[]> {
  const managers: PackageManagerInfo[] = [];
  const timeout = options.timeout || 30000;

  if (options.checkPip) {
    // 检测 pip
    const pipResult = await safeExec("pip --version", timeout);
    if (pipResult?.stdout) {
      const pathMatch = pipResult.stdout.match(/from\s+(.+)\s+\(python/);
      managers.push({
        type: "pip",
        version: pipResult.stdout.split(" ")[1] || null,
        path: pathMatch ? pathMatch[1] : null,
      });
    }

    // 检测 pip3
    const pip3Result = await safeExec("pip3 --version", timeout);
    if (pip3Result?.stdout) {
      const pathMatch = pip3Result.stdout.match(/from\s+(.+)\s+\(python/);
      managers.push({
        type: "pip3",
        version: pip3Result.stdout.split(" ")[1] || null,
        path: pathMatch ? pathMatch[1] : null,
      });
    }
  }

  if (options.checkPoetry) {
    // 检测 poetry
    const poetryResult = await safeExec("poetry --version", timeout);
    if (poetryResult?.stdout) {
      const versionMatch = poetryResult.stdout.match(/(\d+\.\d+\.\d+)/);
      let poetryPath: string | null = null;
      
      if (osType === "win32") {
        const whereResult = await safeExec("where poetry", timeout);
        poetryPath = whereResult?.stdout?.split("\n")[0].trim() || null;
      } else {
        const whichResult = await safeExec("which poetry", timeout);
        poetryPath = whichResult?.stdout?.trim() || null;
      }
      
      managers.push({
        type: "poetry",
        version: versionMatch ? versionMatch[1] : null,
        path: poetryPath,
      });
    }
  }

  if (options.checkConda) {
    // 检测 conda
    const condaResult = await safeExec("conda --version", timeout);
    if (condaResult?.stdout) {
      const versionMatch = condaResult.stdout.match(/conda\s+(\d+\.\d+\.\d+)/);
      managers.push({
        type: "conda",
        version: versionMatch ? versionMatch[1] : null,
        path: null, // conda 路径比较复杂，暂不检测
      });
    }
  }

  return managers;
}

/**
 * 检测虚拟环境
 */
function detectVirtualEnv(): VirtualEnvInfo {
  // 检查环境变量
  const virtualEnv = process.env.VIRTUAL_ENV;
  const condaDefaultEnv = process.env.CONDA_DEFAULT_ENV;

  if (virtualEnv) {
    // 检测虚拟环境类型
    const venvPath = path.join(virtualEnv, "pyvenv.cfg");
    const hasVenvCfg = fs.existsSync(venvPath);
    
    return {
      type: hasVenvCfg ? "venv" : "virtualenv",
      active: true,
      path: virtualEnv,
      name: path.basename(virtualEnv),
    };
  }

  if (condaDefaultEnv && condaDefaultEnv !== "base") {
    return {
      type: "conda",
      active: true,
      path: process.env.CONDA_PREFIX || null,
      name: condaDefaultEnv,
    };
  }

  return {
    type: "none",
    active: false,
    path: null,
    name: null,
  };
}

/**
 * 获取默认包管理器
 */
function getDefaultPackageManager(managers: PackageManagerInfo[]): PackageManagerType {
  if (managers.length === 0) return "none";
  
  // 优先级: pip3 > pip > poetry > conda
  const priority: PackageManagerType[] = ["pip3", "pip", "poetry", "conda"];
  
  for (const type of priority) {
    const found = managers.find((m) => m.type === type);
    if (found) return found.type;
  }
  
  return managers[0].type;
}

/**
 * 生成安装建议
 */
function generateRecommendations(env: PythonEnvironment): string[] {
  const recommendations: string[] = [];

  if (!env.pythonInstalled) {
    if (env.os === "darwin") {
      recommendations.push("使用 Homebrew 安装 Python: brew install python@3.11");
      recommendations.push("或从官网下载: https://www.python.org/downloads/macos/");
    } else if (env.os === "win32") {
      recommendations.push("从官网下载 Python: https://www.python.org/downloads/windows/");
      recommendations.push("安装时请勾选 'Add Python to PATH'");
    } else {
      recommendations.push("使用包管理器安装: sudo apt install python3 python3-pip");
    }
  } else if (!env.meetsRequirements) {
    recommendations.push(`Python 版本过低，建议升级到 ${AI_AGENT_REQUIREMENTS.pythonMinVersion} 或更高版本`);
  }

  if (env.pythonInstalled && env.packageManagers.length === 0) {
    recommendations.push("未检测到 pip，请重新安装 Python 并确保勾选 pip 选项");
  }

  if (env.virtualEnv.type === "none" && env.pythonInstalled) {
    recommendations.push("建议创建虚拟环境: python3 -m venv ~/.venv/ai-agent");
  }

  return recommendations;
}

/**
 * 检测 Python 环境
 */
export async function detectPythonEnvironment(
  options: PythonDetectOptions = {}
): Promise<PythonEnvironment> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const timeout = opts.timeout || 30000;
  const osType = getOSType();
  const errors: string[] = [];

  // 检测 Python 安装
  const pythonVersion = await detectPythonVersion(timeout);
  const pythonInstalled = pythonVersion !== null;

  // 检测路径
  const { pythonPath, python3Path } = await detectPythonPath(osType, timeout);

  // 检测包管理器
  const packageManagers = await detectPackageManagers(osType, opts);
  const defaultPackageManager = getDefaultPackageManager(packageManagers);

  // 检测虚拟环境
  const virtualEnv = detectVirtualEnv();

  // 检查是否满足要求
  let meetsRequirements = false;
  if (pythonVersion) {
    meetsRequirements = compareVersions(pythonVersion, AI_AGENT_REQUIREMENTS.pythonMinVersion) >= 0;
  }

  const environment: PythonEnvironment = {
    os: osType,
    osVersion: getOSVersion(),
    pythonInstalled,
    pythonVersion,
    pythonPath,
    python3Path,
    packageManagers,
    defaultPackageManager,
    virtualEnv,
    detectedAt: Date.now(),
    meetsRequirements,
    errors,
    recommendations: [],
  };

  // 生成建议
  environment.recommendations = generateRecommendations(environment);

  return environment;
}

/**
 * 获取安装引导
 */
export function getPythonInstallGuide(): PythonInstallGuide {
  const osType = getOSType();

  const methods: PythonInstallMethod[] = [];

  if (osType === "darwin") {
    methods.push({
      name: "Homebrew",
      description: "macOS 最流行的包管理器",
      url: "https://brew.sh/",
      command: "brew install python@3.11",
      recommended: true,
    });
    methods.push({
      name: "Python 官网",
      description: "从 Python 官网下载安装包",
      url: "https://www.python.org/downloads/macos/",
      recommended: false,
    });
  } else if (osType === "win32") {
    methods.push({
      name: "Python 官网",
      description: "从 Python 官网下载 Windows 安装程序",
      url: "https://www.python.org/downloads/windows/",
      command: "安装时请勾选 'Add Python to PATH'",
      recommended: true,
    });
    methods.push({
      name: "Microsoft Store",
      description: "从 Microsoft Store 安装",
      url: "ms-windows-store://pdp/?ProductId=9NCVDN91XZQP",
      recommended: false,
    });
    methods.push({
      name: "Chocolatey",
      description: "Windows 包管理器",
      url: "https://chocolatey.org/",
      command: "choco install python",
      recommended: false,
    });
  } else {
    methods.push({
      name: "apt (Ubuntu/Debian)",
      description: "Debian 系包管理器",
      url: "",
      command: "sudo apt update && sudo apt install python3 python3-pip python3-venv",
      recommended: true,
    });
    methods.push({
      name: "dnf (Fedora)",
      description: "Fedora 包管理器",
      url: "",
      command: "sudo dnf install python3 python3-pip",
      recommended: false,
    });
  }

  return {
    platform: osType,
    methods,
  };
}

/**
 * 检查 AI 智能体依赖是否已安装
 */
export async function checkAIDependencies(
  timeout: number = 60000
): Promise<{ installed: string[]; missing: string[] }> {
  const installed: string[] = [];
  const missing: string[] = [];

  for (const pkg of AI_AGENT_REQUIREMENTS.requiredPackages) {
    const pkgName = pkg.split(/[><=]/)[0];
    const result = await safeExec(`python3 -c "import ${pkgName}"`, timeout);
    if (result && !result.stderr) {
      installed.push(pkg);
    } else {
      missing.push(pkg);
    }
  }

  return { installed, missing };
}
