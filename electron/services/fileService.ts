/**
 * 文件存储服务
 * 处理文件上传、存储和管理
 *
 * 功能：
 * - 文件选择对话框
 * - 文件落盘存储到 userData 目录
 * - 文件元数据管理
 * - 文件删除和清理
 * - 知识库文件按 ID 隔离存储
 */
import { dialog, app, clipboard } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// 通用文件存储目录名称（已废弃，保留兼容）
const FILES_DIR_NAME = "uploaded-files";

// 知识库文件存储目录名称
const KNOWLEDGE_FILES_DIR_NAME = "knowledge-files";

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
 * 获取文件存储目录路径（通用目录）
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
 * 获取知识库文件存储目录路径
 * @param knowledgeId 知识库 ID，如果不传则返回根目录
 */
export function getKnowledgeFilesDirectory(knowledgeId?: string): string {
  const userDataPath = app.getPath("userData");
  const baseDir = path.join(userDataPath, KNOWLEDGE_FILES_DIR_NAME);

  // 确保根目录存在
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // 如果指定了知识库 ID，返回该知识库的目录
  if (knowledgeId) {
    const knowledgeDir = path.join(baseDir, knowledgeId);
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }
    return knowledgeDir;
  }

  return baseDir;
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
 * @param knowledgeId 可选的知识库 ID，用于存储到知识库目录
 */
export async function pasteFileFromClipboard(
  knowledgeId?: string
): Promise<FileMetadata | null> {
  try {
    // 检查剪贴板是否有图片
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      // 生成文件 ID 和名称
      const id = generateFileId();
      const originalName = `clipboard-image-${Date.now()}.png`;
      const storedName = `${id}.png`;

      // 确定存储目录
      const targetDir = knowledgeId
        ? getKnowledgeFilesDirectory(knowledgeId)
        : getFilesDirectory();
      const storedPath = path.join(targetDir, storedName);

      // 保存图片
      const buffer = image.toPNG();
      fs.writeFileSync(storedPath, buffer);

      // 获取图片尺寸
      let width = 0;
      let height = 0;
      try {
        const dimensions = await getImageDimensions(storedPath);
        width = dimensions.width;
        height = dimensions.height;
      } catch {
        // 忽略错误
      }

      const metadata: FileMetadata = {
        id,
        originalName,
        storedName,
        mimeType: "image/png",
        size: buffer.length,
        path: storedPath,
        createdAt: new Date().toISOString(),
        width,
        height,
      };

      return metadata;
    }

    // 检查剪贴板是否有文本（可能是文件路径）
    const text = clipboard.readText();
    if (text && fs.existsSync(text) && fs.statSync(text).isFile()) {
      // 作为文件处理
      return saveFileToKnowledge(knowledgeId || "", text);
    }

    return null;
  } catch (error) {
    console.error("粘贴文件失败:", error);
    return null;
  }
}

/**
 * 保存文件到知识库目录
 * @param knowledgeId 知识库 ID
 * @param sourceFilePath 源文件路径
 */
export async function saveFileToKnowledge(
  knowledgeId: string,
  sourceFilePath: string
): Promise<FileMetadata> {
  if (!knowledgeId) {
    throw new Error("知识库 ID 不能为空");
  }

  if (!fs.existsSync(sourceFilePath)) {
    throw new Error(`源文件不存在: ${sourceFilePath}`);
  }

  const stat = fs.statSync(sourceFilePath);

  // 检查文件大小
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(`文件大小超过 50MB 限制`);
  }

  const mimeType = getMimeType(sourceFilePath);

  // 检查文件类型
  if (!isFileTypeAllowed(mimeType)) {
    throw new Error(`不支持的文件类型: ${mimeType}`);
  }

  // 生成文件 ID 和存储名称
  const id = generateFileId();
  const originalName = path.basename(sourceFilePath);
  const storedName = generateStoredName(originalName, id);

  // 获取知识库目录
  const knowledgeDir = getKnowledgeFilesDirectory(knowledgeId);
  const storedPath = path.join(knowledgeDir, storedName);

  // 复制文件到知识库目录
  fs.copyFileSync(sourceFilePath, storedPath);

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

  return metadata;
}

/**
 * 批量保存文件到知识库目录
 * @param knowledgeId 知识库 ID
 * @param sourceFilePaths 源文件路径列表
 */
export async function saveFilesToKnowledge(
  knowledgeId: string,
  sourceFilePaths: string[]
): Promise<{ files: FileMetadata[]; errors: string[] }> {
  const files: FileMetadata[] = [];
  const errors: string[] = [];

  for (const filePath of sourceFilePaths) {
    try {
      const metadata = await saveFileToKnowledge(knowledgeId, filePath);
      files.push(metadata);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${path.basename(filePath)}: ${errorMsg}`);
    }
  }

  return { files, errors };
}

/**
 * 删除知识库的所有文件
 * @param knowledgeId 知识库 ID
 */
export function deleteKnowledgeFiles(knowledgeId: string): {
  success: boolean;
  error?: string;
} {
  try {
    const knowledgeDir = getKnowledgeFilesDirectory(knowledgeId);

    if (fs.existsSync(knowledgeDir)) {
      // 递归删除目录及其内容
      fs.rmSync(knowledgeDir, { recursive: true, force: true });
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * 获取知识库存储信息
 * @param knowledgeId 知识库 ID
 */
export function getKnowledgeStorageInfo(knowledgeId: string): {
  totalSize: number;
  fileCount: number;
  path: string;
} {
  try {
    const knowledgeDir = getKnowledgeFilesDirectory(knowledgeId);

    if (!fs.existsSync(knowledgeDir)) {
      return { totalSize: 0, fileCount: 0, path: knowledgeDir };
    }

    const files = fs.readdirSync(knowledgeDir);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(knowledgeDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        totalSize += stat.size;
      }
    }

    return {
      totalSize,
      fileCount: files.length,
      path: knowledgeDir,
    };
  } catch {
    return { totalSize: 0, fileCount: 0, path: "" };
  }
}

/**
 * 选择文件并保存到知识库
 * @param knowledgeId 知识库 ID
 * @param options 选择选项
 */
export async function selectFilesForKnowledge(
  knowledgeId: string,
  options?: {
    multiple?: boolean;
    filters?: Electron.FileFilter[];
  }
): Promise<FileSelectResult> {
  try {
    const result = await selectFiles(options);

    if (result.canceled || result.files.length === 0) {
      return result;
    }

    // 将文件移动到知识库目录
    const knowledgeDir = getKnowledgeFilesDirectory(knowledgeId);
    const movedFiles: FileMetadata[] = [];
    const errors: string[] = [];

    for (const file of result.files) {
      try {
        const newStoredName = file.storedName;
        const newPath = path.join(knowledgeDir, newStoredName);

        // 移动文件
        fs.renameSync(file.path, newPath);

        movedFiles.push({
          ...file,
          path: newPath,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${file.originalName}: ${errorMsg}`);
      }
    }

    return {
      canceled: false,
      files: movedFiles,
      error: errors.length > 0 ? errors.join("\n") : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      canceled: false,
      files: [],
      error: errorMsg,
    };
  }
}

/**
 * 删除知识库中的单个文件
 * @param knowledgeId 知识库 ID
 * @param fileId 文件 ID
 */
export function deleteKnowledgeFile(
  knowledgeId: string,
  fileId: string
): { success: boolean; error?: string } {
  try {
    const knowledgeDir = getKnowledgeFilesDirectory(knowledgeId);
    const files = fs.readdirSync(knowledgeDir);
    const targetFile = files.find((f) => f.startsWith(fileId));

    if (targetFile) {
      const filePath = path.join(knowledgeDir, targetFile);
      fs.unlinkSync(filePath);
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * 获取知识库中的文件信息
 * @param knowledgeId 知识库 ID
 * @param fileId 文件 ID
 */
export function getKnowledgeFileInfo(
  knowledgeId: string,
  fileId: string
): FileMetadata | null {
  try {
    const knowledgeDir = getKnowledgeFilesDirectory(knowledgeId);
    const files = fs.readdirSync(knowledgeDir);
    const targetFile = files.find((f) => f.startsWith(fileId));

    if (!targetFile) {
      return null;
    }

    const filePath = path.join(knowledgeDir, targetFile);
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
 * 读取知识库文件内容
 * 用于文件预览功能
 * @param knowledgeId 知识库 ID
 * @param fileId 文件 ID
 * @param maxSize 最大读取大小（默认 50MB），超过此大小的文件将被截断
 */
export function readKnowledgeFileContent(
  knowledgeId: string,
  fileId: string,
  maxSize: number = 50 * 1024 * 1024
): {
  success: boolean;
  content?: string;
  mimeType?: string;
  error?: string;
  truncated?: boolean;
} {
  try {
    const fileInfo = getKnowledgeFileInfo(knowledgeId, fileId);

    if (!fileInfo) {
      return { success: false, error: "文件不存在" };
    }

    const filePath = fileInfo.path;

    if (!fs.existsSync(filePath)) {
      return { success: false, error: "文件路径不存在" };
    }

    const stat = fs.statSync(filePath);

    // 检查文件大小
    const truncated = stat.size > maxSize;
    const readSize = truncated ? maxSize : stat.size;

    // 读取文件内容
    const buffer = Buffer.alloc(readSize);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, readSize, 0);
    fs.closeSync(fd);

    // 判断文件类型并决定如何解码
    const mimeType = fileInfo.mimeType;
    let content: string;

    // 文本类型文件直接转换为字符串
    if (
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/xml" ||
      mimeType === "application/x-yaml" ||
      mimeType === "application/x-toml"
    ) {
      content = buffer.toString("utf-8");
    }
    // Markdown 文件
    else if (mimeType === "text/markdown") {
      content = buffer.toString("utf-8");
    }
    // 其他文本类型代码文件
    else if (
      [
        "text/javascript",
        "text/typescript",
        "text/python",
        "text/java",
        "text/c",
        "text/cpp",
        "text/css",
        "text/html",
        "text/x-scss",
        "text/x-sass",
        "text/x-less",
      ].includes(mimeType)
    ) {
      content = buffer.toString("utf-8");
    }
    // 二进制文件（图片、PDF 等）返回 Base64
    else {
      content = buffer.toString("base64");
    }

    return {
      success: true,
      content,
      mimeType,
      truncated,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * 获取所有知识库的总存储信息
 */
export function getAllKnowledgeStorageInfo(): {
  totalSize: number;
  knowledgeCount: number;
  fileCount: number;
  path: string;
} {
  try {
    const baseDir = getKnowledgeFilesDirectory();

    if (!fs.existsSync(baseDir)) {
      return { totalSize: 0, knowledgeCount: 0, fileCount: 0, path: baseDir };
    }

    const knowledgeDirs = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory());

    let totalSize = 0;
    let totalFileCount = 0;

    for (const dir of knowledgeDirs) {
      const info = getKnowledgeStorageInfo(dir.name);
      totalSize += info.totalSize;
      totalFileCount += info.fileCount;
    }

    return {
      totalSize,
      knowledgeCount: knowledgeDirs.length,
      fileCount: totalFileCount,
      path: baseDir,
    };
  } catch {
    return { totalSize: 0, knowledgeCount: 0, fileCount: 0, path: "" };
  }
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

export default {
  getFilesDirectory,
  getKnowledgeFilesDirectory,
  selectFiles,
  selectFilesForKnowledge,
  pasteFileFromClipboard,
  saveFileToKnowledge,
  saveFilesToKnowledge,
  deleteFile,
  deleteKnowledgeFile,
  deleteKnowledgeFiles,
  getFileInfo,
  getKnowledgeFileInfo,
  readKnowledgeFileContent,
  getKnowledgeStorageInfo,
  getAllKnowledgeStorageInfo,
  cleanupOldFiles,
  getStorageSize,
};
