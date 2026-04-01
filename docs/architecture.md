# 架构设计文档

## 1. 总体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端应用层                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web 门户   │  │  3D 可视化   │  │  教学工具   │  │    模型编排器        │ │
│  │   (React)   │  │  (Cesium)   │  │   (Vue)     │  │  (React Flow)       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼────────────┘
          │                │                │                    │
          └────────────────┴────────────────┴────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API 网关层                                        │
│                    Kong / Traefik (负载均衡、认证、限流)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   模型管理服务    │    │   调度引擎服务    │    │   可视化服务      │
│  (Model Mgmt)    │    │  (Scheduler)     │    │  (Visualization) │
│   Go/Gin         │    │   Python/FastAPI │    │   Node.js        │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              消息队列层                                        │
│                         Apache Kafka / RabbitMQ                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   计算节点集群    │    │   文件存储        │    │   数据库集群      │
│  (K8s + Docker)  │    │  (MinIO/S3)      │    │  (PostgreSQL     │
│                  │    │                  │    │   + Redis)       │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## 2. 模块详细设计

### 2.1 模型集成与容器化管理平台

#### 2.1.1 功能模块
- **镜像管理**: Docker Registry 集成、镜像构建、版本标签
- **模型注册**: 元数据管理、接口定义、依赖声明
- **生命周期**: 注册→审核→发布→更新→退役
- **审计日志**: 操作记录、使用统计、性能追踪

#### 2.1.2 核心组件
```
Model Registry Service
├── API Layer (REST/gRPC)
├── Business Logic
│   ├── Image Manager
│   ├── Metadata Validator
│   └── Version Control
├── Data Access
│   ├── Model Repository
│   └── Audit Log Repository
└── Integration
    ├── Docker Registry
    └── CI/CD Pipeline
```

### 2.2 智能化模型调度与耦合引擎

#### 2.2.1 架构设计
```
Scheduler Engine
├── Workflow Orchestrator
│   ├── DAG Parser
│   ├── Dependency Resolver
│   └── Execution Planner
├── Task Scheduler
│   ├── Priority Queue
│   ├── Resource Allocator
│   └── Load Balancer
├── Coupling Manager
│   ├── Loose Coupling Adapter
│   ├── Tight Coupling Bridge
│   └── Data Transformer
└── Monitor & Reporter
    ├── Status Tracker
    ├── Progress Publisher
    └── Alert Manager
```

#### 2.2.2 调度策略
- **串行调度**: 按依赖顺序执行
- **并行调度**: 无依赖任务并行
- **混合调度**: 智能判断串并行
- **分布式调度**: 跨节点负载均衡

### 2.3 数字孪生与全要素可视化服务

#### 2.3.1 技术架构
```
Visualization Service
├── Data Ingestion
│   ├── Real-time Stream (WebSocket)
│   ├── Batch Import (GeoTIFF, Shapefile)
│   └── API Integration
├── Processing Pipeline
│   ├── Data Normalization
│   ├── Coordinate Transformation
│   └── Level-of-Detail (LOD)
├── Rendering Engine
│   ├── Cesium 3D Viewer
│   ├── Custom Shader Programs
│   └── Particle System
└── Interaction Layer
    ├── Time Slider
    ├── Query & Search
    └── Scene Navigation
```

### 2.4 教学辅助插件工具集

#### 2.4.1 模块划分
```
Teaching Toolkit
├── Virtual Laboratory
│   ├── Parameter Configurator
│   ├── Sensitivity Analyzer
│   └── Real-time Simulator
├── Presentation Mode
│   ├── Slide Manager
│   ├── Media Embedder
│   └── Annotation Tool
└── Assessment System
    ├── Quiz Generator
    ├── Performance Tracker
    └── Report Builder
```

## 3. 数据流设计

### 3.1 模型执行流程
```
用户 → 选择模型 → 配置参数 → 提交任务
                                    ↓
                              调度器接收
                                    ↓
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
              解析依赖关系                      分配计算资源
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
                              启动容器执行
                                    ↓
                              实时监控状态 ←──── 计算节点
                                    ↓
                              收集结果数据
                                    ↓
                              可视化展示 ←──── 用户
```

### 3.2 数据存储策略
| 数据类型 | 存储方案 | 说明 |
|---------|---------|------|
| 结构化数据 | PostgreSQL | 用户、模型元数据、任务记录 |
| 缓存数据 | Redis | 会话、实时状态、热点数据 |
| 文件存储 | MinIO/S3 | 模型文件、输入输出数据、遥感影像 |
| 时序数据 | InfluxDB/TimescaleDB | 传感器数据、模拟结果时间序列 |
| 日志数据 | Elasticsearch | 审计日志、操作日志 |

## 4. 安全设计

### 4.1 认证授权
- **OAuth 2.0 / OIDC**: 用户认证
- **RBAC**: 基于角色的权限控制
- **JWT**: Token 传递
- **API Key**: 服务间认证

### 4.2 数据安全
- **传输加密**: TLS 1.3
- **存储加密**: AES-256
- **敏感数据**: 字段级加密
- **备份策略**: 定期增量备份

## 5. 扩展性设计

### 5.1 水平扩展
- 无状态服务设计
- 容器化部署
- Kubernetes HPA
- 数据库读写分离

### 5.2 插件化架构
- 模型接入插件接口
- 可视化组件插件
- 教学工具插件
- 数据格式转换插件
