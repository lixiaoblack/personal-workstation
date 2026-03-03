"""
数据库连接模块

提供数据库连接管理和基础操作函数。
"""

import os
import time
import sqlite3
import logging
from typing import Optional
from contextlib import contextmanager

# 配置日志
logger = logging.getLogger(__name__)

# 数据库路径，优先从环境变量获取
DB_PATH: Optional[str] = os.environ.get("DB_PATH")


def get_db_path() -> str:
    """获取数据库路径"""
    global DB_PATH
    if DB_PATH:
        logger.info(f"[Database] 使用环境变量数据库路径: {DB_PATH}")
        return DB_PATH

    # 默认路径
    home = os.path.expanduser("~")
    data_dir = os.path.join(home, ".personal-workstation", "data")
    os.makedirs(data_dir, exist_ok=True)
    DB_PATH = os.path.join(data_dir, "workstation.db")
    logger.info(f"[Database] 使用默认数据库路径: {DB_PATH}")
    return DB_PATH


def get_connection() -> sqlite3.Connection:
    """获取数据库连接"""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db():
    """数据库连接上下文管理器"""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def execute_with_retry(conn, sql: str, params: tuple = (), max_retries: int = 3):
    """执行 SQL，支持重试（处理并发写入锁冲突）"""
    for i in range(max_retries):
        try:
            cursor = conn.execute(sql, params)
            return cursor
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and i < max_retries - 1:
                time.sleep(0.1 * (i + 1))
                continue
            raise


def init_agents_table():
    """
    初始化智能体表

    智能体表存储用户创建的智能体配置。
    """
    conn = get_connection()
    try:
        # 创建智能体表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                avatar TEXT,
                model_id INTEGER,
                model_name TEXT,
                system_prompt TEXT,
                tools TEXT DEFAULT '[]',
                knowledge_ids TEXT DEFAULT '[]',
                skills TEXT DEFAULT '[]',
                parameters TEXT DEFAULT '{}',
                workflow_id TEXT,
                status TEXT DEFAULT 'active',
                created_at INTEGER,
                updated_at INTEGER
            )
        """)

        # 检查是否需要添加 workflow_id 列（迁移）
        cursor = conn.execute("PRAGMA table_info(agents)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'workflow_id' not in columns:
            conn.execute("ALTER TABLE agents ADD COLUMN workflow_id TEXT")
            logger.info("已添加 workflow_id 列到 agents 表")

        # 创建索引
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at)
        """)

        conn.commit()
        logger.info("智能体表初始化完成")
    except Exception as e:
        logger.error(f"初始化智能体表失败: {e}")
        raise
    finally:
        conn.close()


def init_workflows_table():
    """
    初始化工作流表

    工作流表存储智能体的可视化工作流配置。
    """
    conn = get_connection()
    try:
        # 创建工作流表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                agent_id TEXT,
                name TEXT NOT NULL,
                description TEXT,
                nodes TEXT DEFAULT '[]',
                edges TEXT DEFAULT '[]',
                variables TEXT DEFAULT '{}',
                status TEXT DEFAULT 'draft',
                created_at INTEGER,
                updated_at INTEGER,
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
            )
        """)

        # 创建索引
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_workflows_agent_id ON workflows(agent_id)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at)
        """)

        conn.commit()
        logger.info("工作流表初始化完成")
    except Exception as e:
        logger.error(f"初始化工作流表失败: {e}")
        raise
    finally:
        conn.close()


# 应用启动时初始化表
init_agents_table()
init_workflows_table()
