/**
 * 存储管理服务
 * 提供缓存大小获取、清理等功能
 */
import { app, shell } from "electron";
import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";

// 存储信息接口
export interface StorageInfo {
  cacheSize: number; // 缓存大小（字节）
  totalSize: number; // 总大小（字节）
  cachePath: string; // 缓存路径
  dataSize: number; // 数据库大小（字节）
  logsSize: number; // 日志大小（字节）
  vectorDbSize: number; // 向量数据库大小（字节）
  vectorDbPath: string; // 向量数据库路径
}

// 数据清理结果
export interface ClearDataResult {
  success: boolean;
  clearedTables: string[];
  clearedVectorDb: boolean;
  error?: string;
}

/**
 * 递归计算目录大小
 */
function getDirectorySize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  let totalSize = 0;

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch {
    // 忽略无法访问的文件
  }

  return totalSize;
}

/**
 * 获取存储信息
 */
export function getStorageInfo(): StorageInfo {
  const userDataPath = app.getPath("userData");
  const dataPath = path.join(userDataPath, "data");
  const logsPath = path.join(userDataPath, "logs");
  const cachePath = path.join(userDataPath, "Cache");
  const gpuCachePath = path.join(userDataPath, "GPUCache");
  const codeCachePath = path.join(userDataPath, "Code Cache");
  const databasesPath = path.join(userDataPath, "databases");
  const localStoragePath = path.join(userDataPath, "Local Storage");
  const indexedDBPath = path.join(userDataPath, "IndexedDB");

  // 向量数据库路径
  const homePath = app.getPath("home");
  const vectorDbPath = path.join(
    homePath,
    ".personal-workstation",
    "knowledge"
  );

  // 计算各部分大小
  const cacheSize =
    getDirectorySize(cachePath) +
    getDirectorySize(gpuCachePath) +
    getDirectorySize(codeCachePath) +
    getDirectorySize(databasesPath) +
    getDirectorySize(localStoragePath) +
    getDirectorySize(indexedDBPath);

  const dataSize = getDirectorySize(dataPath);
  const logsSize = getDirectorySize(logsPath);
  const vectorDbSize = getDirectorySize(vectorDbPath);

  // 计算总大小（整个 userData 目录）
  const totalSize = getDirectorySize(userDataPath) + vectorDbSize;

  return {
    cacheSize,
    totalSize,
    cachePath: userDataPath,
    dataSize,
    logsSize,
    vectorDbSize,
    vectorDbPath,
  };
}

/**
 * 清理缓存
 * 返回清理后的大小（字节）
 */
export function clearCache(): {
  success: boolean;
  clearedSize: number;
  error?: string;
} {
  const userDataPath = app.getPath("userData");

  // 需要清理的目录
  const dirsToClear = ["Cache", "GPUCache", "Code Cache", "logs"];

  let clearedSize = 0;

  for (const dirName of dirsToClear) {
    const dirPath = path.join(userDataPath, dirName);

    if (fs.existsSync(dirPath)) {
      try {
        // 计算大小
        const size = getDirectorySize(dirPath);

        // 删除目录内容
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          try {
            fs.rmSync(filePath, { recursive: true, force: true });
          } catch {
            // 忽略无法删除的文件
          }
        }

        clearedSize += size;
      } catch {
        // 忽略错误
      }
    }
  }

  // 清理 localStorage 和 IndexedDB 中的非关键数据
  // 注意：不清理 data 目录，因为那是用户数据

  return {
    success: true,
    clearedSize,
  };
}

/**
 * 格式化字节大小为人类可读格式
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 获取数据库路径
 */
export function getDatabasePath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "data");
}

/**
 * 获取向量数据库路径
 */
export function getVectorDbPath(): string {
  const homePath = app.getPath("home");
  return path.join(homePath, ".personal-workstation", "knowledge");
}

/**
 * 打开目录
 */
export function openDirectory(dirPath: string): boolean {
  try {
    // 确保目录存在
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    shell.openPath(dirPath);
    return true;
  } catch (error) {
    console.error("打开目录失败:", error);
    return false;
  }
}

/**
 * 清除除用户信息外的所有数据
 * 包括：对话、消息、知识库、向量数据库、模型配置、待办、笔记等
 * 保留：用户信息、登录会话
 */
export function clearAllData(db: Database.Database): ClearDataResult {
  const clearedTables: string[] = [];
  let clearedVectorDb = false;

  try {
    // 要清除的表（保留 users 和 sessions）
    const tablesToClear = [
      "conversations",
      "messages",
      "conversation_summaries",
      "user_memory",
      "knowledge",
      "knowledge_documents",
      "model_configs",
      "todos",
      "todo_categories",
      "notes_files",
      "notes_settings",
      "agents",
      "agent_conversations",
      "agent_messages",
      "workflows",
      "postman_projects",
      "postman_groups",
      "postman_requests",
      "postman_settings",
      "postman_history",
    ];

    // 清除各表数据
    for (const table of tablesToClear) {
      try {
        db.exec(`DELETE FROM ${table}`);
        clearedTables.push(table);
      } catch {
        // 表可能不存在，忽略错误
      }
    }

    // 清除向量数据库
    const vectorDbPath = getVectorDbPath();
    if (fs.existsSync(vectorDbPath)) {
      try {
        const files = fs.readdirSync(vectorDbPath);
        for (const file of files) {
          const filePath = path.join(vectorDbPath, file);
          fs.rmSync(filePath, { recursive: true, force: true });
        }
        clearedVectorDb = true;
      } catch (error) {
        console.error("清除向量数据库失败:", error);
      }
    } else {
      clearedVectorDb = true; // 目录不存在视为已清理
    }

    return {
      success: true,
      clearedTables,
      clearedVectorDb,
    };
  } catch (error) {
    return {
      success: false,
      clearedTables,
      clearedVectorDb,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
