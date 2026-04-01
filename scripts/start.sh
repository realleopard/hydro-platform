#!/bin/bash

# Hydro Platform 启动脚本

cd "$(dirname "$0")/../infrastructure"

echo "🚀 启动 Hydro Platform..."
docker-compose up -d

echo "⏳ 等待服务启动..."
sleep 5

echo "✅ 服务已启动"
echo ""
echo "📋 服务地址:"
echo "  - API: http://localhost:8080"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
