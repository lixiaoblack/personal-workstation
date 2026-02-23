/**
 * 用户认证相关 IPC 处理器
 *
 * 处理用户登录、注册、登出、Token 验证等
 */

import { ipcMain } from "electron";
import * as userService from "../services/userService";
import * as storageService from "../services/storageService";
import * as avatarService from "../services/avatarService";
import type { BrowserWindow } from "electron";

// 当前登录用户的 Token
let currentToken: string | null = null;

/**
 * 获取当前 Token
 */
export function getCurrentToken(): string | null {
  return currentToken;
}

/**
 * 设置当前 Token
 */
export function setCurrentToken(token: string | null): void {
  currentToken = token;
}

/**
 * 获取当前用户
 */
export function getCurrentUser() {
  if (!currentToken) {
    return null;
  }
  return userService.validateToken(currentToken);
}

/**
 * 注册用户认证相关 IPC 处理器
 */
export function registerUserIpc(mainWindow: BrowserWindow | null): void {
  // 用户登录
  ipcMain.handle("user:login", async (_event, credentials) => {
    const result = userService.login(credentials);
    if (result.success && result.token) {
      currentToken = result.token;
    }
    return result;
  });

  // 用户注册
  ipcMain.handle("user:register", async (_event, data) => {
    const result = userService.register(data);
    if (result.success && result.token) {
      currentToken = result.token;
    }
    return result;
  });

  // 用户登出
  ipcMain.handle("user:logout", async () => {
    if (currentToken) {
      const success = userService.logout(currentToken);
      currentToken = null;
      return success;
    }
    return true;
  });

  // 获取当前用户
  ipcMain.handle("user:getCurrent", async () => {
    if (!currentToken) {
      return null;
    }
    return userService.validateToken(currentToken);
  });

  // 验证 Token
  ipcMain.handle("user:validateToken", async (_event, token: string) => {
    const user = userService.validateToken(token);
    if (user) {
      currentToken = token;
    }
    return user;
  });

  // 更新用户资料
  ipcMain.handle("user:updateProfile", async (_event, data) => {
    if (!currentToken) {
      return null;
    }
    const user = userService.validateToken(currentToken);
    if (!user) {
      return null;
    }
    return userService.updateProfile(user.id, data);
  });

  // 更新密码
  ipcMain.handle("user:updatePassword", async (_event, data) => {
    if (!currentToken) {
      return { success: false, error: "未登录" };
    }
    const user = userService.validateToken(currentToken);
    if (!user) {
      return { success: false, error: "用户不存在" };
    }
    const result = userService.updatePassword(user.id, data);
    if (result.success) {
      currentToken = null; // 强制重新登录
    }
    return result;
  });

  // 重置密码
  ipcMain.handle("user:resetPassword", async (_event, data) => {
    return userService.resetPassword(data);
  });

  // 检查是否已初始化
  ipcMain.handle("user:isInitialized", async () => {
    return userService.isInitialized();
  });

  // 检查用户名是否存在
  ipcMain.handle("user:checkUsername", async (_event, username: string) => {
    return userService.checkUsernameExists(username);
  });

  // ========== 存储管理 ==========

  // 获取存储信息
  ipcMain.handle("storage:getInfo", async () => {
    return storageService.getStorageInfo();
  });

  // 清理缓存
  ipcMain.handle("storage:clearCache", async () => {
    return storageService.clearCache();
  });

  // ========== 媒体权限管理（macOS）==========

  // 请求麦克风权限
  ipcMain.handle("media:askMicrophoneAccess", async () => {
    if (process.platform === "darwin") {
      try {
        const { systemPreferences } = await import("electron");
        const granted = await systemPreferences.askForMediaAccess("microphone");
        console.log("[UserIpc] 麦克风权限请求结果:", granted);
        return granted;
      } catch (error) {
        console.error("[UserIpc] 请求麦克风权限失败:", error);
        return false;
      }
    }
    return true;
  });

  // 获取麦克风权限状态
  ipcMain.handle("media:getMicrophoneAccessStatus", async () => {
    if (process.platform === "darwin") {
      try {
        const { systemPreferences } = await import("electron");
        const status = systemPreferences.getMediaAccessStatus("microphone");
        console.log("[UserIpc] 麦克风权限状态:", status);
        return status;
      } catch (error) {
        console.error("[UserIpc] 获取麦克风权限状态失败:", error);
        return "unknown";
      }
    }
    return "granted";
  });

  // ========== 头像管理 ==========

  // 选择头像
  ipcMain.handle("avatar:select", async () => {
    return avatarService.selectAvatar(mainWindow);
  });
}
