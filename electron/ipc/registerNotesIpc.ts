/**
 * Notes 笔记模块 IPC 处理器
 *
 * 处理笔记文件夹管理、文件操作、设置存储等
 */

import { ipcMain } from "electron";
import * as notesService from "../services/notesService";

export function registerNotesIpc(): void {
  // ========== 设置管理 ==========

  // 获取设置
  ipcMain.handle("notes:getSetting", (_event, key: string) => {
    return notesService.getSetting(key);
  });

  // 保存设置
  ipcMain.handle("notes:saveSetting", (_event, key: string, value: string) => {
    return notesService.saveSetting(key, value);
  });

  // 获取根目录路径
  ipcMain.handle("notes:getRootPath", () => {
    return notesService.getRootPath();
  });

  // 设置根目录路径
  ipcMain.handle("notes:setRootPath", (_event, rootPath: string) => {
    return notesService.setRootPath(rootPath);
  });

  // 检查是否已设置根目录
  ipcMain.handle("notes:hasRootPath", () => {
    return notesService.hasRootPath();
  });

  // ========== 文件夹选择 ==========

  // 选择文件夹对话框
  ipcMain.handle("notes:selectFolder", async () => {
    return await notesService.selectFolder();
  });

  // 验证文件夹
  ipcMain.handle("notes:validateFolder", (_event, folderPath: string) => {
    return notesService.validateFolder(folderPath);
  });

  // ========== 文件扫描 ==========

  // 扫描文件夹
  ipcMain.handle("notes:scanFolder", (_event, rootPath: string) => {
    return notesService.scanFolder(rootPath);
  });

  // 获取文件树
  ipcMain.handle("notes:getFileTree", () => {
    return notesService.getFileTree();
  });

  // ========== 文件操作 ==========

  // 创建文件夹
  ipcMain.handle(
    "notes:createFolder",
    (_event, parentPath: string | null, folderName: string) => {
      return notesService.createFolder(parentPath, folderName);
    }
  );

  // 创建笔记
  ipcMain.handle(
    "notes:createNote",
    (
      _event,
      parentPath: string | null,
      fileName: string,
      content?: string
    ) => {
      return notesService.createNote(parentPath, fileName, content);
    }
  );

  // 读取文件
  ipcMain.handle("notes:readFile", (_event, filePath: string) => {
    return notesService.readFile(filePath);
  });

  // 保存文件
  ipcMain.handle(
    "notes:saveFile",
    (_event, filePath: string, content: string) => {
      return notesService.saveFile(filePath, content);
    }
  );

  // 重命名
  ipcMain.handle(
    "notes:renameItem",
    (_event, oldPath: string, newName: string) => {
      return notesService.renameItem(oldPath, newName);
    }
  );

  // 删除
  ipcMain.handle("notes:deleteItem", (_event, itemPath: string) => {
    return notesService.deleteItem(itemPath);
  });

  // 获取文件信息
  ipcMain.handle("notes:getFileInfo", (_event, filePath: string) => {
    return notesService.getFileInfo(filePath);
  });

  console.log("[IPC] Notes 模块 IPC 处理器已注册");
}
