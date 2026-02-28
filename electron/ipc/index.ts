/**
 * IPC 处理器模块统一导出
 *
 * 将所有 IPC 处理器集中管理和导出
 */

import type { BrowserWindow } from "electron";
import {
  registerUserIpc,
  getCurrentToken,
  setCurrentToken,
  getCurrentUser,
} from "./registerUserIpc";
import { registerModelIpc } from "./registerModelIpc";
import { registerKnowledgeIpc } from "./registerKnowledgeIpc";
import { registerMemoryIpc } from "./registerMemoryIpc";
import { registerOcrIpc } from "./registerOcrIpc";
import { registerPythonIpc } from "./registerPythonIpc";
import { registerSwaggerIpc } from "./registerSwaggerIpc";
import { registerPostmanIpc } from "./registerPostmanIpc";
import { registerModuleIpc } from "./registerModuleIpc";
import { registerNotesIpc } from "./registerNotesIpc";
import { registerTodoIpc } from "./registerTodoIpc";

// 导出用户认证相关函数
export { getCurrentToken, setCurrentToken, getCurrentUser };

/**
 * 注册所有 IPC 处理器
 *
 * @param mainWindow - 主窗口实例
 */
export function registerAllIpcHandlers(mainWindow: BrowserWindow | null): void {
  // 用户认证、存储、媒体权限
  registerUserIpc(mainWindow);

  // 模型配置和对话管理
  registerModelIpc();

  // 知识库管理
  registerKnowledgeIpc(mainWindow);

  // 记忆管理
  registerMemoryIpc();

  // OCR 识别
  registerOcrIpc();

  // Python 服务和 Ollama
  registerPythonIpc();

  // Swagger 解析
  registerSwaggerIpc();

  // SimplePostman 数据管理
  registerPostmanIpc();

  // 模块管理（OCR 等可选模块）
  registerModuleIpc();

  // Notes 笔记模块
  registerNotesIpc();

  // Todo 待办模块
  registerTodoIpc();

  console.log("[IPC] 所有 IPC 处理器已注册");
}
