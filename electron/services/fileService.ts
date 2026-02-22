/**
 * 文件存储服务
 * 处理文件上传、存储和管理
 *
 * 功能：
 * - 文件选择对话框
 * - 文件落盘存储到 userData 目录
 * - 文件元数据管理
 * - 文件删除和清理
 */
import { dialog, app } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// 文件存储目录名称
const FILES_DIR_NAME = "uploaded-files";

// 允许的文件类型
const ALLOWED_FILE_TYPES = [
  // 图片
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // 文档
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // 文本
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  // 代码
  "text/javascript",
  "text/typescript",
  "text/python",
  "application/x-yaml",
  // 压缩包
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
];

// 最大文件大小 (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 文件元数据接口
export interface FileMetadata {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: string;
  // 图片预览相关
  thumbnailPath?: string;
  width?: number;
  height?: number;
}

// 文件选择结果
export interface FileSelectResult {
  canceled: boolean;
  files: FileMetadata[];
  error?: string;
}

/**
 * 获取文件存储目录路径
 */
export function getFilesDirectory(): string {
  const userDataPath = app.getPath("userData");
  const filesDir = path.join(userDataPath, FILES_DIR_NAME);

  // 确保目录存在
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  return filesDir;
}

/**
 * 获取文件 MIME 类型
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    // 图片
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    // 文档
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // 文本
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
    // 代码
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".jsx": "text/javascript",
    ".tsx": "text/typescript",
    ".py": "text/python",
    ".java": "text/java",
    ".c": "text/c",
    ".cpp": "text/cpp",
    ".h": "text/c",
    ".css": "text/css",
    ".scss": "text/x-scss",
    ".sass": "text/x-sass",
    ".less": "text/x-less",
    ".html": "text/html",
    ".yaml": "application/x-yaml",
    ".yml": "application/x-yaml",
    ".toml": "application/x-toml",
    // 压缩包
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * 生成唯一文件 ID
 */
function generateFileId(): string {
  return `file_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

/**
 * 生成存储文件名
 */
function generateStoredName(originalName: string, id: string): string {
  const ext = path.extname(originalName);
  return `${id}${ext}`;
}

/**
 * 检查文件类型是否允许
 */
function isFileTypeAllowed(mimeType: string): boolean {
  // 允许所有以 text/ 开头的类型
  if (mimeType.startsWith("text/")) {
    return true;
  }
  return ALLOWED_FILE_TYPES.includes(mimeType);
}

/**
 * 打开文件选择对话框
 */
export async function selectFiles(options?: {
  multiple?: boolean;
  filters?: Electron.FileFilter[];
}): Promise<FileSelectResult> {
  try {
    const defaultFilters: Electron.FileFilter[] = [
      { name: "所有文件", extensions: ["*"] },
      {
        name: "图片",
        extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
      },
      {
        name: "文档",
        extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
      },
      { name: "文本", extensions: ["txt", "md", "csv", "json", "yaml", "yml"] },
      {
        name: "代码",
        extensions: [
          "js",
          "ts",
          "jsx",
          "tsx",
          "py",
          "java",
          "c",
          "cpp",
          "h",
          "css",
          "scss",
          "html",
        ],
      },
    ];

    const result = await dialog.showOpenDialog({
      properties: [
        "openFile",
        ...(options?.multiple ? ["multiSelections" as const] : []),
      ],
      filters: options?.filters || defaultFilters,
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, files: [] };
    }

    const files: FileMetadata[] = [];
    const errors: string[] = [];

    for (const filePath of result.filePaths) {
      try {
        const stat = fs.statSync(filePath);

        // 检查文件大小
        if (stat.size > MAX_FILE_SIZE) {
          errors.push(`${path.basename(filePath)}: 文件大小超过 50MB 限制`);
          continue;
        }

        const mimeType = getMimeType(filePath);

        // 检查文件类型
        if (!isFileTypeAllowed(mimeType)) {
          errors.push(`${path.basename(filePath)}: 不支持的文件类型`);
          continue;
        }

        const id = generateFileId();
        const originalName = path.basename(filePath);
        const storedName = generateStoredName(originalName, id);
        const filesDir = getFilesDirectory();
        const storedPath = path.join(filesDir, storedName);

        // 复制文件到存储目录
        fs.copyFileSync(filePath, storedPath);

        const metadata: FileMetadata = {
          id,
          originalName,
          storedName,
          mimeType,
          size: stat.size,
          path: storedPath,
          createdAt: new Date().toISOString(),
        };

        // 如果是图片，获取尺寸信息
        if (mimeType.startsWith("image/")) {
          try {
            const dimensions = await getImageDimensions(storedPath);
            metadata.width = dimensions.width;
            metadata.height = dimensions.height;
          } catch {
            // 忽略获取图片尺寸的错误
          }
        }

        files.push(metadata);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${path.basename(filePath)}: ${errorMsg}`);
      }
    }

    return {
      canceled: false,
      files,
      error: errors.length > 0 ? errors.join("\n") : undefined,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      canceled: false,
      files: [],
      error: errorMsg,
    };
  }
}

/**
 * 获取图片尺寸
 */
function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // 简单的图片尺寸检测（只检测文件头）
    const buffer = Buffer.alloc(24);

    fs.open(imagePath, "r", (err, fd) => {
      if (err) {
        reject(err);
        return;
      }

      fs.read(fd, buffer, 0, 24, 0, (readErr) => {
        fs.close(fd, () => {});

        if (readErr) {
          reject(readErr);
          return;
        }

        try {
          // PNG
          if (buffer[0] === 0x89 && buffer[1] === 0x50) {
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            resolve({ width, height });
            return;
          }

          // JPEG
          if (buffer[0] === 0xff && buffer[1] === 0xd8) {
            // JPEG 尺寸检测比较复杂，这里使用默认值
            resolve({ width: 0, height: 0 });
            return;
          }

          // GIF
          if (buffer[0] === 0x47 && buffer[1] === 0x49) {
            const width = buffer.readUInt16LE(6);
            const height = buffer.readUInt16LE(8);
            resolve({ width, height });
            return;
          }

          // WebP
          if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57) {
            const width = buffer.readUInt16LE(26) & 0x3fff;
            const height = buffer.readUInt16LE(28) & 0x3fff;
            resolve({ width, height });
            return;
          }

          resolve({ width: 0, height: 0 });
        } catch {
          resolve({ width: 0, height: 0 });
        }
      });
    });
  });
}

/**
 * 从剪贴板粘贴文件
 * 支持图片粘贴
 */
export async function pasteFileFromClipboard(): Promise<FileMetadata | null> {
  // 这个功能需要使用 Electron 的 clipboard API
  // 目前返回 null，后续可以扩展
  return null;
}

/**
 * 删除文件
 */
export async function deleteFile(
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const filesDir = getFilesDirectory();
    const files = fs.readdirSync(filesDir);
    const targetFile = files.find((f) => f.startsWith(fileId));

    if (targetFile) {
      const filePath = path.join(filesDir, targetFile);
      fs.unlinkSync(filePath);
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 获取文件信息
 */
export function getFileInfo(fileId: string): FileMetadata | null {
  try {
    const filesDir = getFilesDirectory();
    const files = fs.readdirSync(filesDir);
    const targetFile = files.find((f) => f.startsWith(fileId));

    if (!targetFile) {
      return null;
    }

    const filePath = path.join(filesDir, targetFile);
    const stat = fs.statSync(filePath);

    // 从文件名解析原始文件名（需要从元数据存储中获取，这里简化处理）
    return {
      id: fileId,
      originalName: targetFile,
      storedName: targetFile,
      mimeType: getMimeType(filePath),
      size: stat.size,
      path: filePath,
      createdAt: stat.birthtime.toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * 清理过期的临时文件
 * 删除超过指定天数的文件
 */
export async function cleanupOldFiles(
  daysOld: number = 7
): Promise<{ deleted: number; error?: string }> {
  try {
    const filesDir = getFilesDirectory();
    const files = fs.readdirSync(filesDir);
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(filesDir, file);
      const stat = fs.statSync(filePath);

      if (now - stat.birthtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }

    return { deleted };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { deleted: 0, error: errorMsg };
  }
}

/**
 * 获取存储目录大小
 */
export function getStorageSize(): { totalSize: number; fileCount: number } {
  try {
    const filesDir = getFilesDirectory();
    const files = fs.readdirSync(filesDir);

    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(filesDir, file);
      const stat = fs.statSync(filePath);
      totalSize += stat.size;
    }

    return { totalSize, fileCount: files.length };
  } catch {
    return { totalSize: 0, fileCount: 0 };
  }
}
