# -*- coding: utf-8 -*-
"""
OCR 模块运行时钩子

解决 PyInstaller 打包后的路径问题：
1. 设置 PaddleOCR 模型路径
2. 设置正确的临时目录
3. 配置环境变量
"""

import os
import sys

# 获取打包后的根目录
if getattr(sys, 'frozen', False):
    # 打包后运行
    ROOT_DIR = os.path.dirname(sys.executable)
else:
    # 开发环境运行
    ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# 设置 PaddleOCR 模型路径
# 优先使用打包目录下的模型，然后是用户目录
PACKAGED_MODELS_DIR = os.path.join(ROOT_DIR, 'paddleocr_models')
USER_MODELS_DIR = os.path.expanduser('~/.paddleocr')

# 设置环境变量，告诉 PaddleOCR 模型位置
if os.path.exists(PACKAGED_MODELS_DIR):
    os.environ['PADDLEOCR_MODEL_DIR'] = PACKAGED_MODELS_DIR
    print(f"[OCR Hook] 使用打包的模型目录: {PACKAGED_MODELS_DIR}")
else:
    print(f"[OCR Hook] 打包模型目录不存在: {PACKAGED_MODELS_DIR}")
    if os.path.exists(USER_MODELS_DIR):
        print(f"[OCR Hook] 使用用户模型目录: {USER_MODELS_DIR}")

# 禁用模型源检查，加快启动速度
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

# 设置 PaddlePaddle 日志级别
os.environ['GLOG_minloglevel'] = '2'
os.environ['FLAGS_eager_delete_tensor_gb'] = '0.0'

# Windows 特殊处理
if sys.platform == 'win32':
    # 设置 DLL 搜索路径
    dll_dirs = [
        ROOT_DIR,
        os.path.join(ROOT_DIR, 'paddle'),
        os.path.join(ROOT_DIR, 'paddleocr'),
    ]
    for dll_dir in dll_dirs:
        if os.path.exists(dll_dir):
            try:
                os.add_dll_directory(dll_dir)
            except (AttributeError, OSError):
                pass  # Python < 3.8 或路径不存在

print("[OCR Hook] 运行时钩子初始化完成")
