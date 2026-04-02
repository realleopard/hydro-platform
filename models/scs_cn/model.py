"""
SCS-CN 降雨径流模型

基于美国农业部水土保持局曲线数法(SCS-CN)计算降雨径流。
算法: Q = (P - Ia)^2 / (P - Ia + S)
其中 S = 25400/CN - 254, Ia = 0.2 * S
"""

import json
import math
import os
import sys
from typing import Any, Dict, List


def read_inputs() -> Dict[str, Any]:
    """读取输入数据（兼容容器环境和本地运行）"""
    inputs = {}

    # 从 data.json 读取
    data_file = os.environ.get("INPUT_DATA_FILE", "/workspace/input/data.json")
    if os.path.exists(data_file):
        with open(data_file, "r") as f:
            inputs = json.load(f)

    # 从环境变量读取（覆盖）
    for key, value in os.environ.items():
        if key.startswith("INPUT_") and key != "INPUT_DATA_FILE":
            name = key[6:].lower()
            try:
                inputs[name] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                inputs[name] = value

    return inputs


def get_param(name: str, default: float, inputs: Dict) -> float:
    """从输入中获取参数值"""
    value = inputs.get(name, inputs.get("parameters", {}).get(name, default))
    return float(value)


def scs_cn_run(rainfall: List[float], cn: float, ia_ratio: float = 0.2) -> Dict[str, Any]:
    """
    SCS-CN 计算

    Args:
        rainfall: 降雨量时序 (mm)
        cn: 曲线号 (30-100)
        ia_ratio: 初始损失比 (通常 0.2)

    Returns:
        包含 runoff, peak_runoff, total_runoff 的字典
    """
    # 计算最大蓄水量 S (mm)
    S = 25400.0 / cn - 254.0

    # 初始损失 Ia
    Ia = ia_ratio * S

    runoff_series = []
    cumulative_rainfall = 0.0

    for p in rainfall:
        cumulative_rainfall += p

        # 有效降雨
        Pe = max(0, cumulative_rainfall - Ia)

        # 累积径流量
        if Pe > 0:
            Q = Pe * Pe / (Pe + S)
        else:
            Q = 0.0

        runoff_series.append(round(Q, 3))

    # 计算增量径流
    runoff_incremental = []
    prev_q = 0.0
    for q in runoff_series:
        runoff_incremental.append(round(q - prev_q, 3))
        prev_q = q

    total_runoff = round(runoff_series[-1], 3) if runoff_series else 0.0
    peak_runoff = round(max(runoff_incremental), 3) if runoff_incremental else 0.0

    return {
        "runoff": runoff_incremental,
        "peak_runoff": peak_runoff,
        "total_runoff": total_runoff,
    }


def main():
    """主函数"""
    inputs = read_inputs()

    # 获取参数
    cn = get_param("cn", 65, inputs)
    ia_ratio = get_param("ia_ratio", 0.2, inputs)

    # 获取输入数据
    rainfall = inputs.get("rainfall", [])
    if isinstance(rainfall, str):
        rainfall = json.loads(rainfall)

    if not rainfall:
        # 生成示例数据: 24小时降雨过程
        rainfall = [0, 2, 5, 10, 20, 35, 50, 40, 25, 15, 8, 4, 2, 1, 0.5, 0.2, 0, 0, 0, 0, 0, 0, 0, 0]

    # 运行模型
    outputs = scs_cn_run(rainfall, cn, ia_ratio)

    # 输出 JSON 到 stdout
    result = json.dumps(outputs, ensure_ascii=False)
    print(result)

    # 如果在容器中，保存输出文件
    output_dir = os.environ.get("WORKING_DIR", "/workspace")
    output_path = os.path.join(output_dir, "output")
    if os.path.exists(output_path) or os.environ.get("TASK_ID"):
        os.makedirs(output_path, exist_ok=True)
        with open(os.path.join(output_path, "results.json"), "w") as f:
            json.dump({"inputs": {"rainfall": rainfall, "cn": cn, "ia_ratio": ia_ratio}, "outputs": outputs}, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
