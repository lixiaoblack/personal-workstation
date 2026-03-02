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
        return DB_PATH

    # 默认路径
    home = os.path.expanduser("~")
    data_dir = os.path.join(home, ".personal-workstation", "data")
    os.makedirs(data_dir, exist_ok=True)
    DB_PATH = os.path.join(data_dir, "workstation.db")
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
                status TEXT DEFAULT 'active',
                created_at INTEGER,
                updated_at INTEGER
            )
        """)

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


# 应用启动时初始化表
init_agents_table()
