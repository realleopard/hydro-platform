# 水文模型平台 - Spring Boot 后端

纯 Java 版本后端服务，基于 Spring Boot 3.2 + Java 17

## 技术栈

- **框架**: Spring Boot 3.2.0
- **JDK**: Java 17
- **数据库**: PostgreSQL 16
- **ORM**: MyBatis Plus 3.5.5
- **安全**: Spring Security + JWT
- **缓存**: Redis 7
- **API 文档**: OpenAPI 3.0 (SpringDoc)
- **构建工具**: Maven

## 项目结构

```
backend/
├── src/main/java/com/example/testproject/
│   ├── TestProjectApplication.java         # 启动类
│   ├── config/                             # 配置类
│   │   ├── SecurityConfig.java             # Spring Security 配置
│   │   ├── WebConfig.java                  # Web MVC 配置
│   │   └── MyBatisPlusConfig.java          # MyBatis Plus 配置
│   ├── controller/                         # 控制器层 (REST API)
│   │   ├── AuthController.java             # 认证接口
│   │   ├── ModelController.java            # 模型管理接口
│   │   ├── ModelCategoryController.java    # 模型分类接口
│   │   ├── WorkflowController.java         # 工作流接口
│   │   ├── TaskController.java             # 任务接口
│   │   └── DatasetController.java          # 数据集接口
│   ├── service/                            # 业务层
│   │   ├── UserService.java                # 用户服务
│   │   ├── ModelService.java               # 模型服务
│   │   ├── ModelVersionService.java        # 模型版本服务
│   │   ├── ModelReviewService.java         # 模型评价服务
│   │   ├── ModelCategoryService.java       # 模型分类服务
│   │   ├── WorkflowService.java            # 工作流服务
│   │   ├── TaskService.java                # 任务服务
│   │   ├── DatasetService.java             # 数据集服务
│   │   └── impl/                           # 服务实现
│   ├── mapper/                             # 数据访问层 (MyBatis)
│   │   ├── UserMapper.java
│   │   ├── ModelMapper.java
│   │   ├── ModelVersionMapper.java
│   │   ├── ModelReviewMapper.java
│   │   ├── ModelCategoryMapper.java
│   │   ├── WorkflowMapper.java
│   │   ├── TaskMapper.java
│   │   ├── DatasetMapper.java
│   │   └── OrganizationMapper.java
│   ├── entity/                             # 实体类
│   │   ├── User.java                       # 用户
│   │   ├── Organization.java               # 组织
│   │   ├── UserOrganization.java           # 用户组织关联
│   │   ├── Model.java                      # 模型
│   │   ├── ModelVersion.java               # 模型版本
│   │   ├── ModelReview.java                # 模型评价
│   │   ├── ModelCategory.java              # 模型分类
│   │   ├── ModelValidation.java            # 模型验证
│   │   ├── Workflow.java                   # 工作流
│   │   ├── Task.java                       # 任务
│   │   └── Dataset.java                    # 数据集
│   ├── dto/                                # 数据传输对象
│   │   ├── LoginRequest.java
│   │   ├── LoginResponse.java
│   │   └── RegisterRequest.java
│   ├── security/                           # 安全配置
│   │   ├── JwtUtil.java                    # JWT 工具类
│   │   ├── JwtAuthenticationFilter.java    # JWT 过滤器
│   │   ├── CurrentUser.java                # 当前用户注解
│   │   └── CurrentUserArgumentResolver.java
│   └── common/                             # 通用类
│       ├── Result.java                     # 统一响应结果
│       ├── BusinessException.java          # 业务异常
│       └── GlobalExceptionHandler.java     # 全局异常处理
├── src/main/resources/
│   └── application.yml                     # 配置文件
└── pom.xml                                 # Maven 配置
```

## 快速开始

### 1. 环境要求

- JDK 17+
- PostgreSQL 16+
- Redis 7+
- Maven 3.8+

### 2. 配置文件

编辑 `src/main/resources/application.yml`：

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/hydro_platform
    username: postgres
    password: your_password
  redis:
    host: localhost
    port: 6379

jwt:
  secret: your-secret-key-here-must-be-32-bytes-long
```

### 3. 数据库初始化

根据 `/docs/database-design.md` 中的 SQL 脚本创建数据库表。

### 4. 启动服务

```bash
# 开发模式
mvn spring-boot:run

# 或打包运行
mvn clean package -DskipTests
java -jar target/test-project-backend-1.0.0.jar
```

服务默认运行在 http://localhost:8080

API 文档: http://localhost:8080/swagger-ui.html

## API 接口

### 认证接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/v1/auth/register | POST | 用户注册 |
| /api/v1/auth/login | POST | 用户登录 |
| /api/v1/auth/refresh | POST | 刷新Token |
| /api/v1/auth/logout | POST | 用户登出 |

### 模型管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/v1/models | GET | 获取模型列表 |
| /api/v1/models/my | GET | 获取我的模型 |
| /api/v1/models | POST | 创建模型 |
| /api/v1/models/{id} | GET | 获取模型详情 |
| /api/v1/models/{id} | PUT | 更新模型 |
| /api/v1/models/{id} | DELETE | 删除模型 |
| /api/v1/models/{id}/publish | POST | 发布模型 |
| /api/v1/models/{id}/validate | POST | 验证模型 |

### 模型版本

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/v1/models/{id}/versions | GET | 获取版本列表 |
| /api/v1/models/{id}/versions | POST | 创建版本 |
| /api/v1/models/{id}/versions/{vid} | GET | 获取版本详情 |
| /api/v1/models/{id}/versions/{vid} | DELETE | 删除版本 |

### 模型评价

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/v1/models/{id}/reviews | GET | 获取评价列表 |
| /api/v1/models/{id}/reviews | POST | 创建评价 |

### 模型分类

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/v1/categories | GET | 获取分类列表 |
| /api/v1/categories/tree | GET | 获取分类树 |
| /api/v1/categories | POST | 创建分类 |
| /api/v1/categories/{id} | PUT | 更新分类 |
| /api/v1/categories/{id} | DELETE | 删除分类 |

### 工作流

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/v1/workflows | GET | 获取工作流列表 |
| /api/v1/workflows/my | GET | 获取我的工作流 |
| /api/v1/workflows | POST | 创建工作流 |
| /api/v1/workflows/{id} | GET | 获取工作流详情 |
| /api/v1/workflows/{id} | PUT | 更新工作流 |
| /api/v1/workflows/{id} | DELETE | 删除工作流 |
| /api/v1/workflows/{id}/run | POST | 运行工作流 |

### 任务

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/v1/tasks | GET | 获取任务列表 |
| /api/v1/tasks/{id} | GET | 获取任务详情 |
| /api/v1/tasks/{id} | DELETE | 取消任务 |
| /api/v1/tasks/{id}/logs | GET | 获取任务日志 |

### 数据集

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/v1/datasets | GET | 获取数据集列表 |
| /api/v1/datasets/my | GET | 获取我的数据集 |
| /api/v1/datasets | POST | 创建数据集 |
| /api/v1/datasets/{id} | GET | 获取数据集详情 |
| /api/v1/datasets/{id} | PUT | 更新数据集 |
| /api/v1/datasets/{id} | DELETE | 删除数据集 |

## 特性说明

### 已完成功能

- [x] 用户认证 (JWT + Spring Security)
- [x] 模型 CRUD 操作
- [x] 模型版本管理
- [x] 模型评价系统
- [x] 模型分类管理
- [x] 工作流管理
- [x] 任务管理
- [x] 数据集管理
- [x] 全局异常处理
- [x] OpenAPI/Swagger 文档
- [x] 参数校验

### 待开发功能

- [ ] Docker 支持
- [ ] 任务调度引擎
- [ ] 模型验证算法 (NSE/RMSE)
- [ ] 3D 可视化接口
- [ ] 教学辅助功能
- [ ] 单元测试

## 数据库设计

参考 `/docs/database-design.md` 了解完整的数据库 Schema 设计。

核心表：
- `users` - 用户表
- `organizations` - 组织表
- `models` - 模型表
- `model_versions` - 模型版本表
- `model_reviews` - 模型评价表
- `model_categories` - 模型分类表
- `workflows` - 工作流表
- `tasks` - 任务表
- `datasets` - 数据集表
