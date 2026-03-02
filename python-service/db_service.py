"""
数据库服务 - FastAPI HTTP API 入口

提供统一的数据访问层，所有数据库操作都在这里实现。
Electron 通过 HTTP API 调用，Agent 直接调用数据库函数。

API 端点:
- /api/knowledge/*   知识库管理
- /api/conversations/* 对话管理
- /api/messages/*    消息管理
- /api/memories/*    记忆管理
- /api/users/*       用户管理
- /api/ocr/*         OCR 服务
- /health            健康检查
"""

import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import (
    get_db_path,
    knowledge_router, conversation_router,
    memory_router, user_router, ocr_router, llm_router,
    notes_router
)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== FastAPI 应用 ====================

app = FastAPI(
    title="Personal Workstation Data Service",
    description="统一数据访问层 API",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 健康检查 ====================

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "db_path": get_db_path()
    }


# ==================== 注册路由 ====================

app.include_router(knowledge_router)
app.include_router(conversation_router)
app.include_router(memory_router)
app.include_router(user_router)
app.include_router(ocr_router)
app.include_router(llm_router)
app.include_router(notes_router)


# ==================== 启动入口 ====================

def run_http_server(host: str = "127.0.0.1", port: int = 8766):
    """运行 HTTP 服务"""
    import uvicorn
    logger.info(f"启动 HTTP 数据服务: http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    run_http_server()
