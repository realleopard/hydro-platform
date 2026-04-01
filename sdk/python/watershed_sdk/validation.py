"""
模型验证指标计算模块
"""

import logging
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ValidationMetrics:
    """验证指标数据类"""
    nse: float  # Nash-Sutcliffe Efficiency
    rmse: float  # Root Mean Square Error
    mae: float  # Mean Absolute Error
    r2: float  # R-squared
    kge: float  # Kling-Gupta Efficiency
    pbias: float  # Percent Bias

    def to_dict(self) -> Dict[str, float]:
        """转换为字典"""
        return {
            "nse": self.nse,
            "rmse": self.rmse,
            "mae": self.mae,
            "r2": self.r2,
            "kge": self.kge,
            "pbias": self.pbias
        }

    def __str__(self) -> str:
        return (
            f"NSE={self.nse:.4f}, RMSE={self.rmse:.4f}, MAE={self.mae:.4f}, "
            f"R²={self.r2:.4f}, KGE={self.kge:.4f}, PBIAS={self.pbias:.2f}%"
        )


class Validator:
    """
    模型验证类

    计算各种水文模型验证指标
    """

    @staticmethod
    def calculate_all(
        simulated: np.ndarray,
        observed: np.ndarray,
        skip_nan: bool = True
    ) -> ValidationMetrics:
        """
        计算所有验证指标

        Args:
            simulated: 模拟值数组
            observed: 观测值数组
            skip_nan: 是否跳过NaN值

        Returns:
            ValidationMetrics 对象
        """
        if skip_nan:
            mask = ~(np.isnan(simulated) | np.isnan(observed))
            simulated = simulated[mask]
            observed = observed[mask]

        if len(simulated) == 0:
            raise ValueError("没有有效的数据点")

        return ValidationMetrics(
            nse=Validator.nse(simulated, observed),
            rmse=Validator.rmse(simulated, observed),
            mae=Validator.mae(simulated, observed),
            r2=Validator.r2(simulated, observed),
            kge=Validator.kge(simulated, observed),
            pbias=Validator.pbias(simulated, observed)
        )

    @staticmethod
    def nse(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Nash-Sutcliffe Efficiency (NSE)

        范围: (-∞, 1]
        NSE = 1: 完美匹配
        NSE = 0: 与观测均值一样好
        NSE < 0: 比观测均值还差
        """
        mean_obs = np.mean(observed)
        numerator = np.sum((observed - simulated) ** 2)
        denominator = np.sum((observed - mean_obs) ** 2)

        if denominator == 0:
            return np.nan

        return 1 - numerator / denominator

    @staticmethod
    def rmse(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Root Mean Square Error (RMSE)

        单位与输入相同，越小越好
        """
        return np.sqrt(np.mean((simulated - observed) ** 2))

    @staticmethod
    def mae(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Mean Absolute Error (MAE)

        单位与输入相同，越小越好
        """
        return np.mean(np.abs(simulated - observed))

    @staticmethod
    def r2(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Coefficient of Determination (R²)

        范围: [0, 1]
        越接近1越好
        """
        ss_res = np.sum((observed - simulated) ** 2)
        ss_tot = np.sum((observed - np.mean(observed)) ** 2)

        if ss_tot == 0:
            return np.nan

        return 1 - ss_res / ss_tot

    @staticmethod
    def kge(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Kling-Gupta Efficiency (KGE)

        范围: (-∞, 1]
        越接近1越好

        KGE = 1 - √[(r-1)² + (α-1)² + (β-1)²]
        其中:
            r: 相关系数
            α: 变异系数比率 (σ_sim/σ_obs)
            β: 均值比率 (μ_sim/μ_obs)
        """
        r = np.corrcoef(observed, simulated)[0, 1]
        alpha = np.std(simulated) / np.std(observed) if np.std(observed) > 0 else 0
        beta = np.mean(simulated) / np.mean(observed) if np.mean(observed) != 0 else 0

        return 1 - np.sqrt((r - 1) ** 2 + (alpha - 1) ** 2 + (beta - 1) ** 2)

    @staticmethod
    def pbias(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Percent Bias (PBIAS)

        范围: (-∞, ∞)
        越接近0越好
        正值: 模型高估
        负值: 模型低估
        """
        return 100 * np.sum(simulated - observed) / np.sum(observed)

    @staticmethod
    def nrmse(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Normalized RMSE (NRMSE)

        通常用观测值范围或均值归一化
        """
        rmse = Validator.rmse(simulated, observed)
        range_obs = np.max(observed) - np.min(observed)

        if range_obs == 0:
            return np.nan

        return rmse / range_obs

    @staticmethod
    def mse(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Mean Square Error (MSE)
        """
        return np.mean((simulated - observed) ** 2)

    @staticmethod
    def bias(simulated: np.ndarray, observed: np.ndarray) -> float:
        """
        Mean Bias
        """
        return np.mean(simulated - observed)

    @staticmethod
    def correlation(
        simulated: np.ndarray,
        observed: np.ndarray,
        method: str = "pearson"
    ) -> float:
        """
        相关系数

        Args:
            method: pearson 或 spearman
        """
        if method == "pearson":
            return np.corrcoef(observed, simulated)[0, 1]
        elif method == "spearman":
            try:
                from scipy import stats
                corr, _ = stats.spearmanr(observed, simulated)
                return corr
            except ImportError:
                raise ImportError("Spearman相关系数需要安装 scipy")
        else:
            raise ValueError(f"未知的相关系数方法: {method}")

    @staticmethod
    def volume_error(
        simulated: np.ndarray,
        observed: np.ndarray,
        dt: float = 1.0
    ) -> float:
        """
        水量误差

        Args:
            dt: 时间步长
        """
        vol_sim = np.sum(simulated) * dt
        vol_obs = np.sum(observed) * dt
        return (vol_sim - vol_obs) / vol_obs * 100

    @classmethod
    def cross_validate(
        cls,
        model_func,
        data: np.ndarray,
        n_splits: int = 5,
        **kwargs
    ) -> List[ValidationMetrics]:
        """
        交叉验证

        Args:
            model_func: 模型函数
            data: 数据数组
            n_splits: 折数
            **kwargs: 传递给 model_func 的参数

        Returns:
            每折的验证指标列表
        """
        from sklearn.model_selection import KFold

        kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)
        metrics_list = []

        for train_idx, test_idx in kf.split(data):
            train_data = data[train_idx]
            test_data = data[test_idx]

            # 训练模型
            model = model_func(train_data, **kwargs)

            # 预测
            simulated = model.predict(test_data)
            observed = test_data

            # 计算指标
            metrics = cls.calculate_all(simulated, observed)
            metrics_list.append(metrics)

        return metrics_list
