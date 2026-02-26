/**
 * 模块管理 IPC 注册
 * 注册可选功能模块的下载、安装、卸载等 IPC 处理器
 */
import { ipcMain, BrowserWindow } from "electron";
import {
  moduleManager,
  type ModuleStatus,
  type ModuleInfo,
  type DownloadProgress,
} from "../services/moduleService";

/**
 * 注册模块管理 IPC 处理器
 */
export function registerModuleIpc(): void {
  console.log("[IPC] 注册模块管理 IPC 处理器");

  // ========== 模块查询 ==========

  /**
   * 获取所有可用模块
   */
  ipcMain.handle("module:getAvailable", async (): Promise<ModuleInfo[]> => {
    return moduleManager.getAvailableModules();
  });

  /**
   * 获取模块状态
   */
  ipcMain.handle(
    "module:getStatus",
    async (_event, moduleId: string): Promise<ModuleStatus> => {
      return moduleManager.getModuleStatus(moduleId);
    }
  );

  /**
   * 获取所有模块状态
   */
  ipcMain.handle(
    "module:getAllStatus",
    async (): Promise<Record<string, ModuleStatus>> => {
      const modules = moduleManager.getAvailableModules();
      const status: Record<string, ModuleStatus> = {};
      for (const module of modules) {
        status[module.id] = moduleManager.getModuleStatus(module.id);
      }
      return status;
    }
  );

  // ========== 模块安装/卸载 ==========

  /**
   * 下载并安装模块
   */
  ipcMain.handle(
    "module:install",
    async (
      event,
      moduleId: string
    ): Promise<{ success: boolean; error?: string }> => {
      // 获取当前窗口用于发送进度
      const win = BrowserWindow.fromWebContents(event.sender);

      const result = await moduleManager.downloadModule(
        moduleId,
        (progress: DownloadProgress) => {
          // 发送下载进度到渲染进程
          win?.webContents.send("module:downloadProgress", progress);
        }
      );

      return result;
    }
  );

  /**
   * 卸载模块
   */
  ipcMain.handle(
    "module:uninstall",
    async (
      _event,
      moduleId: string
    ): Promise<{ success: boolean; error?: string }> => {
      return moduleManager.uninstallModule(moduleId);
    }
  );

  /**
   * 取消下载
   */
  ipcMain.handle(
    "module:cancelDownload",
    async (_event, moduleId: string): Promise<boolean> => {
      return moduleManager.cancelDownload(moduleId);
    }
  );

  // ========== OCR 模块特定 ==========

  /**
   * 启动 OCR 模块
   */
  ipcMain.handle(
    "module:startOcr",
    async (): Promise<{ success: boolean; port?: number; error?: string }> => {
      return moduleManager.startOcrModule();
    }
  );

  /**
   * 停止 OCR 模块
   */
  ipcMain.handle("module:stopOcr", async (): Promise<void> => {
    moduleManager.stopOcrModule();
  });

  /**
   * 获取 OCR 模块状态
   */
  ipcMain.handle(
    "module:ocrStatus",
    async (): Promise<{
      installed: boolean;
      running: boolean;
      port: number | null;
      version?: string;
    }> => {
      const status = moduleManager.getModuleStatus("ocr");
      return {
        installed: status.installed,
        running: moduleManager.isOcrRunning(),
        port: moduleManager.getOcrPort(),
        version: status.version,
      };
    }
  );

  console.log("[IPC] 模块管理 IPC 处理器注册完成");
}
