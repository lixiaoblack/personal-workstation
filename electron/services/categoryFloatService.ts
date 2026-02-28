/**
 * 分组浮窗管理服务
 *
 * 管理待办分组的独立浮窗显示
 */

import { BrowserWindow, screen, ipcMain, nativeTheme } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listCategories,
  updateCategory,
  type TodoCategory,
} from "./todoService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 浮窗实例映射 (categoryId -> BrowserWindow)
const floatWindows: Map<number, BrowserWindow> = new Map();

// 应用是否正在退出（用于区分用户手动关闭和应用退出）
let isAppQuitting = false;

// 当前主题（由主窗口同步过来）
let currentTheme: "light" | "dark" = nativeTheme.shouldUseDarkColors
  ? "dark"
  : "light";

// 开发环境 URL
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

/**
 * 获取所有启用浮窗的分类
 */
export function getFloatedCategories(): TodoCategory[] {
  const categories = listCategories();
  return categories.filter((c) => c.floatWindowEnabled);
}

/**
 * 创建分组浮窗
 */
export function createCategoryFloatWindow(
  category: TodoCategory
): BrowserWindow | null {
  if (floatWindows.has(category.id)) {
    console.log(`[CategoryFloat] 分类 ${category.id} 的浮窗已存在`);
    return floatWindows.get(category.id)!;
  }

  const { width, height } = getInitialSize(category);
  const [x, y] = getInitialPosition(category, width, height);

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 200,
    minHeight: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: category.floatWindowAlwaysOnTop || false,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // 加载页面
  const route = `/category-float/${category.id}`;
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(`${VITE_DEV_SERVER_URL}#${route}`);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), { hash: route });
  }

  // 页面加载完成后立即发送当前主题
  win.webContents.on("did-finish-load", () => {
    win.webContents.send("theme-changed", currentTheme);
  });

  // 监听窗口移动，保存位置
  win.on("moved", () => {
    if (!win.isDestroyed()) {
      saveWindowPosition(category.id, win);
    }
  });

  // 监听窗口大小变化，保存大小
  win.on("resized", () => {
    if (!win.isDestroyed()) {
      saveWindowSize(category.id, win);
    }
  });

  // 监听窗口关闭
  win.on("closed", () => {
    floatWindows.delete(category.id);
    // 只有用户手动关闭时才更新数据库，应用退出时不更新（保留状态用于下次恢复）
    if (!isAppQuitting) {
      updateCategory(category.id, { floatWindowEnabled: false });
    }
  });

  floatWindows.set(category.id, win);

  return win;
}

/**
 * 关闭分组浮窗
 */
export function closeCategoryFloatWindow(categoryId: number): void {
  const win = floatWindows.get(categoryId);
  if (win) {
    win.close();
    floatWindows.delete(categoryId);
  }
}

/**
 * 关闭所有分组浮窗
 */
export function closeAllCategoryFloatWindows(): void {
  const categoryIds = Array.from(floatWindows.keys());
  for (const categoryId of categoryIds) {
    closeCategoryFloatWindow(categoryId);
  }
}

/**
 * 切换分组浮窗
 */
export function toggleCategoryFloatWindow(category: TodoCategory): void {
  if (floatWindows.has(category.id)) {
    closeCategoryFloatWindow(category.id);
    updateCategory(category.id, { floatWindowEnabled: false });
  } else {
    createCategoryFloatWindow(category);
    updateCategory(category.id, { floatWindowEnabled: true });
  }
}

/**
 * 设置浮窗是否置顶
 */
export function setCategoryFloatAlwaysOnTop(
  categoryId: number,
  alwaysOnTop: boolean
): void {
  const win = floatWindows.get(categoryId);
  if (win) {
    win.setAlwaysOnTop(alwaysOnTop);
  }
  updateCategory(categoryId, { floatWindowAlwaysOnTop: alwaysOnTop });
}

/**
 * 启动时恢复所有浮窗
 */
export function restoreAllFloatWindows(): void {
  try {
    const floatedCategories = getFloatedCategories();
    console.log(`[CategoryFloat] 恢复 ${floatedCategories.length} 个浮窗`);

    for (const category of floatedCategories) {
      createCategoryFloatWindow(category);
    }
  } catch (error) {
    console.error("[CategoryFloat] 恢复浮窗失败:", error);
  }
}

/**
 * 获取初始尺寸
 */
function getInitialSize(category: TodoCategory): {
  width: number;
  height: number;
} {
  return {
    width: category.floatWindowWidth || 320,
    height: category.floatWindowHeight || 400,
  };
}

/**
 * 获取初始位置
 */
function getInitialPosition(
  category: TodoCategory,
  width: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _height: number
): [number, number] {
  // 如果有保存的位置，优先使用
  if (
    category.floatWindowX !== undefined &&
    category.floatWindowY !== undefined &&
    category.floatWindowX !== null &&
    category.floatWindowY !== null
  ) {
    // 验证位置是否在屏幕范围内（宽松验证，允许部分超出）
    const displays = screen.getAllDisplays();
    const isValidPosition = displays.some((display) => {
      const { x, y, width: dWidth, height: dHeight } = display.bounds;
      // 只检查窗口左上角是否在某个屏幕范围内
      return (
        category.floatWindowX! >= x - width &&
        category.floatWindowX! <= x + dWidth &&
        category.floatWindowY! >= y &&
        category.floatWindowY! <= y + dHeight
      );
    });

    if (isValidPosition) {
      return [category.floatWindowX!, category.floatWindowY!];
    }
  }

  // 默认位置：屏幕右上角
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const x = screenWidth - width - 20;
  const y = 50;

  return [x, y];
}

/**
 * 保存窗口位置
 */
function saveWindowPosition(categoryId: number, win: BrowserWindow): void {
  const [x, y] = win.getPosition();
  updateCategory(categoryId, { floatWindowX: x, floatWindowY: y });
}

/**
 * 保存窗口大小
 */
function saveWindowSize(categoryId: number, win: BrowserWindow): void {
  const [width, height] = win.getSize();
  updateCategory(categoryId, {
    floatWindowWidth: width,
    floatWindowHeight: height,
  });
}

/**
 * 注册 IPC 处理器
 */
export function registerCategoryFloatIpc(): void {
  // 切换分类浮窗
  ipcMain.handle(
    "categoryFloat:toggle",
    (_event, categoryId: number, categoryData: TodoCategory) => {
      toggleCategoryFloatWindow(categoryData);
      return { success: true };
    }
  );

  // 关闭分类浮窗
  ipcMain.handle("categoryFloat:close", (_event, categoryId: number) => {
    closeCategoryFloatWindow(categoryId);
    return { success: true };
  });

  // 设置置顶
  ipcMain.handle(
    "categoryFloat:setAlwaysOnTop",
    (_event, categoryId: number, alwaysOnTop: boolean) => {
      setCategoryFloatAlwaysOnTop(categoryId, alwaysOnTop);
      return { success: true };
    }
  );

  // 获取所有浮窗分类
  ipcMain.handle("categoryFloat:getFloatedCategories", () => {
    return getFloatedCategories();
  });

  // 通知主题变化
  ipcMain.handle(
    "categoryFloat:notifyThemeChange",
    (_event, theme: "light" | "dark") => {
      notifyThemeChangeToAllFloats(theme);
      return { success: true };
    }
  );

  // 获取当前主题
  ipcMain.handle("categoryFloat:getCurrentTheme", () => {
    return currentTheme;
  });

  console.log("[CategoryFloat] IPC 处理器已注册");
}

/**
 * 停止分组浮窗服务
 */
export function stopCategoryFloatService(): void {
  isAppQuitting = true; // 标记应用正在退出，避免关闭窗口时重置 floatWindowEnabled
  closeAllCategoryFloatWindows();
  console.log("[CategoryFloat] 服务已停止");
}

/**
 * 获取当前主题
 */
export function getCurrentTheme(): "light" | "dark" {
  return currentTheme;
}

/**
 * 通知所有浮窗主题变化
 */
export function notifyThemeChangeToAllFloats(theme: "light" | "dark"): void {
  // 更新保存的主题
  currentTheme = theme;

  floatWindows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send("theme-changed", theme);
    }
  });
  console.log(
    `[CategoryFloat] 已通知 ${floatWindows.size} 个浮窗主题变化: ${theme}`
  );
}

export default {
  createCategoryFloatWindow,
  closeCategoryFloatWindow,
  closeAllCategoryFloatWindows,
  toggleCategoryFloatWindow,
  setCategoryFloatAlwaysOnTop,
  restoreAllFloatWindows,
  registerCategoryFloatIpc,
  stopCategoryFloatService,
  getFloatedCategories,
  notifyThemeChangeToAllFloats,
};
