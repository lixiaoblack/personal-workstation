/**
 * Python 进程管理服务
 * 管理 Python 智能体服务的启动、停止和健康监控
 */
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { app } from "electron";
import type {
  PythonServiceConfig,
  PythonServiceInfo,
  PythonServiceStatus,
  PythonServiceLog,
  PythonServiceStartResult,
  PythonServiceStopResult,
} from "../types/python";
import { DEFAULT_PYTHON_SERVICE_CONFIG } from "../types/python";
import { detectPythonEnvironment } from "./pythonEnvService";

// 服务实例
let serviceProcess: ChildProcess | null = null;
let serviceConfig: PythonServiceConfig = { ...DEFAULT_PYTHON_SERVICE_CONFIG };
let serviceStatus: PythonServiceStatus = "stopped";
let serviceStartTime: number | null = null;
let restartCount = 0;
let lastError: string | null = null;
let recentLogs: PythonServiceLog[] = [];
let healthCheckInterval: NodeJS.Timeout | null = null;

// 最大日志条数
const MAX_LOG_ENTRIES = 100;

/**
 * 添加日志
 */
function addLog(level: PythonServiceLog["level"], message: string): void {
  recentLogs.push({
    timestamp: Date.now(),
    level,
    message,
  });

  // 限制日志数量
  if (recentLogs.length > MAX_LOG_ENTRIES) {
    recentLogs = recentLogs.slice(-MAX_LOG_ENTRIES);
  }
}

/**
 * 获取 Python 服务目录
 */
function getServiceDirectory(): string {
  // 开发环境：使用项目目录下的 python-service
  // 生产环境：使用应用资源目录
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  
  if (isDev) {
    return path.join(process.cwd(), "python-service");
  }
  
  return path.join(process.resourcesPath, "python-service");
}

/**
 * 获取 Python 解释器路径
 */
async function getPythonInterpreter(config: PythonServiceConfig): Promise<string> {
  // 1. 使用配置中的路径
  if (config.pythonPath && fs.existsSync(config.pythonPath)) {
    return config.pythonPath;
  }

  // 2. 使用虚拟环境中的 Python
  if (config.venvPath) {
    const venvPython = process.platform === "win32"
      ? path.join(config.venvPath, "Scripts", "python.exe")
      : path.join(config.venvPath, "bin", "python");
    
    if (fs.existsSync(venvPython)) {
      return venvPython;
    }
  }

  // 3. 检测系统 Python
  const env = await detectPythonEnvironment({ timeout: 5000 });
  if (env.python3Path) {
    return env.python3Path;
  }
  if (env.pythonPath) {
    return env.pythonPath;
  }

  // 4. 默认使用 python3 或 python
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * 启动 Python 服务
 */
export async function startPythonService(
  config: PythonServiceConfig = {}
): Promise<PythonServiceStartResult> {
  // 合并配置
  serviceConfig = { ...DEFAULT_PYTHON_SERVICE_CONFIG, ...config };

  // 检查是否已运行
  if (serviceProcess && serviceStatus === "running") {
    return {
      success: false,
      error: "服务已在运行中",
    };
  }

  try {
    serviceStatus = "starting";
    addLog("info", "正在启动 Python 服务...");

    // 获取 Python 解释器
    const pythonPath = await getPythonInterpreter(serviceConfig);
    addLog("info", `使用 Python: ${pythonPath}`);

    // 获取服务目录
    const serviceDir = getServiceDirectory();
    
    // 检查服务脚本是否存在
    const scriptPath = serviceConfig.scriptPath || path.join(serviceDir, "main.py");
    if (!fs.existsSync(scriptPath)) {
      // 如果脚本不存在，创建一个简单的测试服务
      await createTestService(serviceDir, scriptPath);
    }

    // 构建环境变量
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONUNBUFFERED: "1",
      PYTHONIOENCODING: "utf-8",
      SERVICE_PORT: String(serviceConfig.port || 8765),
      ...serviceConfig.env,
    };

    // 启动进程
    serviceProcess = spawn(pythonPath, [scriptPath], {
      cwd: serviceConfig.workDir || serviceDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // 记录启动
    serviceStartTime = Date.now();
    serviceStatus = "running";
    restartCount = 0;
    lastError = null;

    // 处理标准输出
    serviceProcess.stdout?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        addLog("info", message);
        console.log(`[Python Service] ${message}`);
      }
    });

    // 处理错误输出
    serviceProcess.stderr?.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        addLog("warn", message);
        console.warn(`[Python Service] ${message}`);
      }
    });

    // 处理进程退出
    serviceProcess.on("close", (code, signal) => {
      const wasRunning = serviceStatus === "running";
      serviceProcess = null;
      serviceStartTime = null;

      if (signal) {
        addLog("info", `服务被信号 ${signal} 终止`);
      } else if (code !== 0) {
        addLog("error", `服务异常退出，退出码: ${code}`);
        lastError = `服务异常退出，退出码: ${code}`;
        serviceStatus = "error";
      } else {
        addLog("info", "服务已正常停止");
      }

      // 自动重启
      if (wasRunning && serviceConfig.autoRestart && restartCount < (serviceConfig.maxRestarts || 3)) {
        restartCount++;
        addLog("info", `自动重启服务 (${restartCount}/${serviceConfig.maxRestarts})...`);
        setTimeout(() => {
          startPythonService(serviceConfig);
        }, 2000);
      } else {
        serviceStatus = "stopped";
      }
    });

    // 处理错误
    serviceProcess.on("error", (err) => {
      addLog("error", `进程错误: ${err.message}`);
      lastError = err.message;
      serviceStatus = "error";
      serviceProcess = null;
    });

    // 启动健康检查
    startHealthCheck();

    addLog("info", `Python 服务已启动，PID: ${serviceProcess.pid}`);

    return {
      success: true,
      pid: serviceProcess.pid || undefined,
      port: serviceConfig.port,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog("error", `启动失败: ${errorMessage}`);
    lastError = errorMessage;
    serviceStatus = "error";

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 停止 Python 服务
 */
export async function stopPythonService(): Promise<PythonServiceStopResult> {
  if (!serviceProcess) {
    return { success: true };
  }

  try {
    serviceStatus = "stopping";
    addLog("info", "正在停止 Python 服务...");

    // 停止健康检查
    stopHealthCheck();

    // 发送终止信号
    if (process.platform === "win32") {
      // Windows: 强制终止
      serviceProcess.kill("SIGTERM");
      setTimeout(() => {
        if (serviceProcess) {
          serviceProcess.kill("SIGKILL");
        }
      }, 5000);
    } else {
      // macOS/Linux: 优雅终止
      serviceProcess.kill("SIGTERM");
    }

    // 等待进程退出
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (serviceProcess) {
          serviceProcess.kill("SIGKILL");
        }
        resolve();
      }, 10000);

      serviceProcess?.on("close", () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    serviceProcess = null;
    serviceStartTime = null;
    serviceStatus = "stopped";
    addLog("info", "Python 服务已停止");

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog("error", `停止失败: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 重启 Python 服务
 */
export async function restartPythonService(
  config?: PythonServiceConfig
): Promise<PythonServiceStartResult> {
  addLog("info", "正在重启 Python 服务...");

  const stopResult = await stopPythonService();
  if (!stopResult.success) {
    return {
      success: false,
      error: stopResult.error,
    };
  }

  // 等待一秒后重启
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return startPythonService(config || serviceConfig);
}

/**
 * 获取服务信息
 */
export function getPythonServiceInfo(): PythonServiceInfo {
  let uptime: number | null = null;
  if (serviceStartTime && serviceStatus === "running") {
    uptime = Math.floor((Date.now() - serviceStartTime) / 1000);
  }

  return {
    status: serviceStatus,
    pid: serviceProcess?.pid || null,
    port: serviceConfig.port || null,
    startedAt: serviceStartTime,
    uptime,
    restartCount,
    lastError,
    recentLogs: [...recentLogs],
  };
}

/**
 * 启动健康检查
 */
function startHealthCheck(): void {
  stopHealthCheck();

  healthCheckInterval = setInterval(() => {
    if (serviceProcess && serviceStatus === "running") {
      // 检查进程是否还在运行
      try {
        process.kill(serviceProcess.pid!, 0);
      } catch {
        // 进程已终止
        addLog("warn", "健康检查: 进程已终止");
        serviceStatus = "error";
        lastError = "进程意外终止";
        serviceProcess = null;
        stopHealthCheck();
      }
    }
  }, 5000);
}

/**
 * 停止健康检查
 */
function stopHealthCheck(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

/**
 * 创建测试服务脚本
 */
async function createTestService(serviceDir: string, scriptPath: string): Promise<void> {
  // 确保目录存在
  if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true });
  }

  // 创建简单的测试服务
  const testScript = `#!/usr/bin/env python3
"""
AI Agent Python Service - Test Mode
用于测试 Python 进程管理的简单服务
"""
import os
import sys
import time
import json
from datetime import datetime

def main():
    port = int(os.environ.get("SERVICE_PORT", 8765))
    print(f"[Python Service] Starting on port {port}")
    print(f"[Python Service] Python version: {sys.version}")
    print(f"[Python Service] Working directory: {os.getcwd()}")
    
    # 模拟服务运行
    counter = 0
    while True:
        counter += 1
        status = {
            "timestamp": datetime.now().isoformat(),
            "counter": counter,
            "status": "running"
        }
        print(f"[Python Service] Heartbeat: {json.dumps(status)}")
        time.sleep(10)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("[Python Service] Shutting down...")
        sys.exit(0)
`;

  fs.writeFileSync(scriptPath, testScript, "utf-8");
  addLog("info", `已创建测试服务脚本: ${scriptPath}`);
}

/**
 * 清理资源
 */
export function cleanup(): void {
  stopHealthCheck();
  if (serviceProcess) {
    serviceProcess.kill("SIGTERM");
    serviceProcess = null;
  }
}
