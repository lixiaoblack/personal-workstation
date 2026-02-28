/**
 * 数据库初始化
 * 使用 better-sqlite3 管理本地数据库
 */
import Database from "better-sqlite3";
import { app } from "electron";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

/**
 * 获取数据库路径
 * 数据库存储在用户数据目录下
 */
export function getDatabasePath(): string {
  const userDataPath = app.getPath("userData");
  const dataDir = path.join(userDataPath, "data");

  // 确保数据目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, "workstation.db");
}

/**
 * 初始化数据库连接
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  db = new Database(dbPath);

  // 启用外键约束
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // 运行迁移
  runMigrations(db);

  return db;
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 运行数据库迁移
 */
function runMigrations(database: Database.Database): void {
  // 用户表
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      email TEXT,
      phone TEXT,
      birthday TEXT,
      gender INTEGER DEFAULT 0,
      bio TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      last_login_at TEXT,
      settings TEXT
    );
  `);

  // 登录会话表
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 创建索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  // AI 模型配置表
  database.exec(`
    CREATE TABLE IF NOT EXISTS model_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usage_type TEXT DEFAULT 'llm',
      provider TEXT NOT NULL,
      name TEXT NOT NULL,
      model_id TEXT NOT NULL,
      api_key TEXT,
      api_base_url TEXT,
      organization TEXT,
      host TEXT,
      enabled INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 10,
      status TEXT DEFAULT 'inactive',
      last_error TEXT,
      max_tokens INTEGER,
      temperature REAL,
      keep_alive TEXT,
      extra_params TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // 数据迁移：为 model_configs 表添加 usage_type 列（如果不存在）
  // 注意：必须在创建索引之前执行，否则索引会引用不存在的列
  try {
    const modelColumns = database
      .prepare("PRAGMA table_info(model_configs)")
      .all() as Array<{ name: string }>;
    const hasUsageType = modelColumns.some((col) => col.name === "usage_type");
    if (!hasUsageType) {
      database.exec(
        `ALTER TABLE model_configs ADD COLUMN usage_type TEXT DEFAULT 'llm'`
      );
      console.log("[Database] 已添加 model_configs.usage_type 列");
    }
  } catch (error) {
    console.error("[Database] 添加 usage_type 列失败:", error);
  }

  // 模型配置索引（在列迁移之后创建）
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_model_configs_provider ON model_configs(provider);
    CREATE INDEX IF NOT EXISTS idx_model_configs_enabled ON model_configs(enabled);
    CREATE INDEX IF NOT EXISTS idx_model_configs_is_default ON model_configs(is_default);
    CREATE INDEX IF NOT EXISTS idx_model_configs_usage_type ON model_configs(usage_type);
  `);

  // 数据迁移：将有 API Key 或 host 的模型状态更新为 active
  database.exec(`
    UPDATE model_configs 
    SET status = 'active' 
    WHERE status = 'inactive' 
    AND (api_key IS NOT NULL AND api_key != '' OR host IS NOT NULL AND host != '')
  `);

  // AI 对话表
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      model_id INTEGER,
      model_name TEXT,
      message_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (model_id) REFERENCES model_configs(id) ON DELETE SET NULL
    );
  `);

  // AI 消息表
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tokens_used INTEGER,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // 对话和消息索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_model_id ON conversations(model_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
  `);

  // 数据迁移：为 messages 表添加 metadata 列（如果不存在）
  try {
    const columns = database
      .prepare("PRAGMA table_info(messages)")
      .all() as Array<{ name: string }>;
    const hasMetadata = columns.some((col) => col.name === "metadata");
    if (!hasMetadata) {
      database.exec(`ALTER TABLE messages ADD COLUMN metadata TEXT`);
      console.log("[Database] 已添加 messages.metadata 列");
    }
  } catch (error) {
    console.error("[Database] 添加 metadata 列失败:", error);
  }

  // 知识库表
  database.exec(`
    CREATE TABLE IF NOT EXISTS knowledge (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      embedding_model TEXT DEFAULT 'ollama',
      embedding_model_name TEXT DEFAULT 'nomic-embed-text',
      document_count INTEGER DEFAULT 0,
      total_chunks INTEGER DEFAULT 0,
      storage_path TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
  `);

  // 数据迁移：为 knowledge 表添加 storage_path 列（如果不存在）
  try {
    const knowledgeColumns = database
      .prepare("PRAGMA table_info(knowledge)")
      .all() as Array<{ name: string }>;
    const hasStoragePath = knowledgeColumns.some(
      (col) => col.name === "storage_path"
    );
    if (!hasStoragePath) {
      database.exec(`ALTER TABLE knowledge ADD COLUMN storage_path TEXT`);
      console.log("[Database] 已添加 knowledge.storage_path 列");
    }
  } catch (error) {
    console.error("[Database] 添加 storage_path 列失败:", error);
  }

  // 知识库文档表
  database.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      knowledge_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER DEFAULT 0,
      chunk_count INTEGER DEFAULT 0,
      ocr_text TEXT,
      created_at INTEGER,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge(id) ON DELETE CASCADE
    );
  `);

  // 数据迁移：为 knowledge_documents 表添加 ocr_text 列（如果不存在）
  try {
    const docColumns = database
      .prepare("PRAGMA table_info(knowledge_documents)")
      .all() as Array<{ name: string }>;
    const hasOcrText = docColumns.some((col) => col.name === "ocr_text");
    if (!hasOcrText) {
      database.exec(`ALTER TABLE knowledge_documents ADD COLUMN ocr_text TEXT`);
      console.log("[Database] 已添加 knowledge_documents.ocr_text 列");
    }
  } catch (error) {
    console.error("[Database] 添加 ocr_text 列失败:", error);
  }

  // 数据迁移：为 knowledge_documents 表添加 ocr_blocks 列（存储 OCR 边界框信息）
  try {
    const docColumns = database
      .prepare("PRAGMA table_info(knowledge_documents)")
      .all() as Array<{ name: string }>;
    const hasOcrBlocks = docColumns.some((col) => col.name === "ocr_blocks");
    if (!hasOcrBlocks) {
      database.exec(
        `ALTER TABLE knowledge_documents ADD COLUMN ocr_blocks TEXT`
      );
      console.log("[Database] 已添加 knowledge_documents.ocr_blocks 列");
    }
  } catch (error) {
    console.error("[Database] 添加 ocr_blocks 列失败:", error);
  }

  // 知识库索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_name ON knowledge(name);
    CREATE INDEX IF NOT EXISTS idx_knowledge_documents_knowledge_id ON knowledge_documents(knowledge_id);
  `);

  // ========== 多轮对话状态管理 ==========

  // 对话摘要表（每10条消息生成一次摘要）
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversation_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      start_message_id INTEGER NOT NULL,
      end_message_id INTEGER NOT NULL,
      summary TEXT NOT NULL,
      key_topics TEXT,
      message_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  // 用户长期记忆表（存储用户偏好、项目上下文、任务进度等）
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_type TEXT NOT NULL,
      memory_key TEXT NOT NULL,
      memory_value TEXT NOT NULL,
      source_conversation_id INTEGER,
      confidence REAL DEFAULT 1.0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (source_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );
  `);

  // 摘要和记忆索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conversation_id ON conversation_summaries(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_user_memory_type ON user_memory(memory_type);
    CREATE INDEX IF NOT EXISTS idx_user_memory_key ON user_memory(memory_key);
  `);

  // 唯一约束：memory_type + memory_key 组合唯一
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memory_type_key ON user_memory(memory_type, memory_key);
  `);

  // ========== SimplePostman 数据表 ==========

  // API 项目表（顶层文件夹）
  database.exec(`
    CREATE TABLE IF NOT EXISTS postman_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      base_url TEXT,
      swagger_url TEXT,
      auth_config TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // API 分组表（子文件夹）
  database.exec(`
    CREATE TABLE IF NOT EXISTS postman_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      base_url TEXT,
      auth_config TEXT,
      override_global INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES postman_projects(id) ON DELETE CASCADE
    );
  `);

  // API 请求配置表
  database.exec(`
    CREATE TABLE IF NOT EXISTS postman_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      project_id INTEGER NOT NULL,
      name TEXT,
      method TEXT NOT NULL DEFAULT 'GET',
      url TEXT NOT NULL,
      params TEXT,
      headers TEXT,
      body_type TEXT DEFAULT 'json',
      body TEXT,
      auth_type TEXT DEFAULT 'none',
      auth_config TEXT,
      swagger_info TEXT,
      is_favorite INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (group_id) REFERENCES postman_groups(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES postman_projects(id) ON DELETE CASCADE
    );
  `);

  // 全局配置表（环境、授权等）
  database.exec(`
    CREATE TABLE IF NOT EXISTS postman_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 请求历史记录表
  database.exec(`
    CREATE TABLE IF NOT EXISTS postman_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      request_headers TEXT,
      request_body TEXT,
      response_status INTEGER,
      response_status_text TEXT,
      response_headers TEXT,
      response_body TEXT,
      response_time INTEGER,
      response_size INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (request_id) REFERENCES postman_requests(id) ON DELETE SET NULL
    );
  `);

  // SimplePostman 索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_postman_groups_project_id ON postman_groups(project_id);
    CREATE INDEX IF NOT EXISTS idx_postman_requests_project_id ON postman_requests(project_id);
    CREATE INDEX IF NOT EXISTS idx_postman_requests_group_id ON postman_requests(group_id);
    CREATE INDEX IF NOT EXISTS idx_postman_history_created_at ON postman_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_postman_history_request_id ON postman_history(request_id);
  `);

  // 数据迁移：为 postman_requests 表添加 llm_types 列（存储 LLM 生成的类型定义）
  try {
    const requestColumns = database
      .prepare("PRAGMA table_info(postman_requests)")
      .all() as Array<{ name: string }>;
    const hasLlmTypes = requestColumns.some((col) => col.name === "llm_types");
    if (!hasLlmTypes) {
      database.exec(`ALTER TABLE postman_requests ADD COLUMN llm_types TEXT`);
      console.log("[Database] 已添加 postman_requests.llm_types 列");
    }
  } catch (error) {
    console.error("[Database] 添加 llm_types 列失败:", error);
  }

  // ========== Notes 笔记模块数据表 ==========

  // 笔记设置表（存储根目录路径等配置）
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 笔记文件缓存表（用于快速加载文件树和 RAG 同步）
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      parent_path TEXT,
      type TEXT NOT NULL,
      content_hash TEXT,
      file_mtime INTEGER,
      vector_doc_ids TEXT,
      chunk_count INTEGER DEFAULT 0,
      last_synced_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Notes 索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_settings_key ON notes_settings(key);
    CREATE INDEX IF NOT EXISTS idx_notes_files_path ON notes_files(path);
    CREATE INDEX IF NOT EXISTS idx_notes_files_parent_path ON notes_files(parent_path);
    CREATE INDEX IF NOT EXISTS idx_notes_files_type ON notes_files(type);
  `);

  console.log("[Database] Notes 模块数据表已创建");

  // ========== Todo 待办模块数据表 ==========

  // 待办分类表
  database.exec(`
    CREATE TABLE IF NOT EXISTS todo_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3C83F6',
      icon TEXT DEFAULT 'FolderOutlined',
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 待办事项表
  database.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      due_date INTEGER,
      reminder_time INTEGER,
      repeat_type TEXT DEFAULT 'none',
      repeat_config TEXT,
      parent_id INTEGER,
      tags TEXT,
      sort_order INTEGER DEFAULT 0,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES todo_categories(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE
    );
  `);

  // Todo 索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_todo_categories_name ON todo_categories(name);
    CREATE INDEX IF NOT EXISTS idx_todos_category_id ON todos(category_id);
    CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
    CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);
    CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
  `);

  console.log("[Database] Todo 模块数据表已创建");
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  getDatabasePath,
};
