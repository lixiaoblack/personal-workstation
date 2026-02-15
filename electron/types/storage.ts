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
