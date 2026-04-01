# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在本仓库中工作时的指导。

## 项目概述

这是一个**流域水系统模拟模型平台** —— 一个使用 Docker 容器进行水文模型集成、调度和可视化的平台。

## 技术栈

- **后端**: Spring Boot 3.2 + Java 17 + MyBatis Plus
- **前端**: React 18 + TypeScript + Cesium (3D 可视化)
- **数据库**: PostgreSQL 16 + Redis 7
- **容器**: Docker + Kubernetes (规划中)

## 常用命令

### 后端 (Java/Spring Boot)

```bash
cd backend

# 运行应用程序
mvn spring-boot:run

# 运行所有测试
mvn test

# 运行单个测试类
mvn test -Dtest=UserServiceTest

# 构建 JAR
mvn clean package

# API 文档 (运行后访问)
# http://localhost:8080/swagger-ui.html
```

### 前端 (React)

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start

# 运行测试
npm test

# 生产构建
npm run build
```

### 基础设施

```bash
# 启动所有服务 (PostgreSQL, Redis, 后端)
cd infrastructure
docker-compose up -d

# 查看日志
docker-compose logs -f backend
```

## 后端架构

后端遵循标准的 Spring Boot 分层架构，位于 `backend/src/main/java/com/example/testproject/`:

### 包结构

| 包 | 用途 |
|---------|---------|
| `controller/` | REST API 端点 (认证、模型、工作流、任务、数据集、分类) |
| `service/` | 业务逻辑接口和实现 |
| `entity/` | JPA 实体 (用户、模型、工作流、任务、数据集、组织等) |
| `mapper/` | MyBatis Plus 数据访问层 |
| `dto/` | API 请求/响应的数据传输对象 |
| `security/` | JWT 认证 (JwtUtil, JwtAuthenticationFilter, CurrentUser) |
| `config/` | Spring 配置 (SecurityConfig, MyBatisPlusConfig, WebConfig) |
| `common/` | 共享工具类 (Result 包装器, GlobalExceptionHandler, BusinessException) |

### 关键依赖

- **MyBatis Plus**: PostgreSQL 的 ORM - mappers 继承 `BaseMapper<Entity>`
- **JJWT 0.12.3**: JWT token 处理
- **Spring Security**: 认证和授权
- **SpringDoc OpenAPI**: 自动生成 API 文档，访问 `/swagger-ui.html`

### API 响应格式

所有 API 响应使用 `common/Result.java` 中的 `Result<T>` 包装器:
```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "requestId": "..."
}
```

### 认证

- 基于 JWT 的认证，使用访问令牌
- 用户名/密码登录 `POST /api/v1/auth/login`
- 请求头中需携带 Token: `Authorization: Bearer <token>`
- 通过 `@CurrentUser` 注解注入当前用户

## 前端架构

前端是一个使用 TypeScript 的 React 18 应用:

### 关键库

- **Cesium**: 用于水文数据的 3D 地球可视化
- **React Flow**: 用于模型编排的工作流/节点编辑器
- **Zustand**: 状态管理
- **Axios**: HTTP 客户端
- **Recharts**: 数据可视化图表

### 开发

- 默认运行在 3000 端口
- API 请求代理到后端 (在 package.json 中配置)
- 使用标准的 Create React App 结构

## 数据库设计

PostgreSQL 模式详见 `docs/database-design.md`。关键表:

| 表 | 用途 |
|-------|---------|
| `users` | 用户账户，含角色 (admin/expert/user/student) |
| `models` | 水文模型注册表，含 Docker 镜像引用 |
| `model_versions` | 模型版本控制 |
| `workflows` | 模型编排的 DAG 定义 |
| `tasks` | 工作流执行实例 |
| `task_nodes` | 任务内的单个节点执行 |
| `datasets` | 输入/输出数据文件 (NetCDF, GeoTIFF 等) |
| `visualization_scenes` | Cesium 的 3D 场景配置 |

### JSONB 列

多个实体使用 PostgreSQL JSONB 实现灵活的模式:
- `models.interfaces` - 输入/输出接口定义
- `models.resources` - CPU/内存/存储需求
- `workflows.definition` - DAG 节点和边
- `tasks.outputs` - 输出文件路径

## API 设计规范

详见 `docs/api-design.md`:

- RESTful URL 带版本: `/api/v1/...`
- 标准 HTTP 方法 (GET, POST, PUT, DELETE)
- 分页: `?page=1&page_size=20`
- 过滤: `?category=hydrological&tags=runoff`
- WebSocket 实时任务更新: `/ws/v1/tasks/{task_id}`

## 关键领域概念

### 模型管理
- 模型是带定义输入/输出接口的 Docker 容器
- 支持验证指标 (NSE, RMSE, MAE, R²)
- 带变更日志的版本化发布

### 工作流编排
- 基于 DAG 的工作流定义
- 连接模型间的数据映射
- 支持串行、并行和混合执行策略

### 任务执行生命周期
```
PENDING → QUEUED → RUNNING → COMPLETED
              ↓         ↓
         CANCELLED  FAILED → RETRY
```

## 文档

- `docs/architecture.md` - 系统架构概述
- `docs/api-design.md` - API 设计模式和端点
- `docs/database-design.md` - 数据库模式和 Redis 结构
- `docs/tech-stack.md` - 技术选型
- `docs/roadmap.md` - 开发路线图
- `docs/deployment.md` - 部署流程

## 开发状态

已完成:
- 后端框架 (Spring Boot)
- 数据库实体
- 基础 CRUD API
- JWT 认证
- 全局异常处理

进行中:
- 任务调度引擎
- 模型验证算法
- 3D 可视化 API
