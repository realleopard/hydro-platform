# 流域水系统模拟模型平台

## 技术栈

- **后端**: Spring Boot 3.2 + Java 17 + MyBatis Plus
- **前端**: React 18 + TypeScript
- **数据库**: PostgreSQL 16 + Redis 7
- **容器**: Docker + Kubernetes

## 目录结构

```
test-project/
├── docs/                          # 文档目录
│   ├── architecture.md            # 架构设计文档
│   ├── tech-stack.md              # 技术栈选型
│   ├── roadmap.md                 # 开发路线图
│   ├── api-design.md              # API 设计
│   ├── database-design.md         # 数据库设计
│   └── deployment.md              # 部署方案
├── backend/                       # Java 后端服务 (Spring Boot)
│   ├── src/main/java/...          # 源代码
│   ├── src/main/resources/        # 配置文件
│   └── pom.xml                    # Maven 配置
├── frontend/                      # 前端应用 (React)
│   ├── src/                       # 源代码
│   └── package.json               # 依赖配置
├── models/                        # 模型封装示例
│   ├── docker/                    # Docker 模板
│   └── examples/                  # 示例模型
└── infrastructure/                # 基础设施
    ├── docker/                    # Docker Compose 配置
    ├── k8s/                       # Kubernetes 配置
    └── scripts/                   # 部署脚本
```

## 快速开始

### 后端启动

```bash
cd backend
mvn spring-boot:run
```

服务运行在 http://localhost:8080
API 文档: http://localhost:8080/swagger-ui.html

### 前端启动

```bash
cd frontend
npm install
npm start
```

前端运行在 http://localhost:3000

## 核心模块

### 1. 模型集成与容器化管理平台
- Docker 镜像仓库集成
- 模型元数据管理
- 版本控制与审计
- 模型验证算法实现

### 2. 智能化模型调度与耦合引擎
- 工作流编排引擎
- 分布式任务调度器
- 模型耦合接口规范
- 计算状态监控

### 3. 数字孪生与全要素可视化服务
- Cesium 3D 地球引擎
- 水文数据渲染
- 粒子系统特效
- 时间轴控制

### 4. 教学辅助插件工具集
- 参数敏感性分析
- 互动演示引擎
- 多媒体标注系统

## 后端 API 模块

| 模块 | 说明 |
|------|------|
| Auth | 用户认证 (JWT) |
| Model | 模型管理 (CRUD、版本、评价) |
| Category | 模型分类管理 |
| Workflow | 工作流管理 |
| Task | 任务管理 |
| Dataset | 数据集管理 |

## 开发状态

- [x] 后端框架搭建 (Spring Boot)
- [x] 数据库实体设计
- [x] 基础 CRUD 接口
- [x] JWT 认证
- [x] 全局异常处理
- [ ] 任务调度引擎
- [ ] 模型验证算法
- [ ] 3D 可视化接口
