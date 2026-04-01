"""
输入输出数据处理模块
"""

import json
import logging
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class DataType(Enum):
    """支持的数据类型"""
    SCALAR = "scalar"
    TIMESERIES = "timeseries"
    RASTER = "raster"
    VECTOR = "vector"
    NETCDF = "netcdf"
    GEOTIFF = "geotiff"
    JSON = "json"
    CSV = "csv"


class InputHandler:
    """
    输入数据处理类

    处理各种格式的输入数据，统一转换为模型可用的格式
    """

    def __init__(self, base_path: Optional[str] = None):
        self.base_path = Path(base_path) if base_path else Path.cwd()
        self.cache: Dict[str, Any] = {}

    def load(
        self,
        source: Union[str, Path, Dict],
        data_type: DataType,
        **kwargs
    ) -> Any:
        """
        加载输入数据

        Args:
            source: 数据源（文件路径或数据字典）
            data_type: 数据类型
            **kwargs: 额外参数

        Returns:
            加载的数据
        """
        if isinstance(source, (str, Path)):
            path = self.base_path / source
            cache_key = str(path)

            if cache_key in self.cache:
                logger.debug(f"从缓存加载: {path}")
                return self.cache[cache_key]

            data = self._load_from_file(path, data_type, **kwargs)
            self.cache[cache_key] = data
            return data

        elif isinstance(source, dict):
            return self._load_from_dict(source, data_type, **kwargs)

        else:
            raise TypeError(f"不支持的数据源类型: {type(source)}")

    def _load_from_file(
        self,
        path: Path,
        data_type: DataType,
        **kwargs
    ) -> Any:
        """从文件加载数据"""
        if not path.exists():
            raise FileNotFoundError(f"输入文件不存在: {path}")

        logger.info(f"加载输入文件: {path}")

        if data_type == DataType.CSV:
            return pd.read_csv(path, **kwargs)

        elif data_type == DataType.JSON:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)

        elif data_type == DataType.NETCDF:
            try:
                import xarray as xr
                return xr.open_dataset(path, **kwargs)
            except ImportError:
                raise ImportError("读取 NetCDF 需要安装 xarray")

        elif data_type == DataType.GEOTIFF:
            try:
                import rasterio
                with rasterio.open(path) as src:
                    return src.read(**kwargs)
            except ImportError:
                raise ImportError("读取 GeoTIFF 需要安装 rasterio")

        elif data_type == DataType.TIMESERIES:
            df = pd.read_csv(path, **kwargs)
            # 尝试解析时间列
            for col in df.columns:
                if 'time' in col.lower() or 'date' in col.lower():
                    df[col] = pd.to_datetime(df[col])
                    df.set_index(col, inplace=True)
                    break
            return df

        elif data_type == DataType.RASTER:
            return np.load(path, **kwargs)

        else:
            raise ValueError(f"不支持的数据类型: {data_type}")

    def _load_from_dict(
        self,
        data: Dict,
        data_type: DataType,
        **kwargs
    ) -> Any:
        """从字典加载数据"""
        if data_type == DataType.TIMESERIES:
            df = pd.DataFrame(data)
            if 'time' in df.columns:
                df['time'] = pd.to_datetime(df['time'])
                df.set_index('time', inplace=True)
            return df

        elif data_type == DataType.SCALAR:
            return data.get('value')

        else:
            return data

    def clear_cache(self):
        """清除缓存"""
        self.cache.clear()


class OutputHandler:
    """
    输出数据处理类

    处理模型输出，保存为各种格式
    """

    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def save(
        self,
        name: str,
        data: Any,
        data_type: DataType,
        **kwargs
    ) -> Path:
        """
        保存输出数据

        Args:
            name: 输出名称
            data: 数据
            data_type: 数据类型
            **kwargs: 额外参数

        Returns:
            保存的文件路径
        """
        if data_type == DataType.CSV:
            path = self.output_dir / f"{name}.csv"
            if isinstance(data, pd.DataFrame):
                data.to_csv(path, index=True, **kwargs)
            else:
                pd.DataFrame(data).to_csv(path, index=False, **kwargs)

        elif data_type == DataType.JSON:
            path = self.output_dir / f"{name}.json"
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)

        elif data_type == DataType.NETCDF:
            path = self.output_dir / f"{name}.nc"
            try:
                import xarray as xr
                if isinstance(data, xr.Dataset):
                    data.to_netcdf(path, **kwargs)
                else:
                    raise TypeError("NetCDF 输出需要 xarray.Dataset 类型")
            except ImportError:
                raise ImportError("保存 NetCDF 需要安装 xarray")

        elif data_type == DataType.RASTER:
            path = self.output_dir / f"{name}.npy"
            np.save(path, data)

        elif data_type == DataType.GEOTIFF:
            path = self.output_dir / f"{name}.tif"
            try:
                import rasterio
                from rasterio.transform import from_origin

                if isinstance(data, np.ndarray):
                    # 假设数据是 2D 数组
                    height, width = data.shape
                    transform = from_origin(
                        kwargs.get('left', 0),
                        kwargs.get('top', height),
                        kwargs.get('res_x', 1),
                        kwargs.get('res_y', 1)
                    )

                    with rasterio.open(
                        path,
                        'w',
                        driver='GTiff',
                        height=height,
                        width=width,
                        count=1,
                        dtype=data.dtype,
                        crs=kwargs.get('crs', 'EPSG:4326'),
                        transform=transform,
                    ) as dst:
                        dst.write(data, 1)
            except ImportError:
                raise ImportError("保存 GeoTIFF 需要安装 rasterio")

        elif data_type == DataType.TIMESERIES:
            path = self.output_dir / f"{name}.csv"
            if isinstance(data, pd.DataFrame):
                data.to_csv(path, index=True)
            elif isinstance(data, pd.Series):
                data.to_csv(path, header=True)
            else:
                pd.DataFrame({'value': data}).to_csv(path, index=False)

        else:
            path = self.output_dir / f"{name}.txt"
            with open(path, 'w', encoding='utf-8') as f:
                f.write(str(data))

        logger.info(f"输出已保存: {path}")
        return path

    def save_metadata(self, metadata: Dict):
        """
        保存元数据

        Args:
            metadata: 元数据字典
        """
        path = self.output_dir / "metadata.json"
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False, default=str)
        logger.info(f"元数据已保存: {path}")


class DataTransformer:
    """
    数据转换工具

    提供常用的数据转换功能
    """

    @staticmethod
    def normalize(
        data: np.ndarray,
        method: str = "minmax",
        axis: Optional[int] = None
    ) -> np.ndarray:
        """
        数据归一化

        Args:
            data: 输入数据
            method: 归一化方法 (minmax, zscore, maxabs)
            axis: 归一化轴

        Returns:
            归一化后的数据
        """
        if method == "minmax":
            min_val = np.min(data, axis=axis, keepdims=True)
            max_val = np.max(data, axis=axis, keepdims=True)
            return (data - min_val) / (max_val - min_val + 1e-10)

        elif method == "zscore":
            mean = np.mean(data, axis=axis, keepdims=True)
            std = np.std(data, axis=axis, keepdims=True)
            return (data - mean) / (std + 1e-10)

        elif method == "maxabs":
            max_abs = np.max(np.abs(data), axis=axis, keepdims=True)
            return data / (max_abs + 1e-10)

        else:
            raise ValueError(f"未知的归一化方法: {method}")

    @staticmethod
    def resample_timeseries(
        data: pd.DataFrame,
        target_freq: str,
        method: str = "mean"
    ) -> pd.DataFrame:
        """
        时间序列重采样

        Args:
            data: 时间序列数据
            target_freq: 目标频率 (如 'H', 'D', 'M')
            method: 聚合方法

        Returns:
            重采样后的数据
        """
        resampler = data.resample(target_freq)

        if method == "mean":
            return resampler.mean()
        elif method == "sum":
            return resampler.sum()
        elif method == "max":
            return resampler.max()
        elif method == "min":
            return resampler.min()
        else:
            raise ValueError(f"未知的聚合方法: {method}")

    @staticmethod
    def fill_missing(
        data: pd.DataFrame,
        method: str = "linear",
        limit: Optional[int] = None
    ) -> pd.DataFrame:
        """
        缺失值填充

        Args:
            data: 输入数据
            method: 填充方法
            limit: 最大连续填充数

        Returns:
            填充后的数据
        """
        return data.interpolate(method=method, limit=limit)

    @staticmethod
    def spatial_interpolation(
        points: np.ndarray,
        values: np.ndarray,
        grid_x: np.ndarray,
        grid_y: np.ndarray,
        method: str = "linear"
    ) -> np.ndarray:
        """
        空间插值

        Args:
            points: 已知点坐标 (N, 2)
            values: 已知点值 (N,)
            grid_x: 网格X坐标
            grid_y: 网格Y坐标
            method: 插值方法

        Returns:
            插值后的网格数据
        """
        try:
            from scipy.interpolate import griddata

            grid_x, grid_y = np.meshgrid(grid_x, grid_y)
            return griddata(points, values, (grid_x, grid_y), method=method)
        except ImportError:
            raise ImportError("空间插值需要安装 scipy")
