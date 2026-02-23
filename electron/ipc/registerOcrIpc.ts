/**
 * OCR 识别 IPC 处理器
 *
 * 处理图片文字识别、结果保存到知识库等
 */

import { ipcMain } from "electron";

/**
 * OCR 识别结果类型
 */
interface OcrResult {
  success: boolean;
  text: string;
  blocks: Array<{ text: string; confidence: number; box: number[][] }>;
  error?: string;
}

/**
 * OCR 保存到知识库结果类型
 */
interface OcrSaveResult {
  success: boolean;
  document_id?: string;
  file_name?: string;
  chunk_count?: number;
  error?: string;
}

/**
 * OCR 服务状态类型
 */
interface OcrStatus {
  available: boolean;
  message: string;
}

/**
 * 注册 OCR 相关 IPC 处理器
 */
export function registerOcrIpc(): void {
  // OCR 识别 Base64 图片
  ipcMain.handle("ocr:recognize", async (_event, imageBase64: string): Promise<OcrResult> => {
    try {
      const { post } = await import("../services/pythonApiClient");
      const response = await post<{
        success: boolean;
        text: string;
        blocks: Array<{ text: string; confidence: number; box: number[][] }>;
        error?: string;
      }>("/api/ocr/recognize", { image_base64: imageBase64 });

      if (response.success && response.data) {
        return {
          success: true,
          text: response.data.text || "",
          blocks: response.data.blocks || [],
          error: response.data.error,
        };
      }

      return {
        success: false,
        text: "",
        blocks: [],
        error: response.error || "OCR 识别失败",
      };
    } catch (error) {
      return {
        success: false,
        text: "",
        blocks: [],
        error: String(error),
      };
    }
  });

  // OCR 识别图片文件
  ipcMain.handle("ocr:recognizeFile", async (_event, filePath: string): Promise<OcrResult> => {
    try {
      const { get } = await import("../services/pythonApiClient");
      const response = await get<{
        success: boolean;
        text: string;
        blocks: Array<{ text: string; confidence: number; box: number[][] }>;
        error?: string;
      }>(`/api/ocr/recognize-file?file_path=${encodeURIComponent(filePath)}`);

      if (response.success && response.data) {
        return {
          success: true,
          text: response.data.text || "",
          blocks: response.data.blocks || [],
          error: response.data.error,
        };
      }

      return {
        success: false,
        text: "",
        blocks: [],
        error: response.error || "OCR 识别失败",
      };
    } catch (error) {
      return {
        success: false,
        text: "",
        blocks: [],
        error: String(error),
      };
    }
  });

  // 获取 OCR 服务状态
  ipcMain.handle("ocr:status", async (): Promise<OcrStatus> => {
    try {
      const { get } = await import("../services/pythonApiClient");
      const response = await get<{ available: boolean; message: string }>(
        "/api/ocr/status"
      );

      if (response.success && response.data) {
        return {
          available: response.data.available,
          message: response.data.message,
        };
      }

      return {
        available: false,
        message: response.error || "无法获取 OCR 服务状态",
      };
    } catch (error) {
      return {
        available: false,
        message: String(error),
      };
    }
  });

  // OCR 结果保存到知识库
  ipcMain.handle(
    "ocr:saveToKnowledge",
    async (_event, knowledgeId: string, title: string, content: string): Promise<OcrSaveResult> => {
      try {
        const { post } = await import("../services/pythonApiClient");
        const response = await post<{
          success: boolean;
          document_id?: string;
          file_name?: string;
          chunk_count?: number;
          error?: string;
        }>("/api/ocr/save-to-knowledge", {
          knowledge_id: knowledgeId,
          title,
          content,
        });

        if (response.success && response.data) {
          return {
            success: true,
            document_id: response.data.document_id,
            file_name: response.data.file_name,
            chunk_count: response.data.chunk_count,
          };
        }

        return {
          success: false,
          error: response.error || "保存失败",
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }
  );
}
