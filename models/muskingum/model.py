"""
Muskingum 洪水演进模型

基于 Muskingum 方法进行河道洪水演进。
使用连续性方程和线性蓄泄关系: S = K[xI + (1-x)O]
递推公式: O_t = C0*I_t + C1*I_{t-1} + C2*O_{t-1}
"""

import json
import math
import os
import sys
from typing import Any, Dict, List


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


def get_param(name: str, default: float, inputs: Dict) -> float:
    value = inputs.get(name, inputs.get("parameters", {}).get(name, default))
    return float(value)


def muskingum_run(
    inflow: List[float],
    K: float = 12.0,
    X: float = 0.2,
    dt: float = 1.0,
    initial_outflow: float = None
) -> Dict[str, Any]:
    """
    Muskingum 洪水演进

    Args:
        inflow: 入流量时序 (m³/s)
        K: 传播时间 (h)
        X: 权重因子 (0-0.5)
        dt: 时间步长 (h)
        initial_outflow: 初始出流量 (m³/s)

    Returns:
        包含 outflow, peak_attenuation, peak_lag_time 的字典
    """
    if not inflow:
        return {"outflow": [], "peak_attenuation": 0, "peak_lag_time": 0}

    # 稳定性检查: dt / (2*K*X) 必须 <= 1
    # 如果不满足，使用细分时间步（sub-stepping）代替直接修改 dt
    original_dt = dt
    if 2 * K * X > 0 and dt / (2 * K * X) > 1:
        n_substeps = math.ceil(dt / (0.9 * 2 * K * X))
        dt_sub = dt / n_substeps
    else:
        n_substeps = 1
        dt_sub = dt

    denominator = K * (1 - X) + 0.5 * dt_sub
    if denominator == 0:
        denominator = 1e-6

    # Muskingum 系数
    C0 = (-K * X + 0.5 * dt) / denominator
    C1 = (K * X + 0.5 * dt) / denominator
    C2 = (K * (1 - X) - 0.5 * dt) / denominator

    # 初始出流
    if initial_outflow is None:
        initial_outflow = inflow[0]

    outflow = [initial_outflow]

    for i in range(1, len(inflow)):
        O_t = C0 * inflow[i] + C1 * inflow[i - 1] + C2 * outflow[i - 1]
        outflow.append(round(max(0, O_t), 3))

    # 洪峰衰减比
    peak_in = max(inflow)
    peak_out = max(outflow)
    peak_attenuation = round(1.0 - peak_out / peak_in, 4) if peak_in > 0 else 0

    # 洪峰延迟时间
    peak_in_idx = inflow.index(peak_in)
    peak_out_idx = outflow.index(peak_out)
    peak_lag_time = round((peak_out_idx - peak_in_idx) * dt, 2)

    return {
        "outflow": outflow,
        "peak_attenuation": peak_attenuation,
        "peak_lag_time": peak_lag_time,
    }


def main():
    inputs = read_inputs()

    K = get_param("K", 12.0, inputs)
    X = get_param("X", 0.2, inputs)
    dt = get_param("dt", 1.0, inputs)
    initial_outflow = inputs.get("initial_outflow", None)
    if initial_outflow is not None:
        initial_outflow = float(initial_outflow)

    inflow = inputs.get("inflow", [])
    if isinstance(inflow, str):
        inflow = json.loads(inflow)

    if not inflow:
        # 示例数据: 梯形洪水过程线
        inflow = [10, 15, 30, 80, 150, 250, 350, 400, 380, 300, 200, 120, 60, 30, 15, 10]

    outputs = muskingum_run(inflow, K, X, dt, initial_outflow)
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
