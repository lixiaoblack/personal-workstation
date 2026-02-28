/**
 * 系统托盘服务
 *
 * 管理系统托盘图标和菜单
 */

import { Tray, Menu, nativeImage, BrowserWindow, app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 托盘实例
let tray: Tray | null = null;

// 主窗口引用
let mainWindow: BrowserWindow | null = null;

/**
 * 设置主窗口引用
 */
export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

/**
 * 获取托盘图标路径
 */
function getTrayIconPath(): string {
  // 开发环境: __dirname = dist-electron/
  // 生产环境: __dirname = app.asar/dist-electron/

  const possiblePaths = [
    // 开发环境
    path.join(__dirname, "../resources/icon.png"),
    path.join(__dirname, "../../resources/icon.png"),
    // 生产环境
    path.join(process.resourcesPath, "icon.png"),
    path.join(process.resourcesPath, "resources/icon.png"),
  ];

  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      console.log(`[TrayService] 找到托盘图标: ${iconPath}`);
      return iconPath;
    }
  }

  console.warn("[TrayService] 未找到托盘图标，使用默认路径");
  return path.join(__dirname, "../resources/icon.png");
}

/**
 * 获取托盘图标
 */
function getTrayIcon(): Electron.NativeImage {
  const iconPath = getTrayIconPath();

  try {
    const icon = nativeImage.createFromPath(iconPath);
    // macOS 需要调整为合适的大小
    if (process.platform === "darwin") {
      return icon.resize({ width: 16, height: 16 });
    }
    return icon;
  } catch (error) {
    console.error("[TrayService] 加载托盘图标失败:", error);
    // 返回空图标
    return nativeImage.createEmpty();
  }
}

/**
 * 创建托盘菜单
 */
function createTrayMenu(): Menu {
  const template: Array<Electron.MenuItemConstructorOptions> = [
    {
      label: "新建待办",
      click: () => {
        // 打开主窗口并跳转到待办页面，触发新建
        showMainWindow("/todo?action=new");
      },
    },
    {
      label: "查看待办列表",
      click: () => {
        showMainWindow("/todo");
      },
    },
    { type: "separator" },
    {
      label: "快速添加浮窗",
      click: () => {
        showTodoFloatWindow();
      },
    },
    { type: "separator" },
    {
      label: "打开主窗口",
      click: () => {
        showMainWindow();
      },
    },
    {
      label: "设置",
      click: () => {
        showMainWindow("/settings");
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.quit();
      },
    },
  ];

  return Menu.buildFromTemplate(template);
}

/**
 * 显示主窗口
 */
function showMainWindow(route?: string): void {
  console.log(`[TrayService] showMainWindow 被调用, route: ${route || "无"}`);

  if (!mainWindow) {
    console.warn("[TrayService] mainWindow 为空");
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();

  // 如果指定了路由，发送 IPC 消息切换路由
  if (route) {
    mainWindow.webContents.send("app:navigate", route);
  }
}

/**
 * 显示待办浮窗
 */
function showTodoFloatWindow(): void {
  console.log("[TrayService] showTodoFloatWindow 被调用");

  // 动态导入浮窗服务，避免循环依赖
  import("./floatWindowService")
    .then((floatService) => {
      floatService.showFloatWindow();
    })
    .catch((err) => {
      console.error("[TrayService] 加载浮窗服务失败:", err);
    });
}

/**
 * 启动托盘服务
 */
export function startTrayService(): void {
  if (tray) {
    console.log("[TrayService] 托盘已存在，跳过创建");
    return;
  }

  const icon = getTrayIcon();

  // 检查图标是否为空
  if (icon.isEmpty()) {
    console.error("[TrayService] 托盘图标为空，可能加载失败");
  } else {
    console.log(
      `[TrayService] 图标大小: ${icon.getSize().width}x${icon.getSize().height}`
    );
  }

  tray = new Tray(icon);

  tray.setToolTip("Personal Workstation - 待办提醒");
  tray.setContextMenu(createTrayMenu());

  // macOS: 右键点击显示菜单（默认行为）
  // Windows: 左键点击显示菜单
  // 双击托盘图标显示快速添加浮窗
  tray.on("double-click", () => {
    showTodoFloatWindow();
  });

  console.log("[TrayService] 托盘服务已启动");
}

/**
 * 停止托盘服务
 */
export function stopTrayService(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  console.log("[TrayService] 托盘服务已停止");
}

/**
 * 更新托盘图标提示文字
 */
export function updateTrayTooltip(tooltip: string): void {
  if (tray) {
    tray.setToolTip(tooltip);
  }
}

/**
 * 更新待办数量显示
 */
export function updateTodoCount(count: number): void {
  const tooltip =
    count > 0
      ? `Personal Workstation - ${count} 个待办事项`
      : "Personal Workstation - 待办提醒";
  updateTrayTooltip(tooltip);
}

export default {
  startTrayService,
  stopTrayService,
  setMainWindow,
  updateTrayTooltip,
  updateTodoCount,
};
