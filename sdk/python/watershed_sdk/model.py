"""
模型基类和配置类
"""

import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class Parameter:
    """模型参数定义"""
    name: str
    type: str  # float, int, string, bool
    default: Any
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    description: str = ""
    unit: str = ""


@dataclass
class Variable:
    """模型变量定义（输入/输出）"""
    name: str
    type: str  # scalar, timeseries, raster, vector
    data_type: str  # float, int
    dimensions: List[str] = field(default_factory=list)
    description: str = ""
    unit: str = ""
    required: bool = True


@dataclass
class ModelConfig:
    """模型配置类"""
    name: str
    version: str
    description: str = ""
    author: str = ""
    email: str = ""
    license: str = "MIT"

    # 模型接口定义
    parameters: List[Parameter] = field(default_factory=list)
    inputs: List[Variable] = field(default_factory=list)
    outputs: List[Variable] = field(default_factory=list)

    # 资源需求
    cpu_cores: int = 1
    memory_mb: int = 512
    disk_mb: int = 1024
    max_runtime_seconds: int = 3600

    # 容器配置
    base_image: str = "python:3.11-slim"
    dependencies: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        """转换为字典"""
        return asdict(self)

    def to_json(self, path: Optional[str] = None) -> str:
        """转换为JSON字符串或保存到文件"""
        json_str = json.dumps(self.to_dict(), indent=2, ensure_ascii=False)
        if path:
            Path(path).write_text(json_str, encoding='utf-8')
        return json_str

    @classmethod
    def from_dict(cls, data: Dict) -> "ModelConfig":
        """从字典创建配置"""
        # 转换嵌套对象
        if 'parameters' in data:
            data['parameters'] = [Parameter(**p) for p in data['parameters']]
        if 'inputs' in data:
            data['inputs'] = [Variable(**v) for v in data['inputs']]
        if 'outputs' in data:
            data['outputs'] = [Variable(**v) for v in data['outputs']]
        return cls(**data)

    @classmethod
    def from_json(cls, path: str) -> "ModelConfig":
        """从JSON文件加载配置"""
        data = json.loads(Path(path).read_text(encoding='utf-8'))
        return cls.from_dict(data)


class BaseModel(ABC):
    """
    模型基类

    所有需要集成到平台的模型都必须继承此类
    """

    def __init__(self, config: ModelConfig):
        self.config = config
        self.parameters: Dict[str, Any] = {}
        self.inputs: Dict[str, Any] = {}
        self.outputs: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {
            "start_time": None,
            "end_time": None,
            "status": "initialized",
            "error": None
        }
        logger.info(f"模型 {config.name} v{config.version} 初始化完成")

    def set_parameters(self, **kwargs) -> "BaseModel":
        """
        设置模型参数

        Args:
            **kwargs: 参数名和值

        Returns:
            self 支持链式调用
        """
        for param_def in self.config.parameters:
            name = param_def.name
            if name in kwargs:
                value = kwargs[name]
                # 类型检查和转换
                value = self._validate_type(value, param_def.type)
                # 范围检查
                if param_def.min_value is not None and value < param_def.min_value:
                    raise ValueError(f"参数 {name} 值 {value} 小于最小值 {param_def.min_value}")
                if param_def.max_value is not None and value > param_def.max_value:
                    raise ValueError(f"参数 {name} 值 {value} 大于最大值 {param_def.max_value}")
                self.parameters[name] = value
            elif name not in self.parameters:
                # 使用默认值
                self.parameters[name] = param_def.default

        logger.debug(f"参数设置: {self.parameters}")
        return self

    def set_inputs(self, **kwargs) -> "BaseModel":
        """
        设置模型输入数据

        Args:
            **kwargs: 输入变量名和值

        Returns:
            self 支持链式调用
        """
        for input_def in self.config.inputs:
            name = input_def.name
            if name in kwargs:
                self.inputs[name] = kwargs[name]
            elif input_def.required and name not in self.inputs:
                raise ValueError(f"缺少必需的输入变量: {name}")

        logger.debug(f"输入设置完成: {list(self.inputs.keys())}")
        return self

    @abstractmethod
    def run(self) -> "BaseModel":
        """
        运行模型

        子类必须实现此方法

        Returns:
            self 支持链式调用
        """
        pass

    def get_outputs(self) -> Dict[str, Any]:
        """
        获取模型输出

        Returns:
            输出变量字典
        """
        return self.outputs.copy()

    def get_metadata(self) -> Dict[str, Any]:
        """
        获取运行元数据

        Returns:
            元数据字典
        """
        return self.metadata.copy()

    def _validate_type(self, value: Any, expected_type: str) -> Any:
        """验证和转换类型"""
        type_map = {
            "float": float,
            "int": int,
            "string": str,
            "bool": bool
        }

        if expected_type in type_map:
            try:
                return type_map[expected_type](value)
            except (ValueError, TypeError) as e:
                raise TypeError(f"无法将 {value} 转换为 {expected_type}: {e}")
        return value

    def _pre_run(self):
        """运行前准备"""
        self.metadata["start_time"] = datetime.now().isoformat()
        self.metadata["status"] = "running"
        logger.info("开始运行模型...")

    def _post_run(self, success: bool = True, error: Optional[str] = None):
        """运行后处理"""
        self.metadata["end_time"] = datetime.now().isoformat()
        self.metadata["status"] = "completed" if success else "failed"
        if error:
            self.metadata["error"] = error

        if success:
            logger.info("模型运行完成")
        else:
            logger.error(f"模型运行失败: {error}")

    def save_outputs(self, output_dir: str):
        """
        保存输出到目录

        Args:
            output_dir: 输出目录路径
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # 保存输出数据
        for name, data in self.outputs.items():
            file_path = output_path / f"{name}.nc"
            # 这里使用 netCDF 格式保存
            # 实际实现需要依赖 xarray 等库
            logger.info(f"保存输出 {name} 到 {file_path}")

        # 保存元数据
        meta_path = output_path / "metadata.json"
        meta_path.write_text(
            json.dumps(self.metadata, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )

        logger.info(f"输出保存完成: {output_dir}")
