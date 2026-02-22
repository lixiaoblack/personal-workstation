/**
 * 存储管理相关类型定义
 */

// 存储信息接口
export interface StorageInfo {
  cacheSize: number;
  totalSize: number;
  cachePath: string;
  dataSize: number;
  logsSize: number;
}

// 清理缓存结果
export interface ClearCacheResult {
  success: boolean;
  clearedSize: number;
  error?: string;
}

/**
 * 头像选择结果
 */
export interface AvatarSelectResult {
  success: boolean;
  data?: string; // base64 编码的图片数据
  mimeType?: string; // MIME 类型
  error?: string;
}

/**
 * 文件元数据
 */
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

/**
 * 文件选择结果
 */
export interface FileSelectResult {
  canceled: boolean;
  files: FileMetadata[];
  error?: string;
}

/**
 * 知识库存储信息
 */
export interface KnowledgeStorageInfo {
  totalSize: number;
  fileCount: number;
  path: string;
}

/**
 * 所有知识库存储信息
 */
export interface KnowledgeAllStorageInfo {
  totalSize: number;
  knowledgeCount: number;
  fileCount: number;
  path: string;
}

/**
 * 知识库文件操作结果（单个文件）
 */
export interface KnowledgeFileResult {
  success: boolean;
  file?: FileMetadata;
  error?: string;
}

/**
 * 知识库文件操作结果（多个文件）
 */
export interface KnowledgeFilesResult {
  success: boolean;
  files: FileMetadata[];
  errors?: string[];
  error?: string;
}

/**
 * 知识库存储信息结果
 */
export interface KnowledgeStorageInfoResult extends KnowledgeStorageInfo {
  success: boolean;
  error?: string;
}

/**
 * 所有知识库存储信息结果
 */
export interface KnowledgeAllStorageInfoResult extends KnowledgeAllStorageInfo {
  success: boolean;
  error?: string;
}
