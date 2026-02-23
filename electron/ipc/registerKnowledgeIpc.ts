/**
 * 知识库管理 IPC 处理器
 *
 * 处理知识库创建、删除、文档管理、搜索等
 */

import { ipcMain, dialog } from "electron";
import * as knowledgeService from "../services/knowledgeService";
import * as fileService from "../services/fileService";
import * as websocketService from "../services/websocketService";
import { MessageType } from "../types/websocket";
import type { BrowserWindow } from "electron";

/**
 * 注册知识库相关 IPC 处理器
 */
export function registerKnowledgeIpc(mainWindow: BrowserWindow | null): void {
  // ========== 知识库管理 ==========

  // 创建知识库
  ipcMain.handle("knowledge:create", async (_event, input) => {
    try {
      // 先在本地数据库创建，生成 ID
      const knowledge = await knowledgeService.createKnowledge(
        input.name,
        input.description,
        input.embeddingModel,
        input.embeddingModelName
      );

      // 检查 Python 服务是否连接
      const wsInfo = websocketService.getServerInfo();
      if (wsInfo.pythonConnected) {
        // 通过 WebSocket 创建向量存储，使用本地数据库生成的 ID
        try {
          await websocketService.sendKnowledgeRequest(
            MessageType.KNOWLEDGE_CREATE,
            {
              knowledgeId: knowledge.id,
              name: input.name,
              description: input.description,
              embeddingModel: input.embeddingModel,
              embeddingModelName: input.embeddingModelName,
            }
          );
        } catch (pyError) {
          console.error("[KnowledgeIpc] Python 端创建向量存储失败:", pyError);
          // Python 失败不回滚本地记录，用户可以稍后重试
        }
      }

      return {
        success: true,
        knowledge: [knowledge],
        count: 1,
      };
    } catch (error) {
      console.error("[KnowledgeIpc] 创建知识库失败:", error);
      return {
        success: false,
        knowledge: [],
        count: 0,
        error: String(error),
      };
    }
  });

  // 删除知识库
  ipcMain.handle("knowledge:delete", async (_event, knowledgeId: string) => {
    try {
      const wsInfo = websocketService.getServerInfo();
      if (wsInfo.pythonConnected) {
        await websocketService.sendKnowledgeRequest(
          MessageType.KNOWLEDGE_DELETE,
          { knowledgeId }
        );
      }

      // 删除知识库文件目录
      const deleteFilesResult = fileService.deleteKnowledgeFiles(knowledgeId);
      if (!deleteFilesResult.success) {
        console.error(
          "[KnowledgeIpc] 删除知识库文件目录失败:",
          deleteFilesResult.error
        );
      }

      const success = await knowledgeService.deleteKnowledge(knowledgeId);
      return { success };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 列出知识库
  ipcMain.handle("knowledge:list", async () => {
    try {
      const knowledge = await knowledgeService.listKnowledge();
      return {
        success: true,
        knowledge,
        count: knowledge.length,
      };
    } catch (error) {
      return {
        success: false,
        knowledge: [],
        count: 0,
        error: String(error),
      };
    }
  });

  // 获取知识库详情
  ipcMain.handle("knowledge:get", async (_event, knowledgeId: string) => {
    try {
      const knowledge = await knowledgeService.getKnowledge(knowledgeId);
      return {
        success: !!knowledge,
        knowledge: knowledge ? [knowledge] : [],
        count: knowledge ? 1 : 0,
        error: knowledge ? undefined : "知识库不存在",
      };
    } catch (error) {
      return {
        success: false,
        knowledge: [],
        count: 0,
        error: String(error),
      };
    }
  });

  // 选择知识库文件
  ipcMain.handle("knowledge:selectFiles", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "选择要添加的文档",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "支持的文档",
          extensions: ["md", "txt", "pdf", "json", "html", "png", "jpg", "jpeg", "bmp", "webp", "gif"],
        },
        { name: "Markdown", extensions: ["md"] },
        { name: "文本文件", extensions: ["txt"] },
        { name: "PDF", extensions: ["pdf"] },
        { name: "JSON", extensions: ["json"] },
        { name: "HTML", extensions: ["html", "htm"] },
        { name: "图片", extensions: ["png", "jpg", "jpeg", "bmp", "webp", "gif"] },
      ],
    });
    return result;
  });

  // ========== 知识库文件管理 ==========

  // 选择文件并保存到知识库
  ipcMain.handle(
    "knowledge:selectAndSaveFiles",
    async (_event, knowledgeId: string) => {
      try {
        const result = await fileService.selectFilesForKnowledge(knowledgeId);
        return {
          success: !result.canceled && result.files.length > 0,
          files: result.files,
          error: result.error,
        };
      } catch (error) {
        return { success: false, files: [], error: String(error) };
      }
    }
  );

  // 保存文件到知识库
  ipcMain.handle(
    "knowledge:saveFile",
    async (_event, knowledgeId: string, filePath: string) => {
      try {
        const metadata = await fileService.saveFileToKnowledge(
          knowledgeId,
          filePath
        );
        return { success: true, file: metadata };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 批量保存文件到知识库
  ipcMain.handle(
    "knowledge:saveFiles",
    async (_event, knowledgeId: string, filePaths: string[]) => {
      try {
        const result = await fileService.saveFilesToKnowledge(
          knowledgeId,
          filePaths
        );
        return {
          success: result.files.length > 0,
          files: result.files,
          errors: result.errors,
        };
      } catch (error) {
        return { success: false, files: [], errors: [String(error)] };
      }
    }
  );

  // 从剪贴板粘贴文件到知识库
  ipcMain.handle("knowledge:pasteFile", async (_event, knowledgeId: string) => {
    try {
      const metadata = await fileService.pasteFileFromClipboard(knowledgeId);
      if (metadata) {
        return { success: true, file: metadata };
      }
      return { success: false, error: "剪贴板中没有可粘贴的文件" };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 删除知识库中的单个文件
  ipcMain.handle(
    "knowledge:deleteFile",
    async (_event, knowledgeId: string, fileId: string) => {
      try {
        const result = fileService.deleteKnowledgeFile(knowledgeId, fileId);
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 获取知识库文件信息
  ipcMain.handle(
    "knowledge:getFileInfo",
    async (_event, knowledgeId: string, fileId: string) => {
      try {
        const metadata = fileService.getKnowledgeFileInfo(knowledgeId, fileId);
        return { success: !!metadata, file: metadata };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 获取知识库存储信息
  ipcMain.handle(
    "knowledge:getStorageInfo",
    async (_event, knowledgeId: string) => {
      try {
        const info = fileService.getKnowledgeStorageInfo(knowledgeId);
        return { success: true, ...info };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 获取所有知识库存储信息
  ipcMain.handle("knowledge:getAllStorageInfo", async () => {
    try {
      const info = fileService.getAllKnowledgeStorageInfo();
      return { success: true, ...info };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 读取文件内容
  ipcMain.handle(
    "file:readContent",
    async (_event, filePath: string, maxSize?: number) => {
      try {
        const result = fileService.readFileContent(filePath, maxSize);
        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // ========== 文档处理 ==========

  // 添加文档到知识库
  ipcMain.handle(
    "knowledge:addDocument",
    async (_event, knowledgeId: string, filePath: string) => {
      try {
        const wsInfo = websocketService.getServerInfo();
        if (!wsInfo.pythonConnected) {
          return {
            success: false,
            error: "Python 服务未连接，无法处理文档",
          };
        }

        const result = (await websocketService.sendKnowledgeRequest(
          MessageType.KNOWLEDGE_ADD_DOCUMENT,
          { knowledgeId, filePath }
        )) as {
          success: boolean;
          document?: unknown;
          error?: string;
        };

        // 如果 Python 端添加成功，同步保存到本地数据库
        if (result.success && result.document) {
          const doc = result.document as Record<string, unknown>;
          try {
            const fileName =
              (doc.fileName as string) ||
              filePath.split("/").pop() ||
              "unknown";
            const fileType =
              (doc.fileType as string) ||
              fileName.split(".").pop() ||
              "unknown";
            const fileSize = (doc.fileSize as number) || 0;
            const chunkCount = (doc.chunkCount as number) || 0;

            const document = knowledgeService.addDocument(
              knowledgeId,
              fileName,
              filePath,
              fileType,
              fileSize,
              chunkCount
            );

            return {
              success: true,
              document,
            };
          } catch (dbError) {
            console.error("[KnowledgeIpc] 保存文档到本地数据库失败:", dbError);
            return {
              success: true,
              document: result.document,
              warning: `文档已处理，但本地记录保存失败: ${
                dbError instanceof Error ? dbError.message : String(dbError)
              }`,
            };
          }
        }

        return result;
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 删除文档
  ipcMain.handle(
    "knowledge:removeDocument",
    async (_event, knowledgeId: string, documentId: string) => {
      try {
        const success = knowledgeService.removeDocument(
          knowledgeId,
          documentId
        );
        return { success };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }
  );

  // 搜索知识库
  ipcMain.handle(
    "knowledge:search",
    async (_event, knowledgeId: string, query: string, topK?: number) => {
      try {
        const wsInfo = websocketService.getServerInfo();
        if (!wsInfo.pythonConnected) {
          return {
            success: false,
            results: [],
            count: 0,
            error: "Python 服务未连接",
          };
        }

        return await websocketService.sendKnowledgeRequest(
          MessageType.KNOWLEDGE_SEARCH,
          { knowledgeId, query, topK: topK || 5 }
        );
      } catch (error) {
        return {
          success: false,
          results: [],
          count: 0,
          error: String(error),
        };
      }
    }
  );

  // 列出知识库文档
  ipcMain.handle(
    "knowledge:listDocuments",
    async (_event, knowledgeId: string) => {
      try {
        const documents = await knowledgeService.listDocuments(knowledgeId);
        return {
          success: true,
          documents,
          count: documents.length,
        };
      } catch (error) {
        return {
          success: false,
          documents: [],
          count: 0,
          error: String(error),
        };
      }
    }
  );
}
