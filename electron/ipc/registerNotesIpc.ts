/**
 * Notes 笔记模块 IPC 处理器
 *
 * 处理笔记文件夹管理、文件操作、设置存储等
 */

import { ipcMain } from "electron";
import * as notesService from "../services/notesService";
import * as notesVectorService from "../services/notesVectorService";

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
  ipcMain.handle("notes:setRootPath", async (_event, rootPath: string) => {
    const result = notesService.setRootPath(rootPath);
    // 设置新根目录时，触发全量索引
    if (result) {
      // 异步执行全量索引，不阻塞主流程
      notesVectorService.indexAllNotes(rootPath).catch((err) => {
        console.error("[NotesIpc] 全量索引笔记失败:", err);
      });
    }
    return result;
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

  // 强制创建文件夹（覆盖或创建副本）
  ipcMain.handle(
    "notes:createFolderForce",
    (
      _event,
      parentPath: string | null,
      folderName: string,
      mode: "overwrite" | "copy"
    ) => {
      return notesService.createFolderForce(parentPath, folderName, mode);
    }
  );

  // 创建笔记
  ipcMain.handle(
    "notes:createNote",
    async (
      _event,
      parentPath: string | null,
      fileName: string,
      content?: string
    ) => {
      const result = notesService.createNote(parentPath, fileName, content);
      // 创建笔记成功后，索引到向量存储
      if (result.success && result.path && content) {
        await notesVectorService.indexNote(result.path, content);
      }
      return result;
    }
  );

  // 强制创建笔记（覆盖或创建副本）
  ipcMain.handle(
    "notes:createNoteForce",
    async (
      _event,
      parentPath: string | null,
      fileName: string,
      mode: "overwrite" | "copy",
      content?: string
    ) => {
      const result = notesService.createNoteForce(
        parentPath,
        fileName,
        mode,
        content
      );
      // 创建笔记成功后，索引到向量存储
      if (result.success && result.path && content) {
        await notesVectorService.indexNote(result.path, content);
      }
      return result;
    }
  );

  // 读取文件
  ipcMain.handle("notes:readFile", (_event, filePath: string) => {
    return notesService.readFile(filePath);
  });

  // 保存文件
  ipcMain.handle(
    "notes:saveFile",
    async (_event, filePath: string, content: string) => {
      const result = notesService.saveFile(filePath, content);
      // 保存成功后，更新向量索引
      if (result.success) {
        await notesVectorService.indexNote(filePath, content);
      }
      return result;
    }
  );

  // 重命名
  ipcMain.handle(
    "notes:renameItem",
    async (_event, oldPath: string, newName: string) => {
      const result = notesService.renameItem(oldPath, newName);
      // 重命名成功后，更新向量索引
      if (result.success && result.newPath) {
        // 删除旧路径的向量
        await notesVectorService.deleteNoteFromVectorstore(oldPath);
        // 读取新文件内容并重新索引
        try {
          const fileResult = notesService.readFile(result.newPath);
          if (fileResult.success && fileResult.content) {
            await notesVectorService.indexNote(
              result.newPath,
              fileResult.content
            );
          }
        } catch (err) {
          console.error("[NotesIpc] 重命名后重新索引失败:", err);
        }
      }
      return result;
    }
  );

  // 删除
  ipcMain.handle("notes:deleteItem", async (_event, itemPath: string) => {
    const result = notesService.deleteItem(itemPath);
    // 删除成功后，从向量存储中删除
    if (result.success) {
      await notesVectorService.deleteNoteFromVectorstore(itemPath);
    }
    return result;
  });

  // 获取文件信息
  ipcMain.handle("notes:getFileInfo", (_event, filePath: string) => {
    return notesService.getFileInfo(filePath);
  });

  // ========== 向量索引操作 ==========

  // 索引单个笔记
  ipcMain.handle(
    "notes:indexNote",
    async (_event, filePath: string, content: string) => {
      return await notesVectorService.indexNote(filePath, content);
    }
  );

  // 全量索引笔记
  ipcMain.handle("notes:indexAllNotes", async (_event, rootPath: string) => {
    return await notesVectorService.indexAllNotes(rootPath);
  });

  // 获取索引统计
  ipcMain.handle("notes:getIndexStats", async () => {
    return await notesVectorService.getNotesStats();
  });

  console.log("[IPC] Notes 模块 IPC 处理器已注册");
}
