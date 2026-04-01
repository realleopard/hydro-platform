"""
Watershed Model SDK - 流域水系统模拟模型平台 Python SDK

提供模型开发、测试、打包和集成到平台的工具。
"""

__version__ = "0.1.0"
__author__ = "Watershed Platform Team"

from .model import BaseModel, ModelConfig
from .io import InputHandler, OutputHandler, DataType
from .validation import ValidationMetrics, Validator
from .client import PlatformClient
from .executor import LocalExecutor

__all__ = [
    "BaseModel",
    "ModelConfig",
    "InputHandler",
    "OutputHandler",
    "DataType",
    "ValidationMetrics",
    "Validator",
    "PlatformClient",
    "LocalExecutor",
]
