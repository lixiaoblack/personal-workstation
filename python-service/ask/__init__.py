#!/usr/bin/env python3
"""
Ask 模块 - 通用交互询问系统

用于前后端交互式确认、选择、输入等场景。
支持多种交互类型：单选、多选、确认、输入、级联选择、API动态选项。
"""
from .handler import AskHandler
from .registry import AskRegistry
from .types import (
    AskType,
    AskOption,
    AskMessage,
    AskResponse,
    AskResult,
    AskApiConfig,
    AskInputConfig,
)

__all__ = [
    "AskHandler",
    "AskRegistry",
    "AskType",
    "AskOption",
    "AskMessage",
    "AskResponse",
    "AskResult",
    "AskApiConfig",
    "AskInputConfig",
]
