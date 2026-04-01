# 基础设施部署指南

本目录包含流域水系统模拟模型平台的 Docker Compose 基础设施配置。

## 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                         │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│  PostgreSQL │    Redis    │   RabbitMQ  │     Backend       │
│   (5432)    │   (6379)    │  (5672/     │     (8080)        │
│             │             │  15672)     │                   │
├─────────────┴─────────────┴─────────────┴───────────────────┤
│                      Prometheus (9090)                      │
├─────────────────────────────────────────────────────────────┤
│                      Grafana (3001)                         │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 启动所有服务

```bash
cd infrastructure

# 启动所有服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 2. 访问服务

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端 API | http://localhost:8080 | REST API 入口 |
| API 文档 | http://localhost:8080/swagger-ui.html | Swagger UI |
| RabbitMQ 管理界面 | http://localhost:15672 | 消息队列管理 |
| Prometheus | http://localhost:9090 | 指标监控 |
| Grafana | http://localhost:3001 | 可视化监控面板 |

### 3. RabbitMQ 登录

- URL: http://localhost:15672
- 用户名: hydro
- 密码: hydro123
- 虚拟主机: watershed

### 4. Grafana 登录

- URL: http://localhost:3001
- 用户名: admin
- 密码: admin123

## 服务详情

### PostgreSQL (数据库)

- **镜像**: postgres:16-alpine
- **端口**: 5432
- **数据库**: hydro_platform
- **用户名**: hydro
- **密码**: hydro123
- **数据卷**: postgres_data

```bash
# 连接数据库
docker-compose exec postgres psql -U hydro -d hydro_platform
```

### Redis (缓存)

- **镜像**: redis:7-alpine
- **端口**: 6379
- **数据卷**: redis_data

```bash
# 连接 Redis
docker-compose exec redis redis-cli
```

### RabbitMQ (消息队列)

- **镜像**: rabbitmq:3.12-management-alpine
- **AMQP 端口**: 5672
- **管理界面端口**: 15672
- **数据卷**: rabbitmq_data

预配置队列：
- `task.queue` - 任务执行队列
- `task.dlq` - 死信队列
- `notification.queue` - 通知队列
- `model.validation.queue` - 模型验证队列

### Prometheus (指标收集)

- **镜像**: prom/prometheus:v2.47.0
- **端口**: 9090
- **配置**: monitoring/prometheus/prometheus.yml

监控目标：
- 后端服务 (backend:8080)
- PostgreSQL (需部署 postgres_exporter)
- Redis (需部署 redis_exporter)
- RabbitMQ (rabbitmq:15692)

### Grafana (可视化)

- **镜像**: grafana/grafana:10.1.0
- **端口**: 3001
- **数据源**: Prometheus

预配置仪表板：
- JVM Metrics - JVM 内存、GC、线程监控
- HTTP Metrics - 请求速率、响应时间
- Database Metrics - 连接池监控
- RabbitMQ Metrics - 队列消息数监控

## 常用命令

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 停止并删除数据卷（清理所有数据）
docker-compose down -v

# 重启服务
docker-compose restart

# 重启单个服务
docker-compose restart backend
```

### 日志管理

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs -f backend

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

### 服务管理

```bash
# 构建后端镜像
docker-compose build backend

# 重新构建并启动
docker-compose up -d --build backend

# 扩展后端服务实例数
docker-compose up -d --scale backend=3

# 执行后端容器命令
docker-compose exec backend sh
```

## 配置说明

### RabbitMQ 配置

配置文件位于 `rabbitmq/rabbitmq.conf`：

```conf
# 内存和磁盘告警阈值
vm_memory_high_watermark.relative = 0.6
disk_free_limit.relative = 1.0

# 连接心跳
heartbeat = 60
```

队列定义位于 `rabbitmq/definitions.json`：
- 包含用户、vhost、队列、交换机和绑定关系的预配置

### Prometheus 配置

配置文件位于 `monitoring/prometheus/prometheus.yml`：

```yaml
scrape_configs:
  - job_name: 'watershed-backend'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['backend:8080']
```

告警规则位于 `monitoring/prometheus/alerts.yml`：
- BackendDown - 服务宕机告警
- HighErrorRate - 高错误率告警
- HighResponseTime - 高响应时间告警
- JvmMemoryHigh - JVM 内存告警

### Grafana 配置

- 数据源配置: `monitoring/grafana/provisioning/datasources/`
- 仪表板配置: `monitoring/grafana/provisioning/dashboards/`
- 仪表板 JSON: `monitoring/grafana/dashboards/`

## 故障排查

### 服务无法启动

```bash
# 检查端口占用
sudo lsof -i :5432
sudo lsof -i :6379
sudo lsof -i :8080
sudo lsof -i :15672

# 查看详细错误
docker-compose logs <service-name>
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 健康状态
docker-compose ps postgres

# 查看 PostgreSQL 日志
docker-compose logs postgres

# 手动测试连接
docker-compose exec postgres pg_isready -U hydro
```

### RabbitMQ 连接失败

```bash
# 检查 RabbitMQ 状态
docker-compose exec rabbitmq rabbitmq-diagnostics status

# 查看队列状态
docker-compose exec rabbitmq rabbitmqctl list_queues
```

### 监控数据缺失

```bash
# 检查 Prometheus 目标状态
curl http://localhost:9090/api/v1/targets

# 检查后端指标端点
curl http://localhost:8080/actuator/prometheus
```

## 数据持久化

所有服务数据都使用 Docker 卷持久化：

```yaml
volumes:
  postgres_data:    # PostgreSQL 数据
  redis_data:       # Redis 数据
  rabbitmq_data:    # RabbitMQ 数据
  prometheus_data:  # Prometheus 数据
  grafana_data:     # Grafana 数据
```

备份数据：

```bash
# 备份 PostgreSQL
docker-compose exec postgres pg_dump -U hydro hydro_platform > backup.sql

# 备份 Redis
docker-compose exec redis redis-cli SAVE
docker cp $(docker-compose ps -q redis):/data/dump.rdb ./redis-backup.rdb
```

## 网络配置

所有服务连接到 `watershed-network` 桥接网络，可以通过服务名相互访问：

- postgres:5432
- redis:6379
- rabbitmq:5672
- backend:8080
- prometheus:9090
- grafana:3000

## 环境变量

后端服务支持的环境变量：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| DB_HOST | postgres | 数据库主机 |
| DB_PORT | 5432 | 数据库端口 |
| DB_USER | hydro | 数据库用户 |
| DB_PASSWORD | hydro123 | 数据库密码 |
| REDIS_HOST | redis | Redis 主机 |
| REDIS_PORT | 6379 | Redis 端口 |
| RABBITMQ_HOST | rabbitmq | RabbitMQ 主机 |
| RABBITMQ_PORT | 5672 | RabbitMQ 端口 |
| RABBITMQ_USERNAME | hydro | RabbitMQ 用户 |
| RABBITMQ_PASSWORD | hydro123 | RabbitMQ 密码 |
| JWT_SECRET | hydro-platform-secret-key | JWT 密钥 |
