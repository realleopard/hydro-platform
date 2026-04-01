#!/bin/bash

# 流域水系统模拟模型平台 - 后端启动脚本

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "======================================"
echo "水文模型平台 - Java 后端启动脚本"
echo "======================================"
echo ""

cd "$BACKEND_DIR"

# 检查 Maven
if ! command -v mvn &> /dev/null; then
    echo "错误: Maven 未安装"
    exit 1
fi

# 检查 Java
if ! command -v java &> /dev/null; then
    echo "错误: Java 未安装"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
echo "Java 版本: $JAVA_VERSION"
echo ""

# 编译并启动
echo "正在编译并启动服务..."
echo ""

mvn spring-boot:run

# 如果上面的命令失败，尝试先编译再运行
if [ $? -ne 0 ]; then
    echo "尝试先编译..."
    mvn clean package -DskipTests
    java -jar target/test-project-backend-1.0.0.jar
fi
