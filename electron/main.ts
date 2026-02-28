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

import { app, BrowserWindow, Menu, ipcMain, nativeTheme, nativeImage } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

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
import {
  startTrayService,
  stopTrayService,
  setMainWindow,
} from "./services/trayService";
import {
  startFloatWindowService,
  stopFloatWindowService,
} from "./services/floatWindowService";
import {
  registerCategoryFloatIpc,
  restoreAllFloatWindows,
  stopCategoryFloatService,
  notifyThemeChangeToAllFloats,
} from "./services/categoryFloatService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 开发环境 URL
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

// 主窗口实例
let mainWindow: BrowserWindow | null = null;

// 是否正在退出应用
let isQuitting = false;

/**
 * 获取窗口图标
 */
function getWindowIcon(): Electron.NativeImage | undefined {
  // Windows 需要设置窗口图标
  if (process.platform !== "win32") {
    return undefined;
  }

  const possiblePaths = [
    // 开发环境
    path.join(__dirname, "../resources/icons/icon-64.png"),
    path.join(__dirname, "../resources/icon.png"),
    path.join(__dirname, "../../resources/icons/icon-64.png"),
    path.join(__dirname, "../../resources/icon.png"),
    // 生产环境
    path.join(process.resourcesPath, "icons/icon-64.png"),
    path.join(process.resourcesPath, "icon.png"),
  ];

  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      console.log(`[Main] 找到窗口图标: ${iconPath}`);
      return nativeImage.createFromPath(iconPath);
    }
  }

  console.warn("[Main] 未找到窗口图标");
  return undefined;
}

/**
 * 创建主窗口
 */
function createWindow(): void {
  const icon = getWindowIcon();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // 无边框窗口
    transparent: false,
    icon,
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

  // 窗口关闭时：如果正在退出则关闭，否则隐藏
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      console.log("[Main] 窗口已隐藏（非退出）");
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * 显示主窗口
 */
function showMainWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
  } else {
    createWindow();
  }
}

/**
 * 隐藏主窗口
 */
function hideMainWindow(): void {
  if (mainWindow) {
    mainWindow.hide();
  }
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

  // 注册窗口控制 IPC
  registerWindowControlIpc();

  // 启动后端服务
  await startBackendServices();

  // 启动待办提醒服务
  startReminderService();
  sendWelcomeNotification();

  // 创建主窗口
  createWindow();

  // 设置托盘服务的主窗口引用
  if (mainWindow) {
    setMainWindow(mainWindow);
  }

  // 启动托盘服务
  startTrayService();

  // 启动浮窗服务
  startFloatWindowService();

  // 注册分组浮窗 IPC 处理器
  registerCategoryFloatIpc();

  // 延迟恢复分组浮窗（确保数据库已就绪）
  setTimeout(() => {
    restoreAllFloatWindows();
  }, 500);

  // 监听系统主题变化，通知所有浮窗
  nativeTheme.on("updated", () => {
    const theme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
    // 只有当用户设置为跟随系统时才通知（这里简化处理，总是通知）
    notifyThemeChangeToAllFloats(theme);
  });

  // macOS 激活应用时显示窗口（点击 Dock 图标）
  app.on("activate", () => {
    showMainWindow();
  });
});

// 应用退出前
app.on("before-quit", async () => {
  isQuitting = true;

  // 停止托盘和浮窗服务
  stopTrayService();
  stopFloatWindowService();
  stopCategoryFloatService();

  await stopBackendServices();
});

/**
 * 注册窗口控制 IPC 处理器
 */
function registerWindowControlIpc(): void {
  // 最小化窗口
  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });

  // 最大化/还原窗口
  ipcMain.handle("window:toggleMaximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow?.maximize();
      return true;
    }
  });

  // 关闭窗口（隐藏）
  ipcMain.handle("window:close", () => {
    hideMainWindow();
  });

  // 显示窗口
  ipcMain.handle("window:show", () => {
    showMainWindow();
  });

  // 检查窗口是否最大化
  ipcMain.handle("window:isMaximized", () => {
    return mainWindow?.isMaximized() || false;
  });

  console.log("[Main] 窗口控制 IPC 已注册");
}
