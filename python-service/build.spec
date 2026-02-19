# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller 打包配置

使用方法：
    pyinstaller build.spec

输出：
    dist/python-service/ 目录下的可执行文件
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# 获取当前目录
SPEC_DIR = os.path.dirname(os.path.abspath(SPEC))

# 收集数据文件
datas = [
    # Skills 目录
    ('skills', 'skills'),
]

# 收集隐式导入
hiddenimports = [
    # FastAPI 和 uvicorn
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    
    # LangChain 相关
    'langchain',
    'langchain_community',
    'langchain_openai',
    'langchain_ollama',
    'langgraph',
    
    # LanceDB
    'lancedb',
    
    # HTTP 客户端
    'httpx',
    'httpcore',
    
    # 其他依赖
    'pydantic',
    'yaml',
    
    # 自定义模块
    'db_service',
    'message_handler',
    'model_router',
    'ollama_client',
    'ws_client',
    'memory_service',
    'agent',
    'agent.skills',
    'agent.tools',
    'agent.knowledge_tool',
    'agent.web_search_tool',
    'agent.web_crawler',
    'agent.deep_agent',
    'agent.graph',
    'agent.state',
    'rag',
    'rag.embeddings',
    'rag.vectorstore',
    'rag.retriever',
    'rag.document_processor',
    'rag.text_splitter',
]

# 分析入口文件
a = Analysis(
    ['main.py'],
    pathex=[SPEC_DIR],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy.f2py',
        'IPython',
        'jupyter',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# 排除不需要的模块
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='python-service',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # 保持控制台窗口以便查看日志
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='python-service',
)
