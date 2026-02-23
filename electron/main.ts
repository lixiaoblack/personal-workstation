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

import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { initDatabase, closeDatabase } from "./database/index";
import * as websocketService from "./services/websocketService";
import * as pythonProcessService from "./services/pythonProcessService";
import { registerAllIpcHandlers } from "./ipc";

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
  } catch (error) {
    console.error("[Main] WebSocket 服务启动失败:", error);
  }
}

/**
 * 停止后端服务
 */
async function stopBackendServices(): Promise<void> {
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
