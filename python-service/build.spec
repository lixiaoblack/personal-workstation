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

# 收集 RapidOCR 数据文件（配置文件、模型等）
# 首先尝试收集整个包目录
try:
    import rapidocr_onnxruntime
    package_path = os.path.dirname(rapidocr_onnxruntime.__file__)
    # 收集整个 rapidocr_onnxruntime 包目录
    datas.append((package_path, 'rapidocr_onnxruntime'))
except Exception as e:
    print(f"Warning: Could not find RapidOCR package: {e}")

# 使用 collect_data_files 作为备份
try:
    rapidocr_datas = collect_data_files('rapidocr_onnxruntime')
    datas.extend(rapidocr_datas)
except Exception as e:
    print(f"Warning: Could not collect RapidOCR data files: {e}")

# 收集 ONNX Runtime 数据文件
try:
    onnx_datas = collect_data_files('onnxruntime')
    datas.extend(onnx_datas)
except Exception:
    pass

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
    
    # LangChain 相关（0.3.0+ 版本需要 langchain_core）
    'langchain',
    'langchain_core',
    'langchain_core.messages',
    'langchain_core.tools',
    'langchain_core.language_models',
    'langchain_core.callbacks',
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
    
    # OCR 相关（RapidOCR + ONNX Runtime）
    'ocr_service',
    'PIL',
    'PIL.Image',
    # RapidOCR 相关（轻量级，跨平台兼容性好）
    'rapidocr_onnxruntime',
    'rapidocr_onnxruntime.ch_ppocr_rec',
    'rapidocr_onnxruntime.ch_ppocr_det',
    'rapidocr_onnxruntime.ch_ppocr_cls',
    # ONNX Runtime
    'onnxruntime',
    # OpenCV（RapidOCR 依赖）
    'cv2',
    
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
    'api',
    'api.routers',
    'api.routers.knowledge',
    'api.routers.conversation',
    'api.routers.memory',
    'api.routers.user',
    'api.routers.ocr',
    'api.database',
    'api.models',
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
        # 排除不必要的大型机器学习库
        'torch',
        'torch.nn',
        'torch.optim',
        'torch.utils',
        'transformers',
        'transformers.models',
        'sentence_transformers',
        'sklearn',
        'sklearn.linear_model',
        'sklearn.ensemble',
        'faiss',
        'faiss-cpu',
        'faiss-gpu',
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
