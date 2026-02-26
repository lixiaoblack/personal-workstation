/**
 * Swagger IPC 处理器
 */
import { ipcMain } from "electron";
import {
  parseSwaggerFromUrl,
  parseSwaggerFromFile,
  parseSwaggerFromContent,
  selectSwaggerFile,
  type SwaggerParseResult,
} from "../services/swaggerService";

/**
 * 注册 Swagger 相关的 IPC 处理器
 */
export function registerSwaggerIpc(): void {
  // 从 URL 解析 Swagger
  ipcMain.handle(
    "swagger:parseUrl",
    async (_event, url: string): Promise<SwaggerParseResult> => {
      return parseSwaggerFromUrl(url);
    }
  );

  // 从文件解析 Swagger
  ipcMain.handle(
    "swagger:parseFile",
    async (_event, filePath: string): Promise<SwaggerParseResult> => {
      return parseSwaggerFromFile(filePath);
    }
  );

  // 从内容解析 Swagger
  ipcMain.handle(
    "swagger:parseContent",
    async (
      _event,
      content: string,
      format: "json" | "yaml"
    ): Promise<SwaggerParseResult> => {
      return parseSwaggerFromContent(content, format);
    }
  );

  // 选择 Swagger 文件
  ipcMain.handle(
    "swagger:selectFile",
    async (): Promise<{ canceled: boolean; filePaths: string[] }> => {
      return selectSwaggerFile();
    }
  );

  console.log("[IPC] Swagger IPC handlers registered");
}
