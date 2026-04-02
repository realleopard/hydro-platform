"""
容器执行运行器

在 Docker 容器中运行时，由 ENTRYPOINT 调用此模块。
读取环境变量和输入文件，加载用户的模型类，执行并输出结果。

用法:
    python -m watershed_sdk.runner model.py
    python -m watershed_sdk.runner model  (模块名)
"""

import importlib
import importlib.util
import json
import logging
import os
import sys
import traceback
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# 容器环境常量
WORKSPACE_DIR = Path(os.environ.get("WORKING_DIR", "/workspace"))
INPUT_DATA_FILE = Path(os.environ.get("INPUT_DATA_FILE", "/workspace/input/data.json"))
OUTPUT_DIR = WORKSPACE_DIR / "output"
DATA_DIR = WORKSPACE_DIR / "data"


def read_input_data() -> Dict[str, Any]:
    """
    读取输入数据。

    优先级:
    1. INPUT_DATA_FILE (data.json)
    2. INPUT_<NAME> 环境变量
    """
    inputs = {}

    # 1. 读取 data.json
    if INPUT_DATA_FILE.exists():
        try:
            with open(INPUT_DATA_FILE, "r", encoding="utf-8") as f:
                inputs = json.load(f)
            logger.info(f"从 {INPUT_DATA_FILE} 读取输入数据: {list(inputs.keys())}")
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"读取 {INPUT_DATA_FILE} 失败: {e}")

    # 2. 读取 INPUT_<NAME> 环境变量（覆盖 data.json 中的同名项）
    for key, value in os.environ.items():
        if key.startswith("INPUT_") and key != "INPUT_DATA_FILE":
            field_name = key[6:].lower()  # INPUT_RAINFALL -> rainfall
            # 尝试解析为 JSON（数组和对象）
            try:
                inputs[field_name] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                inputs[field_name] = value

    return inputs


def load_model_class(model_path: str):
    """
    从文件或模块名动态加载 BaseModel 子类。

    Args:
        model_path: Python 文件路径或模块名

    Returns:
        BaseModel 子类
    """
    path = Path(model_path)

    if path.exists() and path.suffix == ".py":
        # 从文件加载
        spec = importlib.util.spec_from_file_location("model_module", str(path))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    else:
        # 从模块名加载
        module = importlib.import_module(model_path)

    # 查找 BaseModel 子类
    from .model import BaseModel
    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if (isinstance(attr, type)
                and issubclass(attr, BaseModel)
                and attr is not BaseModel):
            return attr

    raise ImportError(f"在 {model_path} 中未找到 BaseModel 子类")


def save_output_files(outputs: Dict[str, Any], output_dir: Path):
    """
    将输出数据保存到文件。

    Args:
        outputs: 输出变量字典
        output_dir: 输出目录
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    for name, data in outputs.items():
        file_path = output_dir / f"{name}.json"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, default=str)
            logger.info(f"保存输出文件: {file_path}")
        except (TypeError, ValueError) as e:
            logger.warning(f"保存输出 {name} 失败: {e}")


def run_in_container(model_path: str = "model") -> int:
    """
    在容器环境中运行模型。

    执行流程:
    1. 读取输入数据（data.json + 环境变量）
    2. 加载模型类
    3. 设置参数和输入
    4. 执行模型
    5. 将结果 JSON 输出到 stdout（供后端解析）
    6. 保存输出文件到 /workspace/output/

    Args:
        model_path: 模型文件路径或模块名

    Returns:
        退出码 (0=成功, 1=失败)
    """
    try:
        # 读取输入
        input_data = read_input_data()

        # 分离参数和输入（parameters 子键为参数，其余为输入）
        parameters = input_data.pop("parameters", {})
        if not isinstance(parameters, dict):
            parameters = {}

        # 加载模型类
        model_cls = load_model_class(model_path)

        # 从 config.json 创建配置（如果存在）
        config_path = Path("config.json")
        if config_path.exists():
            config = model_cls.Config.from_json(str(config_path)) if hasattr(model_cls, 'Config') else None
            model = model_cls(config) if config else model_cls()
        else:
            # 尝试无参构造
            try:
                model = model_cls()
            except TypeError:
                # 需要 config 参数，使用默认值
                from .model import ModelConfig
                config = ModelConfig(name="model", version="1.0.0")
                model = model_cls(config)

        # 设置参数
        if parameters:
            model.set_parameters(**parameters)

        # 设置输入
        if input_data:
            model.set_inputs(**input_data)

        # 运行模型
        model._pre_run()
        model.run()
        model._post_run(success=True)

        # 获取输出
        outputs = model.get_outputs()

        # 保存输出文件到 /workspace/output/
        save_output_files(outputs, OUTPUT_DIR)

        # 输出 JSON 到 stdout（后端 TaskScheduler.buildNodeOutputs 会解析）
        result = json.dumps(outputs, ensure_ascii=False, default=str)
        print(result)

        return 0

    except Exception as e:
        # 错误信息输出到 stderr，不影响 stdout 的 JSON 解析
        error_msg = traceback.format_exc()
        print(error_msg, file=sys.stderr)

        # 输出错误 JSON 到 stdout
        error_output = json.dumps({
            "error": str(e),
            "status": "failed"
        }, ensure_ascii=False)
        print(error_output)

        return 1


def main():
    """CLI 入口点"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stderr  # 日志输出到 stderr，不污染 stdout JSON
    )

    model_path = sys.argv[1] if len(sys.argv) > 1 else "model"
    exit_code = run_in_container(model_path)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
