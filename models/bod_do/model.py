"""
BOD-DO 水质模型

基于 Streeter-Phelps 方程模拟河流 BOD 和 DO 沿程分布。
BOD: L(x) = L0 * exp(-kd * x / v)
DO: D(x) = D0 * exp(-ka * x/v) + (kd*L0)/(ka-kd) * (exp(-kd*x/v) - exp(-ka*x/v))
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


def bod_do_run(
    kd: float = 0.2,
    ka: float = 0.5,
    L0: float = 15.0,
    DO_sat: float = 9.0,
    DO0: float = 8.0,
    velocity: float = 0.5,
    max_distance: float = 200.0,
    n_points: int = 100
) -> Dict[str, Any]:
    """
    Streeter-Phelps BOD-DO 计算

    Args:
        kd: BOD 降解系数 (1/d)
        ka: 复氧系数 (1/d)
        L0: 初始 BOD 浓度 (mg/L)
        DO_sat: 饱和溶解氧 (mg/L)
        DO0: 初始溶解氧 (mg/L)
        velocity: 河流流速 (m/s)
        max_distance: 最大计算距离 (km)
        n_points: 计算点数

    Returns:
        包含 BOD, DO, critical_distance, minimum_DO 的字典
    """
    # 距离数组 (km)
    distances = [round(i * max_distance / n_points, 2) for i in range(n_points + 1)]

    # 旅行时间 (天): distance(km) / (velocity(m/s) * 86400(s/d) / 1000(m/km))
    v_kmd = velocity * 86400 / 1000  # m/s -> km/d

    BOD = []
    DO = []
    D0 = DO_sat - DO0  # 初始氧亏

    for x in distances:
        t = x / v_kmd if v_kmd > 0 else 0  # 旅行时间 (天)

        # BOD 衰减
        L = L0 * math.exp(-kd * t)
        BOD.append(round(L, 4))

        # 氧亏 (Streeter-Phelps)
        if abs(ka - kd) < 1e-10:
            D = (D0 + kd * L0 * t) * math.exp(-ka * t)
        else:
            D = D0 * math.exp(-ka * t) + (kd * L0) / (ka - kd) * (math.exp(-kd * t) - math.exp(-ka * t))

        do = max(0, DO_sat - D)
        DO.append(round(do, 4))

    # 临界距离 (最大氧亏处)
    if ka > kd and D0 == 0:
        tc = 1 / (ka - kd) * math.log(ka / kd) if kd > 0 else 0
        critical_distance = round(tc * v_kmd, 2)
    else:
        # 数值查找
        min_do_idx = DO.index(min(DO))
        critical_distance = distances[min_do_idx]

    minimum_DO = round(min(DO), 4)

    return {
        "distance": distances,
        "BOD": BOD,
        "DO": DO,
        "critical_distance": critical_distance,
        "minimum_DO": minimum_DO,
    }


def main():
    inputs = read_inputs()

    kd = get_param("kd", 0.2, inputs)
    ka = get_param("ka", 0.5, inputs)
    L0 = get_param("L0", 15.0, inputs)
    DO_sat = get_param("DO_sat", 9.0, inputs)
    velocity = get_param("velocity", 0.5, inputs)

    outputs = bod_do_run(kd=kd, ka=ka, L0=L0, DO_sat=DO_sat, velocity=velocity)
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
