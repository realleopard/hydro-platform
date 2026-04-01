# 技术栈选型

## 1. 后端技术栈

### 1.1 核心服务框架

| 服务 | 技术选型 | 选型理由 |
|-----|---------|---------|
| API Gateway | Kong / Traefik | 高性能、插件丰富、支持服务发现 |
| 认证服务 | Keycloak / Authelia | 开源、支持 OAuth2/OIDC、RBAC |
| 主服务框架 | Go + Gin | 高性能、并发能力强、部署简单 |
| 计算服务 | Python + FastAPI | 生态丰富、科学计算库成熟 |
| 可视化服务 | Node.js + Express | 实时性好、WebSocket 支持佳 |

### 1.2 数据库与存储

| 用途 | 技术选型 | 说明 |
|-----|---------|------|
| 主数据库 | PostgreSQL 15+ | 支持 JSON、GIS 扩展、成熟稳定 |
| 缓存 | Redis 7+ | 高性能缓存、支持 Pub/Sub |
| 对象存储 | MinIO | S3 兼容、自托管、性能优秀 |
| 时序数据 | TimescaleDB | PostgreSQL 扩展、适合水文时序数据 |
| 搜索引擎 | Elasticsearch 8+ | 日志搜索、全文检索 |
| 图数据库 | Neo4j (可选) | 模型关系图谱 |

### 1.3 消息队列

| 方案 | 适用场景 |
|-----|---------|
| Apache Kafka | 高吞吐日志、事件流 |
| RabbitMQ | 任务队列、RPC |
| Redis Pub/Sub | 实时通知、简单广播 |
| NATS | 服务间消息、轻量级 |

### 1.4 容器与编排

| 组件 | 选型 |
|-----|------|
| 容器运行时 | Docker + containerd |
| 镜像仓库 | Harbor / Docker Registry |
| 编排平台 | Kubernetes 1.28+ |
| 服务网格 | Istio (可选) |
| GitOps | ArgoCD |

## 2. 前端技术栈

### 2.1 Web 应用

| 框架 | 用途 | 选型理由 |
|-----|------|---------|
| React 18+ | 主应用框架 | 生态成熟、组件化、性能优秀 |
| TypeScript | 开发语言 | 类型安全、可维护性高 |
| Vite | 构建工具 | 启动快、热更新、配置简单 |
| Ant Design / MUI | UI 组件库 | 企业级设计、组件丰富 |
| React Query | 数据获取 | 缓存管理、乐观更新 |
| Zustand | 状态管理 | 轻量、简洁 |
| React Flow | 工作流编排 | 节点编辑、连接可视化 |

### 2.2 3D 可视化

| 技术 | 用途 |
|-----|------|
| CesiumJS | 3D 地球、地形渲染 |
| Three.js | 粒子效果、特效 |
| WebGL 2.0 | 底层图形渲染 |
| Deck.gl | 大规模数据可视化 |
| D3.js | 统计图表 |

### 2.3 地图与 GIS

| 库/服务 | 用途 |
|---------|------|
| OpenLayers / Leaflet | 2D 地图 |
| Turf.js | 地理空间计算 |
| GeoServer (可选) | 地图服务 |
| Mapbox GL JS | 矢量地图 |

## 3. 模型开发与容器化

### 3.1 多语言支持

| 语言 | 框架/工具 | 应用场景 |
|-----|----------|---------|
| Python | NumPy, SciPy, Pandas, Xarray | 数据处理、科学计算 |
| Java | Spring Boot | 企业级模型服务 |
| C++ | CMake, Conan | 高性能计算模型 |
| Fortran | gfortran, ifort | 传统水文模型 |
| R (可选) | Rserve, Plumber | 统计分析模型 |

### 3.2 模型容器化

```dockerfile
# 基础镜像分层设计
# Layer 1: 系统基础
FROM ubuntu:22.04 AS base
RUN apt-get update && apt-get install -y \
    python3.10 python3-pip \
    openjdk-17-jdk \
    g++ gfortran cmake

# Layer 2: 科学计算环境
FROM base AS scientific
RUN pip3 install numpy scipy pandas xarray netCDF4

# Layer 3: 模型运行时
FROM scientific AS runtime
COPY ./model /app/model
WORKDIR /app
ENTRYPOINT ["python3", "-m", "model.runner"]
```

### 3.3 模型接口规范

```yaml
# model.yaml - 模型元数据
apiVersion: hydro-platform.io/v1
kind: Model
metadata:
  name: swat-model
  version: "2.1.0"
spec:
  runtime:
    type: docker
    image: hydro-platform/swat:2.1.0
  interfaces:
    input:
      - name: precipitation
        type: timeseries
        format: netcdf
      - name: dem
        type: raster
        format: geotiff
    output:
      - name: runoff
        type: timeseries
        format: csv
  resources:
    cpu: 4
    memory: 8Gi
    storage: 50Gi
```

## 4. 开发与运维工具

### 4.1 开发工具

| 类别 | 工具 |
|-----|------|
| 代码管理 | Git + GitLab/GitHub |
| CI/CD | GitLab CI / GitHub Actions |
| 代码质量 | SonarQube, ESLint, go vet |
| API 文档 | Swagger/OpenAPI |
| 接口测试 | Postman, k6 |

### 4.2 监控与可观测性

| 组件 | 工具 |
|-----|------|
| 指标收集 | Prometheus |
| 可视化 | Grafana |
| 日志收集 | Loki / ELK Stack |
| 链路追踪 | Jaeger / Tempo |
| APM | SigNoz (可选) |

### 4.3 基础设施

| 用途 | 方案 |
|-----|------|
| 云平台 | 阿里云 / 华为云 / 私有云 |
| 超算接入 | Slurm API / PBS Pro |
| 对象存储 | 阿里云 OSS / MinIO |
| CDN | 阿里云 CDN / CloudFlare |

## 5. 选型对比与决策

### 5.1 后端框架对比

| 框架 | 性能 | 生态 | 学习曲线 | 综合评分 |
|-----|------|------|---------|---------|
| Go/Gin | ★★★★★ | ★★★★☆ | ★★★★☆ | ⭐ 推荐 |
| Python/FastAPI | ★★★☆☆ | ★★★★★ | ★★★★★ | ⭐ 计算服务 |
| Java/Spring | ★★★☆☆ | ★★★★★ | ★★★☆☆ | 可选 |
| Node.js/Nest | ★★★★☆ | ★★★★☆ | ★★★★☆ | 可视化服务 |

### 5.2 数据库对比

| 数据库 | 适用场景 | 优势 | 劣势 |
|-------|---------|------|------|
| PostgreSQL | 主数据库 | 功能全面、GIS支持 | 高并发写入性能一般 |
| TimescaleDB | 时序数据 | 时序优化、SQL接口 | 学习成本 |
| MongoDB | 非结构化数据 | 灵活Schema | 事务支持较弱 |
| MySQL | 传统应用 | 广泛使用 | GIS功能弱 |

### 5.3 3D 引擎对比

| 引擎 | 性能 | 功能 | 学习曲线 | 许可 |
|-----|------|------|---------|------|
| CesiumJS | ★★★★★ | ★★★★★ | ★★★☆☆ | Apache 2.0 |
| Three.js | ★★★★☆ | ★★★★☆ | ★★★★☆ | MIT |
| Babylon.js | ★★★★☆ | ★★★★★ | ★★★☆☆ | Apache 2.0 |
| Unity WebGL | ★★★★★ | ★★★★★ | ★★★☆☆ | 商业授权 |

## 6. 版本规划

| 组件 | 最低版本 | 推荐版本 |
|-----|---------|---------|
| Node.js | 18.x | 20 LTS |
| Go | 1.20 | 1.22 |
| Python | 3.10 | 3.11 |
| PostgreSQL | 14 | 15/16 |
| Redis | 6.x | 7.x |
| Kubernetes | 1.26 | 1.28 |
