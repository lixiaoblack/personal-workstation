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
      created_at INTEGER,
      updated_at INTEGER
    );
  `);

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
      created_at INTEGER,
      FOREIGN KEY (knowledge_id) REFERENCES knowledge(id) ON DELETE CASCADE
    );
  `);

  // 知识库索引
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_name ON knowledge(name);
    CREATE INDEX IF NOT EXISTS idx_knowledge_documents_knowledge_id ON knowledge_documents(knowledge_id);
  `);
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  getDatabasePath,
};
