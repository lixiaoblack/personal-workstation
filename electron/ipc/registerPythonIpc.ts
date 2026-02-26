/**
 * Python 服务和 Ollama IPC 处理器
 *
 * 处理 Python 环境检测、服务管理、Ollama 连接、Skills 技能等
 */

import { ipcMain, app } from "electron";
import * as websocketService from "../services/websocketService";
import * as pythonEnvService from "../services/pythonEnvService";
import * as pythonProcessService from "../services/pythonProcessService";
import type { PythonDetectOptions, PythonServiceConfig } from "../types";

/**
 * 注册 Python 服务和 Ollama 相关 IPC 处理器
 */
export function registerPythonIpc(): void {
  // ========== 应用环境信息 ==========

  ipcMain.handle("app:isPackaged", async () => {
    return app.isPackaged;
  });

  // ========== WebSocket 服务管理 ==========

  ipcMain.handle("ws:getInfo", async () => {
    return websocketService.getServerInfo();
  });

  // ========== Python 环境检测 ==========

  ipcMain.handle(
    "python:detect",
    async (_event, options?: PythonDetectOptions) => {
      return pythonEnvService.detectPythonEnvironment(options);
    }
  );

  ipcMain.handle("python:getInstallGuide", async () => {
    return pythonEnvService.getPythonInstallGuide();
  });

  ipcMain.handle("python:checkDependencies", async () => {
    return pythonEnvService.checkAIDependencies();
  });

  // ========== Python 服务管理 ==========

  ipcMain.handle(
    "python:service:start",
    async (_event, config?: PythonServiceConfig) => {
      return pythonProcessService.startPythonService(config);
    }
  );

  ipcMain.handle("python:service:stop", async () => {
    return pythonProcessService.stopPythonService();
  });

  ipcMain.handle(
    "python:service:restart",
    async (_event, config?: PythonServiceConfig) => {
      return pythonProcessService.restartPythonService(config);
    }
  );

  ipcMain.handle("python:service:getInfo", async () => {
    return pythonProcessService.getPythonServiceInfo();
  });

  // ========== Ollama 相关 ==========

  ipcMain.handle("ollama:getStatus", async (_, host?: string) => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return {
        running: false,
        host: host || "http://127.0.0.1:11434",
        error: "Python 服务未连接",
        models: [],
        modelCount: 0,
      };
    }

    return websocketService.getOllamaStatus(host);
  });

  ipcMain.handle("ollama:getModels", async (_, host?: string) => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return [];
    }

    return websocketService.getOllamaModels(host);
  });

  ipcMain.handle("ollama:testConnection", async (_, host?: string) => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return {
        success: false,
        host: host || "http://127.0.0.1:11434",
        error: "Python 服务未连接",
      };
    }

    return websocketService.testOllamaConnection(host);
  });

  // ========== Skills 技能相关 ==========

  // 获取技能列表
  ipcMain.handle("skill:getList", async () => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return {
        success: false,
        skills: [],
        count: 0,
        error: "Python 服务未连接",
      };
    }

    return websocketService.getSkillList();
  });

  // 执行技能
  ipcMain.handle(
    "skill:execute",
    async (_, skillName: string, parameters?: Record<string, unknown>) => {
      const wsInfo = websocketService.getServerInfo();

      if (!wsInfo.running || !wsInfo.pythonConnected) {
        return {
          success: false,
          skillName,
          error: "Python 服务未连接",
        };
      }

      return websocketService.executeSkill(skillName, parameters);
    }
  );

  // 重载技能
  ipcMain.handle("skill:reload", async (_, skillName?: string) => {
    const wsInfo = websocketService.getServerInfo();

    if (!wsInfo.running || !wsInfo.pythonConnected) {
      return {
        success: false,
        error: "Python 服务未连接",
      };
    }

    return websocketService.reloadSkills(skillName);
  });
}
