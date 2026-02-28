/**
 * 待办浮窗服务
 *
 * 管理快速添加待办的浮窗窗口
 */

import { BrowserWindow, globalShortcut, ipcMain, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 开发环境 URL
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

// 浮窗窗口实例
let floatWindow: BrowserWindow | null = null;

// 快捷键
const SHORTCUT = "CommandOrControl+Shift+T";

// 窗口配置
const WINDOW_CONFIG = {
  width: 360,
  height: 480,
  minWidth: 300,
  minHeight: 400,
};

/**
 * 创建浮窗窗口
 */
function createFloatWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    minWidth: WINDOW_CONFIG.minWidth,
    minHeight: WINDOW_CONFIG.minHeight,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // 加载浮窗页面
  if (VITE_DEV_SERVER_URL) {
    window.loadURL(`${VITE_DEV_SERVER_URL}#/todo-float`);
  } else {
    window.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: "/todo-float",
    });
  }

  window.on("closed", () => {
    floatWindow = null;
  });

  return window;
}

/**
 * 显示浮窗
 */
export function showFloatWindow(): void {
  if (!floatWindow) {
    floatWindow = createFloatWindow();
  }

  if (floatWindow.isVisible()) {
    floatWindow.focus();
    return;
  }

  // 获取鼠标位置
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);

  // 计算窗口位置
  let x = cursorPoint.x;
  let y = cursorPoint.y;

  if (x + WINDOW_CONFIG.width > display.bounds.width + display.bounds.x) {
    x = display.bounds.width + display.bounds.x - WINDOW_CONFIG.width - 10;
  }

  if (y + WINDOW_CONFIG.height > display.bounds.height + display.bounds.y) {
    y = display.bounds.height + display.bounds.y - WINDOW_CONFIG.height - 10;
  }

  floatWindow.setPosition(x, y);
  floatWindow.show();
  floatWindow.focus();
}

/**
 * 显示浮窗并预选分类
 */
export function showFloatWindowWithCategory(categoryId: number): void {
  if (!floatWindow) {
    floatWindow = createFloatWindow();
  }

  // 如果窗口已显示且是同一个分类，聚焦即可
  if (floatWindow.isVisible()) {
    floatWindow.focus();
    return;
  }

  // 获取鼠标位置
  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);

  // 计算窗口位置
  let x = cursorPoint.x;
  let y = cursorPoint.y;

  if (x + WINDOW_CONFIG.width > display.bounds.width + display.bounds.x) {
    x = display.bounds.width + display.bounds.x - WINDOW_CONFIG.width - 10;
  }

  if (y + WINDOW_CONFIG.height > display.bounds.height + display.bounds.y) {
    y = display.bounds.height + display.bounds.y - WINDOW_CONFIG.height - 10;
  }

  floatWindow.setPosition(x, y);

  // 加载带分类参数的 URL
  if (VITE_DEV_SERVER_URL) {
    floatWindow.loadURL(
      `${VITE_DEV_SERVER_URL}#/todo-float?categoryId=${categoryId}`
    );
  } else {
    floatWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: `/todo-float?categoryId=${categoryId}`,
    });
  }

  floatWindow.show();
  floatWindow.focus();
}

/**
 * 隐藏浮窗
 */
export function hideFloatWindow(): void {
  if (floatWindow && floatWindow.isVisible()) {
    floatWindow.hide();
  }
}

/**
 * 切换浮窗显示状态
 */
export function toggleFloatWindow(): void {
  if (floatWindow && floatWindow.isVisible()) {
    hideFloatWindow();
  } else {
    showFloatWindow();
  }
}

/**
 * 获取浮窗窗口实例
 */
export function getFloatWindow(): BrowserWindow | null {
  return floatWindow;
}

/**
 * 注册全局快捷键
 */
export function registerShortcut(): boolean {
  try {
    const result = globalShortcut.register(SHORTCUT, () => {
      toggleFloatWindow();
    });

    if (result) {
      console.log(`[FloatWindowService] 快捷键 ${SHORTCUT} 已注册`);
    } else {
      console.warn(`[FloatWindowService] 快捷键 ${SHORTCUT} 注册失败`);
    }

    return result;
  } catch (error) {
    console.error("[FloatWindowService] 注册快捷键失败:", error);
    return false;
  }
}

/**
 * 注销全局快捷键
 */
export function unregisterShortcut(): void {
  try {
    globalShortcut.unregister(SHORTCUT);
    console.log(`[FloatWindowService] 快捷键 ${SHORTCUT} 已注销`);
  } catch (error) {
    console.error("[FloatWindowService] 注销快捷键失败:", error);
  }
}

/**
 * 启动浮窗服务
 */
export function startFloatWindowService(): void {
  // 注册 IPC 处理器
  ipcMain.handle("floatWindow:hide", () => {
    hideFloatWindow();
  });

  ipcMain.handle("floatWindow:show", () => {
    showFloatWindow();
  });

  ipcMain.handle("floatWindow:toggle", () => {
    toggleFloatWindow();
  });

  ipcMain.handle(
    "floatWindow:showWithCategory",
    (_event, categoryId: number) => {
      showFloatWindowWithCategory(categoryId);
    }
  );

  // 注册快捷键
  registerShortcut();

  console.log("[FloatWindowService] 浮窗服务已启动");
}

/**
 * 停止浮窗服务
 */
export function stopFloatWindowService(): void {
  // 注销快捷键
  unregisterShortcut();

  // 关闭浮窗
  if (floatWindow) {
    floatWindow.close();
    floatWindow = null;
  }

  // 移除 IPC 处理器
  ipcMain.removeHandler("floatWindow:hide");
  ipcMain.removeHandler("floatWindow:show");
  ipcMain.removeHandler("floatWindow:toggle");
  ipcMain.removeHandler("floatWindow:showWithCategory");

  console.log("[FloatWindowService] 浮窗服务已停止");
}

export default {
  startFloatWindowService,
  stopFloatWindowService,
  showFloatWindow,
  showFloatWindowWithCategory,
  hideFloatWindow,
  toggleFloatWindow,
  getFloatWindow,
  registerShortcut,
  unregisterShortcut,
};
