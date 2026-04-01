#!/bin/bash

# Hydro Platform 停止脚本

cd "$(dirname "$0")/../infrastructure"

echo "🛑 停止 Hydro Platform..."
docker-compose down

echo "✅ 已停止"
