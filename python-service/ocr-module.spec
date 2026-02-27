# -*- mode: python ; coding: utf-8 -*-
"""
OCR 模块 PyInstaller 打包配置

使用方法:
    pyinstaller ocr-module.spec

输出:
    dist/ocr-module/ 目录下的可执行文件

基于 RapidOCR（轻量级，跨平台兼容性好）
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# 获取当前目录
SPEC_DIR = os.path.dirname(os.path.abspath(SPEC))

# 收集数据文件
datas = []

# 收集 RapidOCR 数据文件
try:
    rapidocr_datas = collect_data_files('rapidocr_onnxruntime')
    datas.extend(rapidocr_datas)
except Exception:
    pass

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
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',

    # HTTP 客户端
    'httpx',
    'httpcore',

    # 其他依赖
    'pydantic',
    'yaml',

    # OCR 相关
    'ocr_service',
    'PIL',
    'PIL.Image',

    # RapidOCR 相关
    'rapidocr_onnxruntime',
    'rapidocr_onnxruntime.ch_ppocr_rec',
    'rapidocr_onnxruntime.ch_ppocr_det',
    'rapidocr_onnxruntime.ch_ppocr_cls',

    # ONNX Runtime
    'onnxruntime',

    # 图像处理
    'cv2',
    'numpy',
    'scipy',
    'scipy.ndimage',
    'scipy.spatial',

    # RapidOCR 依赖
    'pyclipper',
    'shapely',
    'shapely.geometry',
    'shapely.ops',
]

# 分析入口文件
a = Analysis(
    ['ocr_module_main.py'],
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
        'IPython',
        'jupyter',
        # 排除不需要的大型库
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
        # 排除 LangChain（OCR 模块不需要）
        'langchain',
        'langchain_core',
        'langchain_community',
        'langgraph',
        'lancedb',
        # 排除 PaddlePaddle（已迁移到 RapidOCR）
        'paddle',
        'paddle.fluid',
        'paddle.dataset',
        'paddleocr',
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
    name='ocr-module',
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
    name='ocr-module',
)
