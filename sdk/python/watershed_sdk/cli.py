"""
命令行工具
"""

import argparse
import json
import sys
from pathlib import Path

from .model import ModelConfig
from .client import PlatformClient


def main():
    parser = argparse.ArgumentParser(
        description="Watershed Model SDK 命令行工具"
    )
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # 验证配置命令
    validate_parser = subparsers.add_parser(
        "validate",
        help="验证模型配置文件"
    )
    validate_parser.add_argument(
        "config",
        type=str,
        help="模型配置文件路径"
    )

    # 打包命令
    package_parser = subparsers.add_parser(
        "package",
        help="打包模型"
    )
    package_parser.add_argument(
        "source",
        type=str,
        help="模型源目录"
    )
    package_parser.add_argument(
        "-o", "--output",
        type=str,
        default=".",
        help="输出目录"
    )

    # 上传命令
    upload_parser = subparsers.add_parser(
        "upload",
        help="上传模型到平台"
    )
    upload_parser.add_argument(
        "model",
        type=str,
        help="模型包路径"
    )
    upload_parser.add_argument(
        "--url",
        type=str,
        required=True,
        help="平台 URL"
    )
    upload_parser.add_argument(
        "--token",
        type=str,
        help="API Token"
    )

    # 登录命令
    login_parser = subparsers.add_parser(
        "login",
        help="登录平台"
    )
    login_parser.add_argument(
        "--url",
        type=str,
        required=True,
        help="平台 URL"
    )
    login_parser.add_argument(
        "--username",
        type=str,
        required=True,
        help="用户名"
    )
    login_parser.add_argument(
        "--password",
        type=str,
        required=True,
        help="密码"
    )

    args = parser.parse_args()

    if args.command == "validate":
        validate_config(args.config)
    elif args.command == "package":
        package_model(args.source, args.output)
    elif args.command == "upload":
        upload_model(args.model, args.url, args.token)
    elif args.command == "login":
        login_platform(args.url, args.username, args.password)
    else:
        parser.print_help()


def validate_config(config_path: str):
    """验证模型配置"""
    try:
        config = ModelConfig.from_json(config_path)
        print(f"✓ 配置有效")
        print(f"  模型名称: {config.name}")
        print(f"  版本: {config.version}")
        print(f"  参数数量: {len(config.parameters)}")
        print(f"  输入变量: {len(config.inputs)}")
        print(f"  输出变量: {len(config.outputs)}")
    except Exception as e:
        print(f"✗ 配置无效: {e}")
        sys.exit(1)


def package_model(source_dir: str, output_dir: str):
    """打包模型"""
    import shutil
    import zipfile

    source = Path(source_dir)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    # 检查必要文件
    if not (source / "model.py").exists():
        print("✗ 缺少 model.py")
        sys.exit(1)

    if not (source / "config.json").exists():
        print("✗ 缺少 config.json")
        sys.exit(1)

    # 创建打包文件
    package_name = f"{source.name}.zip"
    package_path = output / package_name

    with zipfile.ZipFile(package_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file in source.rglob("*"):
            if file.is_file():
                arcname = file.relative_to(source)
                zf.write(file, arcname)

    print(f"✓ 模型已打包: {package_path}")


def upload_model(model_path: str, url: str, token: str):
    """上传模型"""
    client = PlatformClient(base_url=url, token=token)

    # 这里需要实现实际上传逻辑
    # 目前只是占位
    print(f"上传模型 {model_path} 到 {url}")
    print("功能开发中...")


def login_platform(url: str, username: str, password: str):
    """登录平台"""
    client = PlatformClient(base_url=url)
    token = client.login(username, password)
    print(f"✓ 登录成功")
    print(f"Token: {token[:20]}...")


if __name__ == "__main__":
    main()
