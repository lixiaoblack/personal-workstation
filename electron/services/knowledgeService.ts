/**
 * 知识库服务
 *
 * 提供知识库的管理功能：
 * 1. 创建/删除知识库（SQLite + LanceDB）
 * 2. 添加/删除文档
 * 3. 搜索知识库
 */
import { getDatabase } from "../database";
import { randomUUID } from "crypto";
import type { KnowledgeInfo, KnowledgeDocumentInfo } from "../types/websocket";
import { sendKnowledgeRequest } from "./websocketService";
import { MessageType } from "../types/websocket";

/**
 * 创建知识库（同时创建 SQLite 记录和 LanceDB 集合）
 */
export async function createKnowledge(
  name: string,
  description?: string,
  embeddingModel: string = "ollama",
  embeddingModelName: string = "nomic-embed-text"
): Promise<KnowledgeInfo> {
  const db = getDatabase();
  const id = `kb_${randomUUID().replace(/-/g, "")}`;
  const now = Date.now();

  // 1. 先创建 SQLite 记录
  const stmt = db.prepare(`
    INSERT INTO knowledge (id, name, description, embedding_model, embedding_model_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    name,
    description || null,
    embeddingModel,
    embeddingModelName,
    now,
    now
  );

  // 2. 创建 LanceDB 集合
  try {
    await createLanceDBCollection(id, embeddingModel, embeddingModelName);
  } catch (error) {
    console.error(`[KnowledgeService] 创建 LanceDB 集合失败: ${id}`, error);
    // 回滚 SQLite 记录
    db.prepare("DELETE FROM knowledge WHERE id = ?").run(id);
    throw new Error(`创建知识库失败: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    id,
    name,
    description,
    embeddingModel,
    embeddingModelName,
    documentCount: 0,
    totalChunks: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 创建 LanceDB 向量存储集合
 */
async function createLanceDBCollection(
  knowledgeId: string,
  embeddingModel: string,
  embeddingModelName: string
): Promise<void> {
  const response = await sendKnowledgeRequest<{
    success: boolean;
    error?: string;
  }>(MessageType.KNOWLEDGE_CREATE, {
    knowledgeId,
    name: knowledgeId, // 仅用于 LanceDB 内部，实际名称在 SQLite 中
    embeddingModel,
    embeddingModelName,
    syncToElectron: false, // 前端已创建 SQLite，不需要同步
  });

  if (!response.success) {
    throw new Error(response.error || "创建向量存储集合失败");
  }
}

/**
 * 删除 LanceDB 向量存储集合
 */
async function deleteLanceDBCollection(knowledgeId: string): Promise<void> {
  try {
    await sendKnowledgeRequest<{
      success: boolean;
      error?: string;
    }>(MessageType.KNOWLEDGE_DELETE, {
      knowledgeId,
    });
  } catch (error) {
    console.error(`[KnowledgeService] 删除 LanceDB 集合失败: ${knowledgeId}`, error);
    // 删除失败不抛错，因为 SQLite 记录已经删除
  }
}

/**
 * 使用指定 ID 创建知识库（用于 Agent 调用同步）
 */
export function createKnowledgeWithId(
  id: string,
  name: string,
  description?: string,
  embeddingModel: string = "ollama",
  embeddingModelName: string = "nomic-embed-text"
): KnowledgeInfo | null {
  const db = getDatabase();
  const now = Date.now();

  try {
    const stmt = db.prepare(`
      INSERT INTO knowledge (id, name, description, embedding_model, embedding_model_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      description || null,
      embeddingModel,
      embeddingModelName,
      now,
      now
    );

    return {
      id,
      name,
      description,
      embeddingModel,
      embeddingModelName,
      documentCount: 0,
      totalChunks: 0,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error(`[KnowledgeService] 创建知识库失败 (id=${id}):`, error);
    return null;
  }
}

/**
 * 删除知识库（同时删除 SQLite 记录和 LanceDB 集合）
 */
export async function deleteKnowledge(knowledgeId: string): Promise<boolean> {
  const db = getDatabase();

  // 1. 先删除 SQLite 记录
  const stmt = db.prepare("DELETE FROM knowledge WHERE id = ?");
  const result = stmt.run(knowledgeId);

  if (result.changes === 0) {
    return false;
  }

  // 2. 删除关联的文档记录
  db.prepare("DELETE FROM knowledge_documents WHERE knowledge_id = ?").run(knowledgeId);

  // 3. 删除 LanceDB 集合
  await deleteLanceDBCollection(knowledgeId);

  return true;
}

/**
 * 获取知识库列表
 */
export function listKnowledge(): KnowledgeInfo[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT 
      id, name, description, embedding_model, embedding_model_name, 
      document_count, total_chunks, created_at, updated_at
    FROM knowledge
    ORDER BY updated_at DESC
  `);

  const rows = stmt.all() as Array<{
    id: string;
    name: string;
    description: string | null;
    embedding_model: string;
    embedding_model_name: string;
    document_count: number;
    total_chunks: number;
    created_at: number;
    updated_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    embeddingModel: row.embedding_model,
    embeddingModelName: row.embedding_model_name,
    documentCount: row.document_count,
    totalChunks: row.total_chunks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 获取知识库详情
 */
export function getKnowledge(knowledgeId: string): KnowledgeInfo | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT 
      id, name, description, embedding_model, embedding_model_name, 
      document_count, total_chunks, created_at, updated_at
    FROM knowledge
    WHERE id = ?
  `);

  const row = stmt.get(knowledgeId) as
    | {
        id: string;
        name: string;
        description: string | null;
        embedding_model: string;
        embedding_model_name: string;
        document_count: number;
        total_chunks: number;
        created_at: number;
        updated_at: number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    embeddingModel: row.embedding_model,
    embeddingModelName: row.embedding_model_name,
    documentCount: row.document_count,
    totalChunks: row.total_chunks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 添加文档记录
 */
export function addDocument(
  knowledgeId: string,
  fileName: string,
  filePath: string,
  fileType: string,
  fileSize: number,
  chunkCount: number
): KnowledgeDocumentInfo {
  const db = getDatabase();
  const id = `doc_${randomUUID().replace(/-/g, "")}`;
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO knowledge_documents (id, knowledge_id, file_name, file_path, file_type, file_size, chunk_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    knowledgeId,
    fileName,
    filePath,
    fileType,
    fileSize,
    chunkCount,
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
    // 更新知识库统计
    updateKnowledgeStats(knowledgeId);
    return true;
  }

  return false;
}

/**
 * 获取知识库文档列表
 */
export function listDocuments(knowledgeId: string): KnowledgeDocumentInfo[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, knowledge_id, file_name, file_path, file_type, file_size, chunk_count, created_at
    FROM knowledge_documents
    WHERE knowledge_id = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(knowledgeId) as Array<{
    id: string;
    knowledge_id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    chunk_count: number;
    created_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    knowledgeId: row.knowledge_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileType: row.file_type,
    fileSize: row.file_size,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
  }));
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

/**
 * 更新知识库信息
 */
export function updateKnowledge(
  knowledgeId: string,
  data: { name?: string; description?: string }
): KnowledgeInfo | null {
  const db = getDatabase();
  const now = Date.now();

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.name) {
    updates.push("name = ?");
    values.push(data.name);
  }

  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description);
  }

  if (updates.length === 0) {
    return getKnowledge(knowledgeId);
  }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(knowledgeId);

  const stmt = db.prepare(
    `UPDATE knowledge SET ${updates.join(", ")} WHERE id = ?`
  );
  stmt.run(...values);

  return getKnowledge(knowledgeId);
}

export default {
  createKnowledge,
  createKnowledgeWithId,
  deleteKnowledge,
  listKnowledge,
  getKnowledge,
  updateKnowledge,
  addDocument,
  removeDocument,
  listDocuments,
  updateKnowledgeStats,
};
