/**
 * 知识库服务
 *
 * 通过 Python HTTP API 实现知识库管理功能
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { get, post, put, del } from "./pythonApiClient";
import { getDatabase } from "../database/index";
import { randomUUID } from "crypto";
import type { KnowledgeInfo, KnowledgeDocumentInfo } from "../types/websocket";

/**
 * 创建知识库
 */
export async function createKnowledge(
  name: string,
  description?: string,
  embeddingModel: string = "ollama",
  embeddingModelName: string = "nomic-embed-text"
): Promise<KnowledgeInfo> {
  const response = await post<KnowledgeInfo>("/api/knowledge/create", {
    name,
    description,
    embedding_model: embeddingModel,
    embedding_model_name: embeddingModelName,
  });

  if (!response.success || !response.data) {
    throw new Error(response.error || "创建知识库失败");
  }

  // 转换字段名
  return transformKnowledgeInfo(response.data);
}

/**
 * 删除知识库
 */
export async function deleteKnowledge(knowledgeId: string): Promise<boolean> {
  const response = await del(`/api/knowledge/${knowledgeId}`);
  return response.success;
}

/**
 * 获取知识库列表
 */
export async function listKnowledge(): Promise<KnowledgeInfo[]> {
  const response = await get<KnowledgeInfo[]>("/api/knowledge/list");
  if (response.success && response.data) {
    return response.data.map(transformKnowledgeInfo);
  }
  return [];
}

/**
 * 获取知识库详情
 */
export async function getKnowledge(
  knowledgeId: string
): Promise<KnowledgeInfo | null> {
  const response = await get<KnowledgeInfo>(`/api/knowledge/${knowledgeId}`);
  if (response.success && response.data) {
    return transformKnowledgeInfo(response.data);
  }
  return null;
}

/**
 * 使用指定 ID 创建知识库（用于 Agent 调用）
 * 注意：此方法现在通过 HTTP API 实现
 */
export async function createKnowledgeWithId(
  id: string,
  name: string,
  description?: string,
  embeddingModel: string = "ollama",
  embeddingModelName: string = "nomic-embed-text"
): Promise<KnowledgeInfo | null> {
  try {
    // 使用 Python 的直接调用函数（需要添加新的 API 端点）
    // 暂时使用普通创建，忽略 ID 参数
    const response = await post<KnowledgeInfo>("/api/knowledge/create", {
      name,
      description,
      embedding_model: embeddingModel,
      embedding_model_name: embeddingModelName,
    });

    if (response.success && response.data) {
      return transformKnowledgeInfo(response.data);
    }
    return null;
  } catch (error) {
    console.error(`[KnowledgeService] 创建知识库失败 (id=${id}):`, error);
    return null;
  }
}

/**
 * 更新知识库信息
 */
export async function updateKnowledge(
  knowledgeId: string,
  data: { name?: string; description?: string }
): Promise<KnowledgeInfo | null> {
  const response = await put<KnowledgeInfo>(
    `/api/knowledge/${knowledgeId}`,
    data
  );

  if (!response.success || !response.data) {
    return null;
  }

  return transformKnowledgeInfo(response.data);
}

/**
 * 获取知识库文档列表
 */
export async function listDocuments(
  knowledgeId: string
): Promise<KnowledgeDocumentInfo[]> {
  const response = await get<KnowledgeDocumentInfo[]>(
    `/api/knowledge/${knowledgeId}/documents`
  );
  if (response.success && response.data) {
    return response.data.map(transformDocumentInfo);
  }
  return [];
}

/**
 * 添加文档记录（保留原有实现，用于 LanceDB 同步）
 */
export function addDocument(
  knowledgeId: string,
  fileName: string,
  filePath: string,
  fileType: string,
  fileSize: number,
  chunkCount: number,
  ocrText?: string,
  ocrBlocks?: string
): KnowledgeDocumentInfo {
  const db = getDatabase();
  const id = `doc_${randomUUID().replace(/-/g, "")}`;
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO knowledge_documents (id, knowledge_id, file_name, file_path, file_type, file_size, chunk_count, ocr_text, ocr_blocks, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    knowledgeId,
    fileName,
    filePath,
    fileType,
    fileSize,
    chunkCount,
    ocrText || null,
    ocrBlocks || null,
    now
  );

  // 更新知识库统计
  updateKnowledgeStats(knowledgeId);

  return {
    id,
    knowledgeId,
    fileName,
    filePath,
    fileType,
    fileSize,
    chunkCount,
    ocrText,
    ocrBlocks,
    createdAt: now,
  };
}

/**
 * 删除文档记录
 */
export function removeDocument(
  knowledgeId: string,
  documentId: string
): boolean {
  const db = getDatabase();

  const stmt = db.prepare(
    "DELETE FROM knowledge_documents WHERE id = ? AND knowledge_id = ?"
  );
  const result = stmt.run(documentId, knowledgeId);

  if (result.changes > 0) {
    updateKnowledgeStats(knowledgeId);
    return true;
  }

  return false;
}

/**
 * 更新知识库统计信息
 */
export function updateKnowledgeStats(knowledgeId: string): void {
  const db = getDatabase();

  const statsStmt = db.prepare(`
    SELECT 
      COUNT(*) as document_count,
      SUM(chunk_count) as total_chunks
    FROM knowledge_documents
    WHERE knowledge_id = ?
  `);

  const stats = statsStmt.get(knowledgeId) as {
    document_count: number;
    total_chunks: number | null;
  };

  const updateStmt = db.prepare(`
    UPDATE knowledge 
    SET document_count = ?, total_chunks = ?, updated_at = ?
    WHERE id = ?
  `);

  updateStmt.run(
    stats.document_count,
    stats.total_chunks || 0,
    Date.now(),
    knowledgeId
  );
}

// ==================== 辅助函数 ====================

/**
 * 转换知识库信息字段名（Python 风格 -> TypeScript 风格）
 */
function transformKnowledgeInfo(data: any): KnowledgeInfo {
  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string | undefined,
    embeddingModel: (data.embedding_model || data.embeddingModel) as string,
    embeddingModelName: (data.embedding_model_name ||
      data.embeddingModelName) as string,
    documentCount: (data.document_count || data.documentCount || 0) as number,
    totalChunks: (data.total_chunks || data.totalChunks || 0) as number,
    storagePath: (data.storage_path || data.storagePath) as string | undefined,
    createdAt: (data.created_at || data.createdAt) as number,
    updatedAt: (data.updated_at || data.updatedAt) as number,
  };
}

/**
 * 转换文档信息字段名
 */
function transformDocumentInfo(data: any): KnowledgeDocumentInfo {
  return {
    id: data.id as string,
    knowledgeId: (data.knowledge_id || data.knowledgeId) as string,
    fileName: (data.file_name || data.fileName) as string,
    filePath: (data.file_path || data.filePath) as string,
    fileType: (data.file_type || data.fileType) as string,
    fileSize: (data.file_size || data.fileSize) as number,
    chunkCount: (data.chunk_count || data.chunkCount) as number,
    ocrText: (data.ocr_text || data.ocrText) as string | undefined,
    ocrBlocks: (data.ocr_blocks || data.ocrBlocks) as string | undefined,
    createdAt: (data.created_at || data.createdAt) as number,
  };
}

export default {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  getKnowledge,
  createKnowledgeWithId,
  updateKnowledge,
  addDocument,
  removeDocument,
  listDocuments,
  updateKnowledgeStats,
};
