/**
 * Electron 主进程入口
 *
 * 职责：
 * - 创建和管理应用窗口
 * - 初始化数据库
 * - 启动 WebSocket 服务和 Python 服务
 * - 注册 IPC 处理器
 * - 管理应用生命周期
 */

import { app, BrowserWindow, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { initDatabase, closeDatabase } from "./database/index";
import * as websocketService from "./services/websocketService";
import * as pythonProcessService from "./services/pythonProcessService";
import { moduleManager } from "./services/moduleService";
import { registerAllIpcHandlers } from "./ipc";
import {
  startReminderService,
  stopReminderService,
  sendWelcomeNotification,
} from "./services/reminderService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 开发环境 URL
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

// 主窗口实例
let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    title: "Personal Workstation",
    show: false,
  });

  // 窗口准备好后再显示，避免白屏
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // 开发环境打开 DevTools
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // 禁用默认菜单，避免 Tab 键被菜单系统捕获
  Menu.setApplicationMenu(null);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * 启动后端服务
 */
async function startBackendServices(): Promise<void> {
  // 启动 WebSocket 服务器
  try {
    const wsInfo = await websocketService.startWebSocketServer();
    console.log(
      `[Main] WebSocket 服务已启动: ws://${wsInfo.host}:${wsInfo.port}`
    );

    // 自动启动 Python 服务
    try {
      const pythonResult = await pythonProcessService.startPythonService({
        port: wsInfo.port,
        autoRestart: true,
        maxRestarts: 3,
      });
      if (pythonResult.success) {
        console.log(`[Main] Python 服务已自动启动，PID: ${pythonResult.pid}`);
      } else {
        console.warn(`[Main] Python 服务自动启动失败: ${pythonResult.error}`);
      }
    } catch (pythonError) {
      console.warn("[Main] Python 服务自动启动异常:", pythonError);
    }

    // 自动启动 OCR 模块（如果已安装）
    try {
      const ocrStatus = moduleManager.getModuleStatus("ocr");
      if (ocrStatus.installed) {
        console.log("[Main] 检测到 OCR 模块已安装，正在自动启动...");
        const ocrResult = await moduleManager.startOcrModule();
        if (ocrResult.success) {
          console.log(`[Main] OCR 模块已自动启动，端口: ${ocrResult.port}`);
        } else {
          console.warn(`[Main] OCR 模块自动启动失败: ${ocrResult.error}`);
        }
      } else {
        console.log("[Main] OCR 模块未安装，跳过自动启动");
      }
    } catch (ocrError) {
      console.warn("[Main] OCR 模块自动启动异常:", ocrError);
    }
  } catch (error) {
    console.error("[Main] WebSocket 服务启动失败:", error);
  }
}

/**
 * 停止后端服务
 */
async function stopBackendServices(): Promise<void> {
  // 停止待办提醒服务
  stopReminderService();

  // 停止 OCR 模块
  try {
    moduleManager.stopOcrModule();
    console.log("[Main] OCR 模块已停止");
  } catch (error) {
    console.warn("[Main] OCR 模块停止异常:", error);
  }

  // 停止 Python 服务
  pythonProcessService.cleanup();

  // 关闭 WebSocket 服务器
  await websocketService.stopWebSocketServer();

  // 关闭数据库连接
  closeDatabase();
}

// ==================== 应用生命周期 ====================

// 应用准备就绪
app.whenReady().then(async () => {
  // 初始化数据库
  initDatabase();

  // 注册 IPC 处理器
  registerAllIpcHandlers(mainWindow);

  // 启动后端服务
  await startBackendServices();

  // 启动待办提醒服务
  startReminderService();
  sendWelcomeNotification();

  // 创建主窗口
  createWindow();

  // macOS 激活应用时重新创建窗口
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭
app.on("window-all-closed", async () => {
  await stopBackendServices();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 应用退出前
app.on("before-quit", async () => {
  await stopBackendServices();
});
