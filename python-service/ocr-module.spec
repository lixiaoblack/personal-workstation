# -*- mode: python ; coding: utf-8 -*-
"""
OCR 模块 PyInstaller 打包配置

使用方法:
    pyinstaller ocr-module.spec

输出:
    dist/ocr-module/ 目录下的可执行文件
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# 获取当前目录
SPEC_DIR = os.path.dirname(os.path.abspath(SPEC))

# 收集数据文件
datas = []

# 收集 PaddleOCR 数据文件（包括模型配置、推理模型等）
try:
    paddle_datas = collect_data_files('paddleocr', include_py_files=False)
    datas.extend(paddle_datas)
    print(f"[OCR Spec] 收集 paddleocr 数据文件: {len(paddle_datas)} 个")
except Exception as e:
    print(f"[OCR Spec] 收集 paddleocr 数据文件失败: {e}")

try:
    paddle_datas = collect_data_files('paddle', include_py_files=False)
    datas.extend(paddle_datas)
    print(f"[OCR Spec] 收集 paddle 数据文件: {len(paddle_datas)} 个")
except Exception as e:
    print(f"[OCR Spec] 收集 paddle 数据文件失败: {e}")

# 收集 paddleocr 的所有子模块
try:
    paddle_modules = collect_submodules('paddleocr')
    print(f"[OCR Spec] 收集 paddleocr 子模块: {len(paddle_modules)} 个")
except Exception as e:
    print(f"[OCR Spec] 收集 paddleocr 子模块失败: {e}")

# 收集 PaddleOCR 预训练模型目录（如果存在）
model_dirs = [
    os.path.expanduser('~/.paddleocr'),  # 用户目录下的模型
    os.path.expanduser('~/.paddle'),      # PaddlePaddle 数据
]
for model_dir in model_dirs:
    if os.path.exists(model_dir):
        print(f"[OCR Spec] 发现模型目录: {model_dir}")
        # 收集目录下的所有文件
        for root, dirs, files in os.walk(model_dir):
            for f in files:
                if f.endswith(('.pdmodel', '.pdiparams', '.yml', '.yaml', '.json')):
                    src = os.path.join(root, f)
                    dst = os.path.relpath(root, model_dir)
                    datas.append((src, os.path.join('paddleocr_models', dst)))
                    print(f"[OCR Spec] 添加模型文件: {src}")

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

    # PaddleOCR 相关 - 完整模块列表
    'paddle',
    'paddle.fluid',
    'paddle.dataset',
    'paddleocr',
    'paddleocr.ppocr',
    'paddleocr.ppocr.utils',
    'paddleocr.ppocr.utils.logging',
    'paddleocr.ppocr.utils.utility',
    'paddleocr.ppocr.data',
    'paddleocr.ppocr.data.img_aug',
    'paddleocr.ppocr.postprocess',
    'paddleocr.ppocr.architectures',
    'paddleocr.ppocr.modeling',
    'paddleocr.ppocr.modeling.architectures',
    'paddleocr.ppocr.modeling.backbones',
    'paddleocr.ppocr.modeling.necks',
    'paddleocr.ppocr.modeling.heads',

    # 图像处理
    'cv2',
    'numpy',
    'scipy',
    'scipy.ndimage',
    'scipy.spatial',

    # PaddlePaddle 核心模块
    'paddle.nn',
    'paddle.nn.functional',
    'paddle.optimizer',
    'paddle.io',
    'paddle.vision',
    'paddle.tensor',
    'paddle.onnx',
    'paddle.hapi',
]

# 扩展 hiddenimports
try:
    hiddenimports.extend(paddle_modules)
except:
    pass

# 分析入口文件
a = Analysis(
    ['ocr_module_main.py'],
    pathex=[SPEC_DIR],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[os.path.join(SPEC_DIR, 'ocr_runtime_hook.py')],  # 添加运行时钩子
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
