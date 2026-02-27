/**
 * Notes 笔记模块类型定义
 */

// 笔记文件信息
export interface NotesFile {
  id: number;
  path: string;
  name: string;
  parentPath: string | null;
  type: "file" | "folder";
  contentHash: string | null;
  fileMtime: number | null;
  vectorDocIds: string | null;
  chunkCount: number;
  lastSyncedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// 文件树节点
export interface FileTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileTreeNode[];
  expanded?: boolean;
  active?: boolean;
}

// 文件夹选择结果
export interface NotesSelectFolderResult {
  canceled: boolean;
  filePaths: string[];
}

// 文件夹验证结果
export interface NotesValidateFolderResult {
  valid: boolean;
  error?: string;
}

// 扫描文件夹结果
export interface NotesScanFolderResult {
  success: boolean;
  fileCount: number;
  folderCount: number;
  error?: string;
}

// 创建文件夹/笔记结果
export interface NotesCreateResult {
  success: boolean;
  path?: string;
  error?: string;
}

// 读取文件结果
export interface NotesReadFileResult {
  success: boolean;
  content?: string;
  error?: string;
}

// 保存文件结果
export interface NotesSaveFileResult {
  success: boolean;
  error?: string;
}

// 重命名结果
export interface NotesRenameResult {
  success: boolean;
  newPath?: string;
  error?: string;
}

// 删除结果
export interface NotesDeleteResult {
  success: boolean;
  error?: string;
}

// 获取文件信息结果
export interface NotesGetFileInfoResult {
  success: boolean;
  file?: NotesFile;
  error?: string;
}
