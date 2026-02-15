/**
 * AvatarService 头像服务
 * 处理头像文件的选择、保存和读取
 */
import { app, dialog, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";

// 头像存储目录
const getAvatarsDir = (): string => {
  const userDataPath = app.getPath("userData");
  const avatarsDir = path.join(userDataPath, "avatars");

  // 确保目录存在
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  return avatarsDir;
};

// 支持的图片格式
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface AvatarSelectResult {
  success: boolean;
  data?: string; // base64 编码的图片数据
  path?: string; // 保存的文件路径
  mimeType?: string; // MIME 类型
  error?: string;
}

/**
 * 打开文件选择对话框并处理头像
 */
export async function selectAvatar(
  mainWindow: BrowserWindow | null
): Promise<AvatarSelectResult> {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "选择头像图片",
      properties: ["openFile"],
      filters: [
        { name: "图片文件", extensions: ["jpg", "jpeg", "png", "webp", "gif"] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: "用户取消选择" };
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();

    // 检查文件格式
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        success: false,
        error: "不支持的图片格式，请选择 JPG、PNG、WebP 或 GIF 格式",
      };
    }

    // 检查文件大小
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return { success: false, error: "图片文件过大，请选择小于 5MB 的图片" };
    }

    // 读取文件并转换为 base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    // 获取 MIME 类型
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };
    const mimeType = mimeTypes[ext] || "image/jpeg";

    // 生成唯一文件名
    const fileName = `avatar_${Date.now()}${ext}`;
    const savePath = path.join(getAvatarsDir(), fileName);

    // 保存文件到应用目录
    fs.writeFileSync(savePath, fileBuffer);

    return {
      success: true,
      data: `data:${mimeType};base64,${base64Data}`,
      path: savePath,
      mimeType,
    };
  } catch (error) {
    console.error("选择头像失败:", error);
    return { success: false, error: "选择头像时发生错误" };
  }
}

/**
 * 获取头像文件路径
 */
export function getAvatarPath(fileName: string): string {
  return path.join(getAvatarsDir(), fileName);
}

/**
 * 删除头像文件
 */
export function deleteAvatar(avatarPath: string): boolean {
  try {
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }
    return true;
  } catch (error) {
    console.error("删除头像失败:", error);
    return false;
  }
}
