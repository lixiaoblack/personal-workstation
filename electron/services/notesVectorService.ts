/**
 * Notes 笔记向量服务
 *
 * 处理笔记向量索引、搜索等操作，通过 HTTP API 与 Python 服务通信
 */

import { post, get, checkPythonApiHealth } from "./pythonApiClient";

// ==================== 类型定义 ====================

export interface NoteSearchResult {
  file_path: string;
  file_name: string;
  heading: string;
  content: string;
  chunk_index: number;
  modified_at: number | null;
  score: number;
}

export interface NotesStats {
  total_chunks: number;
  total_files: number;
  indexed: boolean;
  error?: string;
}

// ==================== 向量索引函数 ====================

/**
 * 索引笔记到向量存储
 *
 * @param filePath 文件路径
 * @param content Markdown 内容
 * @param metadata 额外元数据
 * @returns 索引的块数量
 */
export async function indexNote(
  filePath: string,
  content: string,
  metadata?: { modified_at?: number }
): Promise<{ success: boolean; chunkCount?: number; error?: string }> {
  try {
    // 检查 Python 服务是否可用
    if (!(await checkPythonApiHealth())) {
      console.warn("[NotesVectorService] Python 服务不可用，跳过向量索引");
      return { success: false, error: "Python 服务不可用" };
    }

    const response = await post<number>("/api/notes/index", {
      file_path: filePath,
      content,
      metadata,
    });

    if (response.success) {
      console.log(
        `[NotesVectorService] 索引笔记成功: ${filePath}, ${response.data} 块`
      );
      return { success: true, chunkCount: response.data };
    } else {
      console.error("[NotesVectorService] 索引笔记失败:", response.error);
      return { success: false, error: response.error };
    }
  } catch (error) {
    console.error("[NotesVectorService] 索引笔记异常:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 从向量存储删除笔记
 *
 * @param filePath 文件路径
 * @returns 是否删除成功
 */
export async function deleteNoteFromVectorstore(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查 Python 服务是否可用
    if (!(await checkPythonApiHealth())) {
      console.warn("[NotesVectorService] Python 服务不可用，跳过向量删除");
      return { success: false, error: "Python 服务不可用" };
    }

    const response = await post<boolean>("/api/notes/delete", {
      file_path: filePath,
    });

    if (response.success) {
      console.log(`[NotesVectorService] 删除笔记向量成功: ${filePath}`);
      return { success: true };
    } else {
      console.error("[NotesVectorService] 删除笔记向量失败:", response.error);
      return { success: false, error: response.error };
    }
  } catch (error) {
    console.error("[NotesVectorService] 删除笔记向量异常:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 语义搜索笔记
 *
 * @param query 搜索查询
 * @param k 返回数量
 * @param filePathFilter 文件路径过滤
 * @returns 搜索结果列表
 */
export async function searchNotes(
  query: string,
  k: number = 5,
  filePathFilter?: string
): Promise<{ success: boolean; results?: NoteSearchResult[]; error?: string }> {
  try {
    // 检查 Python 服务是否可用
    if (!(await checkPythonApiHealth())) {
      return { success: false, error: "Python 服务不可用" };
    }

    const response = await post<NoteSearchResult[]>("/api/notes/search", {
      query,
      k,
      file_path_filter: filePathFilter,
    });

    if (response.success) {
      return { success: true, results: response.data };
    } else {
      return { success: false, error: response.error };
    }
  } catch (error) {
    console.error("[NotesVectorService] 搜索笔记异常:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 获取笔记索引统计
 *
 * @returns 统计信息
 */
export async function getNotesStats(): Promise<{
  success: boolean;
  stats?: NotesStats;
  error?: string;
}> {
  try {
    // 检查 Python 服务是否可用
    if (!(await checkPythonApiHealth())) {
      return { success: false, error: "Python 服务不可用" };
    }

    const response = await get<NotesStats>("/api/notes/stats");

    if (response.success) {
      return { success: true, stats: response.data };
    } else {
      return { success: false, error: response.error };
    }
  } catch (error) {
    console.error("[NotesVectorService] 获取笔记统计异常:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 全量索引所有笔记
 *
 * @param rootPath 笔记根目录
 * @returns 索引的文件数量
 */
export async function indexAllNotes(
  rootPath: string
): Promise<{ success: boolean; fileCount?: number; error?: string }> {
  try {
    // 检查 Python 服务是否可用
    if (!(await checkPythonApiHealth())) {
      return { success: false, error: "Python 服务不可用" };
    }

    const response = await post<number>("/api/notes/index-all", {
      root_path: rootPath,
    });

    if (response.success) {
      console.log(`[NotesVectorService] 全量索引完成: ${response.data} 个文件`);
      return { success: true, fileCount: response.data };
    } else {
      return { success: false, error: response.error };
    }
  } catch (error) {
    console.error("[NotesVectorService] 全量索引异常:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
