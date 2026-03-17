/**
 * PDF 解析 IPC 处理器
 *
 * 处理 PDF 文件解析、结构化数据提取等
 */

import { ipcMain } from "electron";

/**
 * PDF 解析结果类型
 */
interface PdfParseResult {
  success: boolean;
  data?: {
    success: boolean;
    fileName: string;
    totalPages: number;
    pages: Array<{
      pageNumber: number;
      width: number;
      height: number;
      blocks: Array<{
        id: string;
        type: string;
        text: string;
        bbox: [number, number, number, number];
        pageNumber: number;
        fontSize?: number;
        confidence?: number;
      }>;
    }>;
    isScanned: boolean;
    error?: string;
  };
  error?: string;
}

/**
 * PDF 服务状态类型
 */
interface PdfStatus {
  success: boolean;
  data?: {
    available: boolean;
    message: string;
  };
  error?: string;
}

/**
 * 注册 PDF 相关 IPC 处理器
 */
export function registerPdfIpc(): void {
  // 获取 PDF 服务状态
  ipcMain.handle("pdf:status", async (): Promise<PdfStatus> => {
    try {
      const { get } = await import("../services/pythonApiClient");
      const response = await get<{ available: boolean; message: string }>(
        "/api/pdf/status",
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            available: response.data.available,
            message: response.data.message,
          },
        };
      }

      return {
        success: false,
        error: response.error || "无法获取 PDF 服务状态",
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  });

  // 解析 PDF Base64 数据（超时时间 120 秒，PDF 解析可能较慢）
  ipcMain.handle(
    "pdf:parse",
    async (
      _event,
      pdfBase64: string,
      useOcr: boolean = false,
    ): Promise<PdfParseResult> => {
      try {
        const { post } = await import("../services/pythonApiClient");
        const response = await post<PdfParseResult["data"]>(
          "/api/pdf/parse",
          { pdf_base64: pdfBase64, use_ocr: useOcr },
          { timeout: 120000 },
        );

        if (response.success && response.data) {
          return {
            success: true,
            data: response.data,
          };
        }

        return {
          success: false,
          error: response.error || "PDF 解析失败",
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    },
  );

  // 解析 PDF 文件（超时时间 120 秒）
  ipcMain.handle(
    "pdf:parseFile",
    async (
      _event,
      filePath: string,
      useOcr: boolean = false,
    ): Promise<PdfParseResult> => {
      try {
        const { post } = await import("../services/pythonApiClient");
        const response = await post<PdfParseResult["data"]>(
          "/api/pdf/parse-file",
          { file_path: filePath, use_ocr: useOcr },
          { timeout: 120000 },
        );

        if (response.success && response.data) {
          return {
            success: true,
            data: response.data,
          };
        }

        return {
          success: false,
          error: response.error || "PDF 解析失败",
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    },
  );
}
