"""
Penman-Monteith 蒸散发模型

基于 FAO-56 Penman-Monteith 方程计算参考作物蒸散发量(ET0)。
ET0 = [0.408*Delta*(Rn-G) + gamma*(900/(T+273))*u2*(es-ea)] / [Delta + gamma*(1+0.34*u2)]
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


def penman_monteith_run(
    temperature: List[float],
    humidity: List[float],
    wind_speed: List[float],
    solar_radiation: List[float],
    altitude: float = 100.0,
    latitude: float = 30.0,
    albedo: float = 0.23,
    doy: int = 150
) -> Dict[str, Any]:
    """
    FAO-56 Penman-Monteith 计算

    Args:
        temperature: 气温时序 (°C)
        humidity: 相对湿度时序 (%)
        wind_speed: 风速时序 (m/s, 2m高度)
        solar_radiation: 太阳辐射时序 (MJ/m²/d)
        altitude: 海拔 (m)
        latitude: 纬度 (°)
        albedo: 地表反照率
        doy: 年内天数

    Returns:
        包含 ET0, net_radiation, soil_heat_flux 的字典
    """
    n = min(len(temperature), len(humidity), len(wind_speed), len(solar_radiation))
    if n == 0:
        return {"ET0": [], "net_radiation": [], "soil_heat_flux": []}

    # 大气压 (kPa)
    P = 101.3 * ((293 - 0.0065 * altitude) / 293) ** 5.26

    # 心理常数 (kPa/°C)
    gamma = 0.665e-3 * P

    # 太阳常数和日地距离修正
    dr = 1 + 0.033 * math.cos(2 * math.pi / 365 * doy)
    solar_dec = 0.409 * math.sin(2 * math.pi / 365 * doy - 1.39)

    # 日落时角
    lat_rad = latitude * math.pi / 180
    ws = math.acos(-math.tan(lat_rad) * math.tan(solar_dec))

    # 大气顶层辐射 (MJ/m²/d)
    Ra = (24 * 60 / math.pi) * 0.0820 * dr * (
        ws * math.sin(lat_rad) * math.sin(solar_dec) +
        math.cos(lat_rad) * math.cos(solar_dec) * math.sin(ws)
    )

    # 晴天辐射
    Rso = (0.75 + 2e-5 * altitude) * Ra

    ET0_series = []
    Rn_series = []
    G_series = []

    for i in range(n):
        T = temperature[i]
        RH = max(0, min(100, humidity[i]))
        u2 = max(0, wind_speed[i])
        Rs = max(0, solar_radiation[i])

        # 饱和水汽压 (kPa)
        es = 0.6108 * math.exp(17.27 * T / (T + 237.3))

        # 实际水汽压
        ea = es * RH / 100.0

        # 饱和水汽压曲线斜率 (kPa/°C)
        delta = 4098 * (0.6108 * math.exp(17.27 * T / (T + 237.3))) / (T + 237.3) ** 2

        # 净辐射 (MJ/m²/d)
        Rns = (1 - albedo) * Rs
        Rnl = 4.901e-9 * ((T + 273.16) ** 4) * (0.34 - 0.14 * math.sqrt(ea)) * (
            1.35 * Rs / max(Rso, 0.01) - 0.35
        )
        Rnl = max(0, Rnl)
        Rn = Rns - Rnl

        # 土壤热通量 (简化: 日尺度取 0)
        G = 0.0

        # ET0 (mm/d)
        numerator = 0.408 * delta * (Rn - G) + gamma * (900 / (T + 273)) * u2 * (es - ea)
        denominator = delta + gamma * (1 + 0.34 * u2)

        if denominator > 0:
            et0 = max(0, numerator / denominator)
        else:
            et0 = 0

        ET0_series.append(round(et0, 3))
        Rn_series.append(round(Rn, 3))
        G_series.append(round(G, 3))

    return {
        "ET0": ET0_series,
        "net_radiation": Rn_series,
        "soil_heat_flux": G_series,
    }


def main():
    inputs = read_inputs()

    altitude = get_param("altitude", 100.0, inputs)
    latitude = get_param("latitude", 30.0, inputs)
    albedo = get_param("albedo", 0.23, inputs)

    temperature = inputs.get("temperature", [])
    humidity = inputs.get("humidity", [])
    wind_speed = inputs.get("wind_speed", [])
    solar_radiation = inputs.get("solar_radiation", [])

    if not temperature:
        # 示例: 30天气象数据 (简化)
        temperature = [22 + 3 * math.sin(2 * math.pi * i / 30) for i in range(30)]
        humidity = [65 + 10 * math.sin(2 * math.pi * i / 30 + 1) for i in range(30)]
        wind_speed = [2.0 + 0.5 * math.sin(2 * math.pi * i / 30 + 2) for i in range(30)]
        solar_radiation = [18 + 4 * math.sin(2 * math.pi * i / 30 + 0.5) for i in range(30)]

    outputs = penman_monteith_run(
        temperature, humidity, wind_speed, solar_radiation,
        altitude=altitude, latitude=latitude, albedo=albedo
    )
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
