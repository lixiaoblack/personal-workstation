#!/usr/bin/env python3
"""
Python 服务打包脚本

支持 Windows 和 Mac 双平台打包。
自动检测当前系统并执行相应的打包命令。

使用方法：
    python build.py [--clean] [--output DIR]

参数：
    --clean     打包前清理旧的构建文件
    --output    指定输出目录（默认：../dist/python-service）
"""

import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


def get_platform():
    """获取当前平台"""
    system = platform.system().lower()
    if system == "darwin":
        return "mac"
    elif system == "windows":
        return "windows"
    else:
        return "linux"


def clean_build():
    """清理构建文件"""
    print("正在清理构建文件...")

    # 清理 PyInstaller 生成的目录
    dirs_to_clean = ["build", "dist", "__pycache__"]
    for dir_name in dirs_to_clean:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)
            print(f"  已删除: {dir_name}")

    # 清理 .pyc 文件
    for root, dirs, files in os.walk("."):
        for file in files:
            if file.endswith(".pyc"):
                os.remove(os.path.join(root, file))

    print("清理完成")


def check_pyinstaller():
    """检查 PyInstaller 是否已安装"""
    try:
        import PyInstaller
        print(f"PyInstaller 版本: {PyInstaller.__version__}")
        return True
    except ImportError:
        print("错误: PyInstaller 未安装")
        print("请运行: pip install pyinstaller")
        return False


def install_pyinstaller():
    """安装 PyInstaller"""
    print("正在安装 PyInstaller...")
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "pyinstaller"])
    print("PyInstaller 安装完成")


def build(output_dir=None):
    """执行打包"""
    print(f"当前平台: {get_platform()}")

    # 检查 PyInstaller
    if not check_pyinstaller():
        response = input("是否安装 PyInstaller? (y/n): ")
        if response.lower() == "y":
            install_pyinstaller()
        else:
            return False

    # 执行打包
    spec_file = "build.spec"

    if not os.path.exists(spec_file):
        print(f"错误: 找不到 {spec_file}")
        return False

    print("开始打包...")

    # 构建命令
    cmd = [sys.executable, "-m", "PyInstaller", spec_file, "--noconfirm"]

    try:
        subprocess.check_call(cmd)
        print("打包完成!")

        # 处理输出目录
        if output_dir:
            default_output = os.path.join("dist", "python-service")
            if os.path.exists(default_output):
                # 确保目标目录存在
                os.makedirs(os.path.dirname(output_dir), exist_ok=True)

                # 移动或复制输出
                if os.path.exists(output_dir):
                    shutil.rmtree(output_dir)
                shutil.move(default_output, output_dir)
                print(f"输出已移动到: {output_dir}")

        return True

    except subprocess.CalledProcessError as e:
        print(f"打包失败: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Python 服务打包脚本")
    parser.add_argument("--clean", action="store_true", help="打包前清理旧的构建文件")
    parser.add_argument("--output", type=str, help="指定输出目录")

    args = parser.parse_args()

    # 切换到脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    print(f"工作目录: {os.getcwd()}")

    # 清理
    if args.clean:
        clean_build()

    # 设置输出目录
    output_dir = args.output
    if not output_dir:
        # 默认输出到项目的 dist 目录
        output_dir = os.path.join("..", "dist", "python-service")

    # 执行打包
    success = build(output_dir)

    if success:
        print("\n打包成功!")
        print(f"输出目录: {os.path.abspath(output_dir)}")

        # 显示可执行文件路径
        current_platform = get_platform()
        if current_platform == "windows":
            exe_path = os.path.join(output_dir, "python-service.exe")
        else:
            exe_path = os.path.join(output_dir, "python-service")

        if os.path.exists(exe_path):
            print(f"可执行文件: {os.path.abspath(exe_path)}")
    else:
        print("\n打包失败!")
        sys.exit(1)


if __name__ == "__main__":
    main()
