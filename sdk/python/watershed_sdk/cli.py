"""
命令行工具

用法:
    watershed validate <config.json>         验证模型配置
    watershed init <name>                    创建模型项目骨架
    watershed test <dir>                     本地运行模型测试
    watershed build <dir>                    构建 Docker 镜像
    watershed register <dir> --url <url>     注册模型到平台
    watershed login --url <url>              登录平台
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from .model import ModelConfig
from .client import PlatformClient


def main():
    parser = argparse.ArgumentParser(
        description="Watershed Model SDK 命令行工具"
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # validate
    validate_parser = subparsers.add_parser("validate", help="验证模型配置文件")
    validate_parser.add_argument("config", type=str, help="模型配置文件路径")

    # init
    init_parser = subparsers.add_parser("init", help="创建模型项目骨架")
    init_parser.add_argument("name", type=str, help="模型名称")
    init_parser.add_argument("--dir", type=str, default=".", help="创建目录 (默认当前目录)")

    # test
    test_parser = subparsers.add_parser("test", help="本地运行模型测试")
    test_parser.add_argument("dir", type=str, help="模型目录")

    # build
    build_parser = subparsers.add_parser("build", help="构建 Docker 镜像")
    build_parser.add_argument("dir", type=str, help="模型目录")
    build_parser.add_argument("--tag", type=str, default=None, help="镜像标签")

    # register
    register_parser = subparsers.add_parser("register", help="注册模型到平台")
    register_parser.add_argument("dir", type=str, help="模型目录")
    register_parser.add_argument("--url", type=str, required=True, help="平台 URL")
    register_parser.add_argument("--token", type=str, help="API Token")
    register_parser.add_argument("--category-id", type=str, help="分类 ID")
    register_parser.add_argument("--public", action="store_true", help="设为公开")

    # login
    login_parser = subparsers.add_parser("login", help="登录平台")
    login_parser.add_argument("--url", type=str, required=True, help="平台 URL")
    login_parser.add_argument("--username", type=str, required=True, help="用户名")
    login_parser.add_argument("--password", type=str, required=True, help="密码")

    # upload (legacy)
    upload_parser = subparsers.add_parser("upload", help="上传模型到平台")
    upload_parser.add_argument("model", type=str, help="模型包路径")
    upload_parser.add_argument("--url", type=str, required=True, help="平台 URL")
    upload_parser.add_argument("--token", type=str, help="API Token")

    args = parser.parse_args()

    if args.command == "validate":
        validate_config(args.config)
    elif args.command == "init":
        init_model(args.name, args.dir)
    elif args.command == "test":
        test_model(args.dir)
    elif args.command == "build":
        build_model(args.dir, args.tag)
    elif args.command == "register":
        register_model(args.dir, args.url, args.token, args.category_id, args.public)
    elif args.command == "login":
        login_platform(args.url, args.username, args.password)
    elif args.command == "upload":
        register_model(args.model, args.url, args.token, None, False)
    else:
        parser.print_help()


def validate_config(config_path: str):
    """验证模型配置"""
    try:
        config = ModelConfig.from_json(config_path)
        print(f"[OK] 配置有效")
        print(f"  模型名称: {config.name}")
        print(f"  版本: {config.version}")
        print(f"  参数数量: {len(config.parameters)}")
        print(f"  输入变量: {len(config.inputs)}")
        print(f"  输出变量: {len(config.outputs)}")
    except Exception as e:
        print(f"[FAIL] 配置无效: {e}")
        sys.exit(1)


def init_model(name: str, base_dir: str):
    """创建模型项目骨架"""
    model_dir = Path(base_dir) / name
    if model_dir.exists():
        print(f"[FAIL] 目录已存在: {model_dir}")
        sys.exit(1)

    model_dir.mkdir(parents=True, exist_ok=True)

    # 创建 config.json
    config = {
        "name": name,
        "version": "0.1.0",
        "description": f"{name} 模型",
        "author": "",
        "parameters": [
            {"name": "param1", "type": "float", "default": 1.0, "min": 0, "max": 10, "description": "示例参数"}
        ],
        "inputs": [
            {"name": "input1", "type": "timeseries", "data_type": "float", "description": "示例输入", "required": True}
        ],
        "outputs": [
            {"name": "output1", "type": "timeseries", "data_type": "float", "description": "示例输出"}
        ],
        "cpu_cores": 1,
        "memory_mb": 512,
        "max_runtime_seconds": 300
    }
    (model_dir / "config.json").write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")

    # 创建 model.py
    model_py = f'''"""
{name} 模型
"""

import json
import os
import sys


def read_inputs():
    """读取输入数据"""
    inputs = {{}}
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


def main():
    inputs = read_inputs()
    param1 = float(inputs.get("param1", inputs.get("parameters", {{}}).get("param1", 1.0)))
    input_data = inputs.get("input1", [1, 2, 3, 4, 5])

    # TODO: 实现模型算法
    output_data = [x * param1 for x in input_data]

    result = json.dumps({{"output1": output_data}}, ensure_ascii=False)
    print(result)

    output_dir = os.environ.get("WORKING_DIR", "/workspace")
    output_path = os.path.join(output_dir, "output")
    if os.path.exists(output_path) or os.environ.get("TASK_ID"):
        os.makedirs(output_path, exist_ok=True)
        with open(os.path.join(output_path, "results.json"), "w") as f:
            json.dump({{"outputs": {{"output1": output_data}}}}, f, indent=2)


if __name__ == "__main__":
    main()
'''
    (model_dir / "model.py").write_text(model_py, encoding="utf-8")

    # 创建 Dockerfile
    dockerfile = '''FROM python:3.11-slim
WORKDIR /workspace
COPY model.py .
COPY config.json .
RUN mkdir -p /workspace/data /workspace/output /workspace/input
ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["python", "model.py"]
'''
    (model_dir / "Dockerfile").write_text(dockerfile, encoding="utf-8")

    # 创建 requirements.txt
    (model_dir / "requirements.txt").write_text("# numpy\n# pandas\n# scipy\n", encoding="utf-8")

    print(f"[OK] 模型项目已创建: {model_dir}")
    print(f"  文件: config.json, model.py, Dockerfile, requirements.txt")
    print(f"  下一步:")
    print(f"    1. 编辑 config.json 定义模型接口")
    print(f"    2. 编辑 model.py 实现模型算法")
    print(f"    3. 运行 watershed test {name} 测试")
    print(f"    4. 运行 watershed build {name} 构建")


def test_model(model_dir: str):
    """本地运行模型测试"""
    model_path = Path(model_dir)
    if not (model_path / "model.py").exists():
        print(f"[FAIL] 未找到 model.py: {model_path}")
        sys.exit(1)

    print(f"[...] 运行模型测试: {model_path}")

    env = os.environ.copy()
    # 设置容器模拟环境变量
    env["WORKING_DIR"] = str(model_path)
    env["TASK_ID"] = "test-local"

    result = subprocess.run(
        [sys.executable, str(model_path / "model.py")],
        cwd=str(model_path),
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        print(f"[FAIL] 模型运行失败:")
        print(result.stderr)
        sys.exit(1)

    # 尝试解析 stdout JSON
    try:
        outputs = json.loads(result.stdout.strip())
        print(f"[OK] 模型运行成功")
        print(f"  输出变量: {list(outputs.keys())}")
        for key, value in outputs.items():
            if isinstance(value, list):
                print(f"  {key}: [{len(value)} items] 示例: {value[:3]}...")
            else:
                print(f"  {key}: {value}")
    except json.JSONDecodeError:
        print(f"[OK] 模型运行成功 (stdout 非 JSON)")
        print(f"  输出: {result.stdout[:200]}")


def build_model(model_dir: str, tag: str = None):
    """构建 Docker 镜像"""
    model_path = Path(model_dir)

    if not (model_path / "Dockerfile").exists():
        print(f"[FAIL] 未找到 Dockerfile: {model_path}")
        sys.exit(1)

    # 从 config.json 读取模型名
    config_file = model_path / "config.json"
    if config_file.exists():
        config = json.loads(config_file.read_text(encoding="utf-8"))
        model_name = config.get("name", model_path.name)
        version = config.get("version", "1.0.0")
    else:
        model_name = model_path.name
        version = "1.0.0"

    image_tag = tag or f"watershed/{model_name}:{version}"

    print(f"[...] 构建 Docker 镜像: {image_tag}")

    result = subprocess.run(
        ["docker", "build", "-f", str(model_path / "Dockerfile"), "-t", image_tag, str(model_path)],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"[FAIL] Docker 构建失败:")
        print(result.stderr[-500:])
        sys.exit(1)

    print(f"[OK] Docker 镜像已构建: {image_tag}")


def register_model(model_dir: str, url: str, token: str, category_id: str = None, public: bool = False):
    """注册模型到平台"""
    model_path = Path(model_dir)

    # 如果传入的是 zip 包，解压
    if model_path.suffix == ".zip":
        import tempfile
        tmp = tempfile.mkdtemp()
        shutil.unpack_archive(str(model_path), tmp)
        model_path = Path(tmp)

    config_file = model_path / "config.json"
    if not config_file.exists():
        print(f"[FAIL] 未找到 config.json: {model_path}")
        sys.exit(1)

    # 从 config.json 读取 docker image 名
    config = json.loads(config_file.read_text(encoding="utf-8"))
    model_name = config.get("name", model_path.name)
    version = config.get("version", "1.0.0")
    docker_image = f"watershed/{model_name}:{version}"

    client = PlatformClient(base_url=url, token=token)

    print(f"[...] 注册模型 '{model_name}' 到 {url}")

    try:
        result = client.register_model(
            config_path=str(config_file),
            docker_image=docker_image,
            category_id=category_id,
            visibility="public" if public else "private",
        )
        print(f"[OK] 模型已注册")
        print(f"  ID: {result.get('id', 'N/A')}")
        print(f"  Docker: {docker_image}")
    except Exception as e:
        print(f"[FAIL] 注册失败: {e}")
        sys.exit(1)


def login_platform(url: str, username: str, password: str):
    """登录平台"""
    client = PlatformClient(base_url=url)
    token = client.login(username, password)
    print(f"[OK] 登录成功")
    print(f"Token: {token[:20]}...")


if __name__ == "__main__":
    main()
