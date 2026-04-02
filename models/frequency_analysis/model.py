"""
水文频率分析模型

支持皮尔逊III型(P-III)、耿贝尔(Gumbel)和广义极值(GEV)分布。
计算给定重现期的设计值和拟合优度。
"""

import json
import math
import os
import sys
from typing import Any, Dict, List, Tuple


def read_inputs() -> Dict[str, Any]:
    """读取输入数据"""
    inputs = {}
    data_file = os.environ.get("INPUT_DATA_FILE", "/workspace/input/data.json")
    if os.path.exists(data_file):
        with open(data_file, "r") as f:
            inputs = json.load(f)
    for key, value in os.environ.items():
        if key.startswith("INPUT_") and key != "INPUT_DATA_FILE":
            name = key[6:].lower()
            try:
                inputs[name] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                inputs[name] = value
    return inputs


def get_param(name: str, default, inputs: Dict):
    value = inputs.get(name, inputs.get("parameters", {}).get(name, default))
    return value


# ---- 统计工具函数 ----

def gamma_func(x: float) -> float:
    """Lanczos 近似的 Gamma 函数"""
    if x < 0.5:
        return math.pi / (math.sin(math.pi * x) * gamma_func(1 - x))
    x -= 1
    g = 7
    coefs = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ]
    s = coefs[0]
    for i in range(1, g + 2):
        s += coefs[i] / (x + i)
    t = x + g + 0.5
    return math.sqrt(2 * math.pi) * t ** (x + 0.5) * math.exp(-t) * s


def gamma_cdf_approx(x: float, alpha: float, beta: float) -> float:
    """近似 Gamma CDF (使用不完全 Gamma 函数的级数展开)"""
    if x <= 0:
        return 0.0
    z = x * beta
    if alpha < 1:
        return 1.0 - math.exp(-z) * sum(
            z ** (alpha + k) / gamma_func(alpha + k + 1) for k in range(50)
        )
    else:
        # 正则化不完全 Gamma 函数的级数近似
        s = 0.0
        term = 1.0 / alpha
        for k in range(1, 200):
            s += term
            term *= z / (alpha + k)
        s += term
        return min(1.0, max(0.0, 1.0 - math.exp(-z) * s / gamma_func(alpha)))


def normal_cdf(x: float) -> float:
    """标准正态分布 CDF (近似)"""
    a1, a2, a3, a4, a5 = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429
    p = 0.3275911
    sign = 1 if x >= 0 else -1
    x = abs(x) / math.sqrt(2)
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
    return 0.5 * (1.0 + sign * y)


def normal_ppf(p: float) -> float:
    """标准正态分布分位数 (Rational approximation)"""
    if p <= 0:
        return -float('inf')
    if p >= 1:
        return float('inf')
    if p == 0.5:
        return 0.0

    if p < 0.5:
        return -normal_ppf(1 - p)

    # Rational approximation for upper tail
    t = math.sqrt(-2 * math.log(1 - p))
    c0, c1, c2 = 2.515517, 0.802853, 0.010328
    d1, d2, d3 = 1.432788, 0.189269, 0.001308
    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t)


# ---- 分布拟合与计算 ----

def fit_pearson3(data: List[float]) -> Dict:
    """拟合皮尔逊III型分布"""
    n = len(data)
    mean = sum(data) / n
    variance = sum((x - mean) ** 2 for x in data) / (n - 1)
    std = math.sqrt(variance) if variance > 0 else 1e-6

    # 偏度系数
    if std > 0:
        skewness = sum((x - mean) ** 3 for x in data) / ((n - 1) * std ** 3)
    else:
        skewness = 0

    # P-III 参数
    if abs(skewness) < 1e-6:
        # 退化为正态分布
        return {"alpha": None, "beta": None, "x0": mean, "mean": mean, "std": std, "Cs": skewness}

    alpha = 4.0 / (skewness ** 2)
    beta = 2.0 / (std * abs(skewness))
    x0 = mean - 2 * std / skewness

    return {"alpha": alpha, "beta": beta, "x0": x0, "mean": mean, "std": std, "Cs": skewness}


def pearson3_quantile(params: Dict, return_periods: List[int]) -> Dict[int, float]:
    """P-III 分布设计值 (使用 Wilson-Hilferty 近似)"""
    design_values = {}
    mean, std, Cs = params["mean"], params["std"], params["Cs"]

    for T in return_periods:
        p = 1.0 - 1.0 / T  # 超过概率

        if abs(Cs) < 0.01:
            # 正态近似
            phi = normal_ppf(p)
            design_values[T] = round(mean + std * phi, 3)
        else:
            # Wilson-Hilferty 变换
            phi = normal_ppf(p)
            # 修正偏度的系数
            Cs2 = Cs * Cs
            k = (2.0 / Cs) * ((phi * Cs / 6.0 - Cs2 / 36.0 + 1) ** 3 - 1)
            design_values[T] = round(mean + std * k, 3)

    return design_values


def fit_gumbel(data: List[float]) -> Dict:
    """拟合耿贝尔(EV1)分布"""
    n = len(data)
    mean = sum(data) / n
    variance = sum((x - mean) ** 2 for x in data) / (n - 1)
    std = math.sqrt(variance) if variance > 0 else 1e-6

    # Gumbel 参数
    sigma = std * math.sqrt(6) / math.pi
    mu = mean - 0.5772 * sigma

    return {"mu": mu, "sigma": sigma, "mean": mean, "std": std}


def gumbel_quantile(params: Dict, return_periods: List[int]) -> Dict[int, float]:
    """Gumbel 分布设计值"""
    mu, sigma = params["mu"], params["sigma"]
    design_values = {}

    for T in return_periods:
        p = 1.0 - 1.0 / T
        y = -math.log(-math.log(p))
        design_values[T] = round(mu + sigma * y, 3)

    return design_values


def fit_gev(data: List[float]) -> Dict:
    """拟合广义极值(GEV)分布 (简化最大似然)"""
    n = len(data)
    sorted_data = sorted(data)
    mean = sum(data) / n
    variance = sum((x - mean) ** 2 for x in data) / (n - 1)
    std = math.sqrt(variance) if variance > 0 else 1e-6

    # 矩估计
    skewness = sum((x - mean) ** 3 for x in data) / ((n - 1) * std ** 3)

    # 简化: 使用 Gumbel 作为 GEV 的特例 (shape=0)
    sigma = std * math.sqrt(6) / math.pi
    mu = mean - 0.5772 * sigma
    shape = max(-0.5, min(0.5, skewness * 0.1))  # 简化形状参数

    return {"mu": mu, "sigma": sigma, "shape": shape, "mean": mean, "std": std}


def gev_quantile(params: Dict, return_periods: List[int]) -> Dict[int, float]:
    """GEV 分布设计值"""
    mu, sigma, k = params["mu"], params["sigma"], params["shape"]
    design_values = {}

    for T in return_periods:
        p = 1.0 - 1.0 / T
        y = -math.log(p)

        if abs(k) < 1e-6:
            # Gumbel
            x = mu - sigma * math.log(y)
        else:
            x = mu + sigma * (1 - y ** (-k)) / k

        design_values[T] = round(x, 3)

    return design_values


def kolmogorov_smirnov_test(data: List[float], distribution: str, params: Dict) -> float:
    """简化的 K-S 检验统计量"""
    n = len(data)
    sorted_data = sorted(data)

    # 计算经验 CDF 与理论 CDF 的最大差异
    d_max = 0.0

    for i, x in enumerate(sorted_data):
        ecdf_upper = (i + 1) / n
        ecdf_lower = i / n

        # 理论 CDF (简化)
        if distribution == "gumbel":
            z = (x - params["mu"]) / params["sigma"]
            tcdf = math.exp(-math.exp(-z))
        else:
            z = (x - params["mean"]) / max(params.get("std", 1), 1e-6)
            tcdf = normal_cdf(z)

        d_max = max(d_max, abs(ecdf_upper - tcdf), abs(ecdf_lower - tcdf))

    return round(d_max, 4)


def frequency_analysis_run(
    annual_maxima: List[float],
    distribution: str = "pearson3",
    return_periods: List[int] = None,
    confidence_level: float = 0.95
) -> Dict[str, Any]:
    """
    水文频率分析

    Args:
        annual_maxima: 年最大值序列
        distribution: 分布类型
        return_periods: 重现期列表
        confidence_level: 置信水平

    Returns:
        design_values, distribution_params, goodness_of_fit
    """
    if return_periods is None:
        return_periods = [10, 20, 50, 100]

    if not annual_maxima or len(annual_maxima) < 5:
        return {
            "design_values": {},
            "distribution_params": {},
            "goodness_of_fit": {"ks_statistic": None, "note": "数据不足,至少需要5个样本"}
        }

    # 拟合分布
    if distribution == "pearson3":
        params = fit_pearson3(annual_maxima)
        design_values = pearson3_quantile(params, return_periods)
    elif distribution == "gumbel":
        params = fit_gumbel(annual_maxima)
        design_values = gumbel_quantile(params, return_periods)
    elif distribution == "gev":
        params = fit_gev(annual_maxima)
        design_values = gev_quantile(params, return_periods)
    else:
        params = fit_pearson3(annual_maxima)
        design_values = pearson3_quantile(params, return_periods)
        distribution = "pearson3"

    # 拟合优度
    ks_stat = kolmogorov_smirnov_test(annual_maxima, distribution, params)

    return {
        "design_values": design_values,
        "distribution_params": {k: round(v, 4) if isinstance(v, float) else v for k, v in params.items()},
        "goodness_of_fit": {
            "ks_statistic": ks_stat,
            "distribution": distribution,
            "sample_size": len(annual_maxima),
        }
    }


def main():
    inputs = read_inputs()

    distribution = get_param("distribution", "pearson3", inputs)
    return_periods_raw = get_param("return_periods", [10, 20, 50, 100], inputs)
    confidence_level = float(get_param("confidence_level", 0.95, inputs))

    # 解析重现期
    if isinstance(return_periods_raw, str):
        try:
            return_periods = json.loads(return_periods_raw)
        except:
            return_periods = [10, 20, 50, 100]
    else:
        return_periods = return_periods_raw

    annual_maxima = inputs.get("annual_maxima", [])
    if isinstance(annual_maxima, str):
        annual_maxima = json.loads(annual_maxima)

    if not annual_maxima:
        # 示例数据: 30年年最大洪峰流量 (m³/s)
        annual_maxima = [
            1200, 1580, 980, 2100, 1750, 1350, 2400, 1100, 1950, 1600,
            890, 1850, 2200, 1400, 1050, 2600, 1700, 1300, 2000, 1500,
            1150, 1900, 1650, 2300, 1250, 1800, 1450, 2050, 1000, 1700
        ]

    outputs = frequency_analysis_run(annual_maxima, distribution, return_periods, confidence_level)
    print(json.dumps(outputs, ensure_ascii=False))

    # 保存输出文件
    output_dir = os.environ.get("WORKING_DIR", "/workspace")
    output_path = os.path.join(output_dir, "output")
    if os.path.exists(output_path) or os.environ.get("TASK_ID"):
        os.makedirs(output_path, exist_ok=True)
        with open(os.path.join(output_path, "results.json"), "w") as f:
            json.dump({"outputs": outputs}, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
