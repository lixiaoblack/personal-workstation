/**
 * Notes 笔记服务
 * 处理笔记文件夹管理、文件操作、设置存储等
 */

import { dialog } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDatabase } from "../database";

// 文件类型定义
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

export interface NotesSetting {
  id: number;
  key: string;
  value: string;
  updatedAt: number;
}

export interface FileTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileTreeNode[];
  expanded?: boolean;
  active?: boolean;
}

// 获取设置
export function getSetting(key: string): string | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT value FROM notes_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

// 保存设置
export function saveSetting(key: string, value: string): boolean {
  const db = getDatabase();
  const now = Date.now();

  try {
    const existing = db
      .prepare("SELECT id FROM notes_settings WHERE key = ?")
      .get(key);

    if (existing) {
      db.prepare(
        "UPDATE notes_settings SET value = ?, updated_at = ? WHERE key = ?"
      ).run(value, now, key);
    } else {
      db.prepare(
        "INSERT INTO notes_settings (key, value, updated_at) VALUES (?, ?, ?)"
      ).run(key, value, now);
    }
    return true;
  } catch (error) {
    console.error("[NotesService] 保存设置失败:", error);
    return false;
  }
}

// 获取根目录路径
export function getRootPath(): string | null {
  return getSetting("root_path");
}

// 设置根目录路径
export function setRootPath(rootPath: string): boolean {
  return saveSetting("root_path", rootPath);
}

// 选择文件夹对话框
export async function selectFolder(): Promise<{
  canceled: boolean;
  filePaths: string[];
}> {
  const result = await dialog.showOpenDialog({
    title: "选择笔记存储文件夹",
    properties: ["openDirectory", "createDirectory"],
    buttonLabel: "选择此文件夹",
  });

  return {
    canceled: result.canceled,
    filePaths: result.filePaths,
  };
}

// 验证文件夹是否有效
export function validateFolder(folderPath: string): {
  valid: boolean;
  error?: string;
} {
  try {
    if (!fs.existsSync(folderPath)) {
      return { valid: false, error: "文件夹不存在" };
    }

    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) {
      return { valid: false, error: "选择的路径不是文件夹" };
    }

    // 检查读写权限
    try {
      fs.accessSync(folderPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      return { valid: false, error: "没有文件夹的读写权限" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "验证文件夹时发生错误" };
  }
}

// 计算文件内容哈希
function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(content).digest("hex");
}

// 扫描文件夹并更新数据库缓存
export function scanFolder(rootPath: string): {
  success: boolean;
  fileCount: number;
  folderCount: number;
  error?: string;
} {
  const db = getDatabase();

  try {
    // 清空现有缓存
    db.prepare("DELETE FROM notes_files").run();

    let fileCount = 0;
    let folderCount = 0;

    const scanDir = (dirPath: string, parentPath: string | null) => {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const now = Date.now();

      for (const item of items) {
        // 跳过隐藏文件和系统文件
        if (item.name.startsWith(".") || item.name.startsWith("~")) {
          continue;
        }

        const itemPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // 插入文件夹记录
          db.prepare(
            `INSERT INTO notes_files (path, name, parent_path, type, created_at, updated_at)
             VALUES (?, ?, ?, 'folder', ?, ?)`
          ).run(itemPath, item.name, parentPath, now, now);

          folderCount++;

          // 递归扫描子目录
          scanDir(itemPath, itemPath);
        } else if (item.isFile() && item.name.endsWith(".md")) {
          // 只处理 .md 文件
          const stat = fs.statSync(itemPath);
          const contentHash = calculateFileHash(itemPath);

          // 插入文件记录
          db.prepare(
            `INSERT INTO notes_files (path, name, parent_path, type, content_hash, file_mtime, created_at, updated_at)
             VALUES (?, ?, ?, 'file', ?, ?, ?, ?)`
          ).run(
            itemPath,
            item.name,
            parentPath,
            contentHash,
            stat.mtimeMs,
            now,
            now
          );

          fileCount++;
        }
      }
    };

    scanDir(rootPath, null);

    // 更新最后扫描时间
    saveSetting("last_scan_at", Date.now().toString());

    return { success: true, fileCount, folderCount };
  } catch (error) {
    console.error("[NotesService] 扫描文件夹失败:", error);
    return {
      success: false,
      fileCount: 0,
      folderCount: 0,
      error: error instanceof Error ? error.message : "扫描失败",
    };
  }
}

// 获取文件树
export function getFileTree(): FileTreeNode[] {
  const db = getDatabase();
  const rootPath = getRootPath();

  if (!rootPath) {
    return [];
  }

  const buildTree = (parentPath: string | null): FileTreeNode[] => {
    const rows = db
      .prepare(
        "SELECT * FROM notes_files WHERE parent_path " +
          (parentPath === null ? "IS NULL" : "= ?") +
          " ORDER BY type DESC, name ASC"
      )
      .all(parentPath === null ? [] : [parentPath]) as NotesFile[];

    return rows.map((row) => {
      const node: FileTreeNode = {
        id: row.path,
        name: row.name,
        type: row.type,
        path: row.path,
        expanded: false,
      };

      if (row.type === "folder") {
        node.children = buildTree(row.path);
      }

      return node;
    });
  };

  return buildTree(null);
}

// 创建文件夹
export function createFolder(
  parentPath: string | null,
  folderName: string
): { success: boolean; path?: string; error?: string; exists?: boolean } {
  const rootPath = getRootPath();

  if (!rootPath) {
    return { success: false, error: "未设置根目录" };
  }

  try {
    const folderPath = parentPath
      ? path.join(parentPath, folderName)
      : path.join(rootPath, folderName);

    if (fs.existsSync(folderPath)) {
      return { success: false, error: "文件夹已存在", exists: true };
    }

    fs.mkdirSync(folderPath, { recursive: false });

    // 更新数据库
    const db = getDatabase();
    const now = Date.now();
    db.prepare(
      `INSERT INTO notes_files (path, name, parent_path, type, created_at, updated_at)
       VALUES (?, ?, ?, 'folder', ?, ?)`
    ).run(folderPath, folderName, parentPath, now, now);

    return { success: true, path: folderPath };
  } catch (error) {
    console.error("[NotesService] 创建文件夹失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建失败",
    };
  }
}

// 强制创建文件夹（覆盖或创建副本）
export function createFolderForce(
  parentPath: string | null,
  folderName: string,
  mode: "overwrite" | "copy"
): { success: boolean; path?: string; error?: string } {
  const rootPath = getRootPath();

  if (!rootPath) {
    return { success: false, error: "未设置根目录" };
  }

  try {
    const folderPath = parentPath
      ? path.join(parentPath, folderName)
      : path.join(rootPath, folderName);

    if (mode === "overwrite") {
      // 覆盖：先删除再创建
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        // 从数据库删除
        const db = getDatabase();
        db.prepare("DELETE FROM notes_files WHERE path LIKE ? OR path = ?").run(
          `${folderPath}/%`,
          folderPath
        );
      }
      fs.mkdirSync(folderPath, { recursive: false });
    } else {
      // 创建副本：生成新名称
      let newPath = folderPath;
      let counter = 1;
      while (fs.existsSync(newPath)) {
        newPath = parentPath
          ? path.join(parentPath, `${folderName} (${counter})`)
          : path.join(rootPath, `${folderName} (${counter})`);
        counter++;
      }
      fs.mkdirSync(newPath, { recursive: false });

      // 更新返回的路径
      const finalFolderName = path.basename(newPath);
      const db = getDatabase();
      const now = Date.now();
      db.prepare(
        `INSERT INTO notes_files (path, name, parent_path, type, created_at, updated_at)
         VALUES (?, ?, ?, 'folder', ?, ?)`
      ).run(newPath, finalFolderName, parentPath, now, now);

      return { success: true, path: newPath };
    }

    // 更新数据库
    const db = getDatabase();
    const now = Date.now();
    db.prepare(
      `INSERT INTO notes_files (path, name, parent_path, type, created_at, updated_at)
       VALUES (?, ?, ?, 'folder', ?, ?)`
    ).run(folderPath, folderName, parentPath, now, now);

    return { success: true, path: folderPath };
  } catch (error) {
    console.error("[NotesService] 强制创建文件夹失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建失败",
    };
  }
}

// 创建笔记文件
export function createNote(
  parentPath: string | null,
  fileName: string,
  content: string = ""
): { success: boolean; path?: string; error?: string; exists?: boolean } {
  const rootPath = getRootPath();

  if (!rootPath) {
    return { success: false, error: "未设置根目录" };
  }

  try {
    // 确保文件名以 .md 结尾
    const finalName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    const filePath = parentPath
      ? path.join(parentPath, finalName)
      : path.join(rootPath, finalName);

    if (fs.existsSync(filePath)) {
      return { success: false, error: "文件已存在", exists: true };
    }

    // 写入文件
    fs.writeFileSync(filePath, content, "utf-8");

    // 更新数据库
    const db = getDatabase();
    const now = Date.now();
    const stat = fs.statSync(filePath);
    const contentHash = calculateFileHash(filePath);

    db.prepare(
      `INSERT INTO notes_files (path, name, parent_path, type, content_hash, file_mtime, created_at, updated_at)
       VALUES (?, ?, ?, 'file', ?, ?, ?, ?)`
    ).run(filePath, finalName, parentPath, contentHash, stat.mtimeMs, now, now);

    return { success: true, path: filePath };
  } catch (error) {
    console.error("[NotesService] 创建笔记失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建失败",
    };
  }
}

// 强制创建笔记文件（覆盖或创建副本）
export function createNoteForce(
  parentPath: string | null,
  fileName: string,
  mode: "overwrite" | "copy",
  content: string = ""
): { success: boolean; path?: string; error?: string } {
  const rootPath = getRootPath();

  if (!rootPath) {
    return { success: false, error: "未设置根目录" };
  }

  try {
    // 确保文件名以 .md 结尾
    let finalName = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
    let filePath = parentPath
      ? path.join(parentPath, finalName)
      : path.join(rootPath, finalName);

    if (mode === "overwrite") {
      // 覆盖：直接写入（会覆盖现有内容）
      fs.writeFileSync(filePath, content, "utf-8");

      // 更新或插入数据库记录
      const db = getDatabase();
      const now = Date.now();
      const stat = fs.statSync(filePath);
      const contentHash = calculateFileHash(filePath);

      const existing = db
        .prepare("SELECT id FROM notes_files WHERE path = ?")
        .get(filePath);

      if (existing) {
        db.prepare(
          "UPDATE notes_files SET content_hash = ?, file_mtime = ?, updated_at = ? WHERE path = ?"
        ).run(contentHash, stat.mtimeMs, now, filePath);
      } else {
        db.prepare(
          `INSERT INTO notes_files (path, name, parent_path, type, content_hash, file_mtime, created_at, updated_at)
           VALUES (?, ?, ?, 'file', ?, ?, ?, ?)`
        ).run(
          filePath,
          finalName,
          parentPath,
          contentHash,
          stat.mtimeMs,
          now,
          now
        );
      }
    } else {
      // 创建副本：生成新名称
      let counter = 1;
      const baseName = finalName.replace(/\.md$/, "");
      while (fs.existsSync(filePath)) {
        finalName = `${baseName} (${counter}).md`;
        filePath = parentPath
          ? path.join(parentPath, finalName)
          : path.join(rootPath, finalName);
        counter++;
      }

      // 写入文件
      fs.writeFileSync(filePath, content, "utf-8");

      // 更新数据库
      const db = getDatabase();
      const now = Date.now();
      const stat = fs.statSync(filePath);
      const contentHash = calculateFileHash(filePath);

      db.prepare(
        `INSERT INTO notes_files (path, name, parent_path, type, content_hash, file_mtime, created_at, updated_at)
         VALUES (?, ?, ?, 'file', ?, ?, ?, ?)`
      ).run(
        filePath,
        finalName,
        parentPath,
        contentHash,
        stat.mtimeMs,
        now,
        now
      );
    }

    return { success: true, path: filePath };
  } catch (error) {
    console.error("[NotesService] 强制创建笔记失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建失败",
    };
  }
}

// 读取文件内容
export function readFile(filePath: string): {
  success: boolean;
  content?: string;
  error?: string;
} {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "文件不存在" };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error("[NotesService] 读取文件失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "读取失败",
    };
  }
}

// 保存文件内容
export function saveFile(
  filePath: string,
  content: string
): { success: boolean; error?: string } {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "文件不存在" };
    }

    fs.writeFileSync(filePath, content, "utf-8");

    // 更新数据库中的哈希和修改时间
    const db = getDatabase();
    const now = Date.now();
    const stat = fs.statSync(filePath);
    const contentHash = calculateFileHash(filePath);

    db.prepare(
      "UPDATE notes_files SET content_hash = ?, file_mtime = ?, updated_at = ? WHERE path = ?"
    ).run(contentHash, stat.mtimeMs, now, filePath);

    return { success: true };
  } catch (error) {
    console.error("[NotesService] 保存文件失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "保存失败",
    };
  }
}

// 重命名文件/文件夹
export function renameItem(
  oldPath: string,
  newName: string
): { success: boolean; newPath?: string; error?: string } {
  try {
    const parentPath = path.dirname(oldPath);

    // 检查是否是文件，如果是文件且用户没有输入 .md 后缀，自动添加
    const isFile = fs.existsSync(oldPath) && fs.statSync(oldPath).isFile();
    let finalName = newName;
    if (isFile && !newName.endsWith(".md")) {
      finalName = `${newName}.md`;
    }

    const newPath = path.join(parentPath, finalName);

    if (fs.existsSync(newPath)) {
      return { success: false, error: "目标名称已存在" };
    }

    fs.renameSync(oldPath, newPath);

    // 更新数据库
    const db = getDatabase();
    const now = Date.now();

    // 更新当前项
    db.prepare(
      "UPDATE notes_files SET name = ?, path = ?, updated_at = ? WHERE path = ?"
    ).run(finalName, newPath, now, oldPath);

    // 如果是文件夹，更新所有子项的路径
    const rows = db
      .prepare("SELECT type FROM notes_files WHERE path = ?")
      .get(newPath) as { type: string } | undefined;

    if (rows?.type === "folder") {
      // 更新 parent_path
      db.prepare(
        "UPDATE notes_files SET parent_path = ? WHERE parent_path = ?"
      ).run(newPath, oldPath);

      // 更新所有子项路径（递归）
      updateChildPaths(db, oldPath, newPath);
    }

    return { success: true, newPath };
  } catch (error) {
    console.error("[NotesService] 重命名失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "重命名失败",
    };
  }
}

// 递归更新子项路径
function updateChildPaths(
  db: Database.Database,
  oldParent: string,
  newParent: string
) {
  const children = db
    .prepare("SELECT path FROM notes_files WHERE path LIKE ?")
    .all(`${oldParent}/%`) as { path: string }[];

  const now = Date.now();

  for (const child of children) {
    const newChildPath = child.path.replace(oldParent, newParent);
    db.prepare(
      "UPDATE notes_files SET path = ?, updated_at = ? WHERE path = ?"
    ).run(newChildPath, now, child.path);
  }
}

// 删除文件/文件夹
export function deleteItem(itemPath: string): {
  success: boolean;
  error?: string;
} {
  try {
    if (!fs.existsSync(itemPath)) {
      return { success: false, error: "文件或文件夹不存在" };
    }

    const stat = fs.statSync(itemPath);
    const db = getDatabase();

    if (stat.isDirectory()) {
      // 删除文件夹及其内容
      fs.rmSync(itemPath, { recursive: true, force: true });

      // 删除数据库中所有子项
      db.prepare("DELETE FROM notes_files WHERE path LIKE ? OR path = ?").run(
        `${itemPath}/%`,
        itemPath
      );
    } else {
      // 删除文件
      fs.unlinkSync(itemPath);
      db.prepare("DELETE FROM notes_files WHERE path = ?").run(itemPath);
    }

    return { success: true };
  } catch (error) {
    console.error("[NotesService] 删除失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除失败",
    };
  }
}

// 获取文件信息
export function getFileInfo(filePath: string): {
  success: boolean;
  file?: NotesFile;
  error?: string;
} {
  try {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM notes_files WHERE path = ?")
      .get(filePath) as NotesFile | undefined;

    if (!row) {
      return { success: false, error: "文件记录不存在" };
    }

    return { success: true, file: row };
  } catch (error) {
    console.error("[NotesService] 获取文件信息失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取失败",
    };
  }
}

// 检查是否已设置根目录
export function hasRootPath(): boolean {
  const rootPath = getRootPath();
  return rootPath !== null && fs.existsSync(rootPath);
}

import type Database from "better-sqlite3";
