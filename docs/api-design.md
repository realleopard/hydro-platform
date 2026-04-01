# API 设计文档

## 1. API 设计原则

- **RESTful 风格**: 资源导向的 URL 设计
- **版本控制**: URL 中包含版本号 (v1, v2)
- **统一响应格式**: 标准 JSON 结构
- **认证方式**: JWT Bearer Token
- **分页**: 游标分页 + 页码分页
- **限流**: 基于用户等级的速率限制

## 2. 基础规范

### 2.1 响应格式

```json
// 成功响应
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "request_id": "req_abc123"
}

// 错误响应
{
  "code": 400,
  "message": "Invalid parameter: model_id",
  "error_type": "VALIDATION_ERROR",
  "details": { ... },
  "request_id": "req_abc123"
}

// 列表响应
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "page_size": 20,
      "has_more": true
    }
  }
}
```

### 2.2 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|-------|------|---------|
| 200 | OK | 正常响应 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable | 业务逻辑错误 |
| 429 | Too Many Requests | 限流 |
| 500 | Server Error | 服务器错误 |

## 3. 接口详细设计

### 3.1 用户认证 (Auth)

```
POST   /api/v1/auth/register        # 用户注册
POST   /api/v1/auth/login           # 用户登录
POST   /api/v1/auth/logout          # 登出
POST   /api/v1/auth/refresh         # 刷新 Token
GET    /api/v1/auth/profile         # 获取用户信息
PUT    /api/v1/auth/profile         # 更新用户信息
```

**登录请求:**
```json
POST /api/v1/auth/login
{
  "username": "user@example.com",
  "password": "encrypted_password"
}
```

**登录响应:**
```json
{
  "code": 200,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600,
    "user": {
      "id": "user_abc123",
      "username": "hydrologist",
      "role": "expert",
      "organization": "Water Resources Institute"
    }
  }
}
```

### 3.2 模型管理 (Models)

```
GET    /api/v1/models               # 模型列表
POST   /api/v1/models               # 创建模型
GET    /api/v1/models/{id}          # 模型详情
PUT    /api/v1/models/{id}          # 更新模型
DELETE /api/v1/models/{id}          # 删除模型
POST   /api/v1/models/{id}/versions # 发布新版本
GET    /api/v1/models/{id}/versions # 版本列表
POST   /api/v1/models/{id}/validate # 验证模型
GET    /api/v1/models/{id}/reviews  # 获取评价
POST   /api/v1/models/{id}/reviews  # 提交评价
```

**创建模型:**
```json
POST /api/v1/models
{
  "name": "SWAT Basin Model",
  "description": "Soil and Water Assessment Tool for river basin",
  "category": "hydrological",
  "tags": ["runoff", "sediment", "nutrient"],
  "docker_image": "hydro-platform/swat:v2.1.0",
  "interfaces": {
    "input": [
      {
        "name": "precipitation",
        "type": "timeseries",
        "format": "netcdf",
        "required": true,
        "schema": { ... }
      },
      {
        "name": "dem",
        "type": "raster",
        "format": "geotiff",
        "required": true
      }
    ],
    "output": [
      {
        "name": "runoff",
        "type": "timeseries",
        "format": "csv"
      }
    ]
  },
  "resources": {
    "cpu": 4,
    "memory": "8Gi",
    "storage": "50Gi",
    "gpu": 0
  },
  "parameters": [
    {
      "name": "cn2",
      "type": "number",
      "default": 75,
      "range": [35, 98],
      "description": "Curve number for moisture condition II"
    }
  ]
}
```

**模型验证结果:**
```json
POST /api/v1/models/{id}/validate
{
  "reference_data": "dataset_123",
  "metrics": ["nse", "rmse", "mae", "r2"]
}

// 响应
{
  "code": 200,
  "data": {
    "validation_id": "val_abc456",
    "status": "completed",
    "metrics": {
      "nse": 0.82,
      "rmse": 12.5,
      "mae": 8.3,
      "r2": 0.85
    },
    "details": {
      "nse": {
        "value": 0.82,
        "grade": "good",
        "threshold": { "excellent": 0.9, "good": 0.75, "fair": 0.5 }
      }
    },
    "completed_at": "2024-03-15T10:30:00Z"
  }
}
```

### 3.3 工作流管理 (Workflows)

```
GET    /api/v1/workflows            # 工作流列表
POST   /api/v1/workflows            # 创建工作流
GET    /api/v1/workflows/{id}       # 工作流详情
PUT    /api/v1/workflows/{id}       # 更新工作流
DELETE /api/v1/workflows/{id}       # 删除工作流
POST   /api/v1/workflows/{id}/run   # 执行工作流
GET    /api/v1/workflows/{id}/runs  # 执行历史
```

**工作流定义:**
```json
POST /api/v1/workflows
{
  "name": "Basin Simulation Chain",
  "description": "Multi-model coupling for basin water cycle",
  "nodes": [
    {
      "id": "node_1",
      "type": "model",
      "model_id": "model_precip_processing",
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node_2", 
      "type": "model",
      "model_id": "model_swat",
      "position": { "x": 300, "y": 100 }
    },
    {
      "id": "node_3",
      "type": "model", 
      "model_id": "model_routing",
      "position": { "x": 500, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "data_mapping": {
        "output.precip_processed": "input.precipitation"
      }
    },
    {
      "id": "edge_2",
      "source": "node_2",
      "target": "node_3",
      "data_mapping": {
        "output.runoff": "input.inflow"
      }
    }
  ],
  "schedule": {
    "type": "manual",
    "cron": null
  }
}
```

### 3.4 任务管理 (Tasks)

```
GET    /api/v1/tasks                # 任务列表
GET    /api/v1/tasks/{id}           # 任务详情
DELETE /api/v1/tasks/{id}           # 取消任务
GET    /api/v1/tasks/{id}/logs      # 任务日志
GET    /api/v1/tasks/{id}/outputs   # 输出文件
POST   /api/v1/tasks/{id}/retry     # 重试任务
```

**任务状态流转:**
```
PENDING → QUEUED → RUNNING → COMPLETED
              ↓         ↓
         CANCELLED  FAILED → RETRY → QUEUED
```

**任务详情响应:**
```json
{
  "code": 200,
  "data": {
    "id": "task_xyz789",
    "workflow_id": "wf_abc123",
    "status": "running",
    "progress": 65,
    "current_node": "node_2",
    "resources": {
      "cpu_used": 3.5,
      "memory_used": "6.2Gi",
      "runtime": "00:25:30"
    },
    "timeline": [
      { "status": "pending", "timestamp": "2024-03-15T10:00:00Z" },
      { "status": "queued", "timestamp": "2024-03-15T10:00:05Z" },
      { "status": "running", "timestamp": "2024-03-15T10:00:10Z" }
    ],
    "outputs": {
      "node_1": {
        "precip_processed": "s3://bucket/outputs/task_xyz789/node_1/precip.nc"
      }
    }
  }
}
```

### 3.5 可视化服务 (Visualization)

```
GET    /api/v1/visualization/scenes         # 场景列表
POST   /api/v1/visualization/scenes         # 创建场景
GET    /api/v1/visualization/scenes/{id}    # 场景详情
GET    /api/v1/visualization/scenes/{id}/ws # WebSocket 实时数据
POST   /api/v1/visualization/layers         # 添加图层
GET    /api/v1/visualization/tiles/{z}/{x}/{y}  # 地图瓦片
```

**创建可视化场景:**
```json
POST /api/v1/visualization/scenes
{
  "name": "Yangtze River Basin",
  "basemap": {
    "type": "cesium_terrain",
    "url": "/terrain/yangtze"
  },
  "viewport": {
    "longitude": 111.5,
    "latitude": 30.5,
    "height": 50000,
    "heading": 0,
    "pitch": -45
  },
  "layers": [
    {
      "id": "layer_1",
      "name": "Digital Elevation",
      "type": "raster",
      "source": {
        "type": "s3",
        "bucket": "hydro-data",
        "key": "dem/yangtze_30m.tif"
      },
      "style": {
        "colormap": "terrain",
        "opacity": 0.8
      }
    },
    {
      "id": "layer_2",
      "name": "River Network",
      "type": "vector",
      "source": {
        "type": "geojson",
        "url": "/api/v1/data/rivers/yangtze"
      },
      "style": {
        "color": "#0066cc",
        "width": 2
      }
    }
  ],
  "particles": {
    "enabled": true,
    "type": "rainfall",
    "data_source": "task_xyz789"
  }
}
```

### 3.6 教学工具 (Teaching)

```
GET    /api/v1/teaching/experiments       # 实验列表
POST   /api/v1/teaching/experiments       # 创建实验
POST   /api/v1/teaching/experiments/{id}/run   # 运行实验
GET    /api/v1/teaching/experiments/{id}/results  # 实验结果
POST   /api/v1/teaching/presentations     # 创建演示
GET    /api/v1/teaching/presentations/{id}/export # 导出演示
```

**参数敏感性分析:**
```json
POST /api/v1/teaching/experiments
{
  "name": "CN2 Parameter Sensitivity",
  "type": "sensitivity_analysis",
  "base_model": "model_swat_001",
  "parameter": {
    "name": "cn2",
    "base_value": 75,
    "range": [50, 100],
    "steps": 10
  },
  "fixed_parameters": {
    "alpha_bf": 0.48,
    "gw_delay": 31
  },
  "output_metric": "runoff",
  "evaluation_period": {
    "start": "2020-01-01",
    "end": "2020-12-31"
  }
}
```

## 4. WebSocket 实时接口

### 4.1 任务状态推送

```
WS /ws/v1/tasks/{task_id}

// 消息类型
{
  "type": "status_update",
  "data": {
    "status": "running",
    "progress": 65,
    "current_step": "calculating_runoff",
    "message": "Processing sub-basin 15/30"
  }
}

{
  "type": "log",
  "data": {
    "level": "info",
    "timestamp": "2024-03-15T10:25:30Z",
    "message": "Convergence achieved at iteration 150"
  }
}
```

### 4.2 3D 场景实时数据

```
WS /ws/v1/visualization/scenes/{scene_id}

// 时间轴播放
{
  "type": "time_update",
  "data": {
    "timestamp": "2020-07-15T08:00:00Z",
    "layers": {
      "layer_1": {
        "url": "s3://bucket/tiles/20200715_0800/{z}/{x}/{y}.png"
      }
    }
  }
}

// 粒子系统更新
{
  "type": "particles_update",
  "data": {
    "rainfall": {
      "intensity": 15.5,
      "coverage": 0.6,
      "direction": [0, -1, 0]
    }
  }
}
```

## 5. 错误码定义

| 错误码 | 说明 | HTTP 状态 |
|-------|------|----------|
| 1001 | 参数验证失败 | 400 |
| 1002 | 资源不存在 | 404 |
| 1003 | 资源冲突 | 409 |
| 1004 | 权限不足 | 403 |
| 2001 | 模型执行失败 | 422 |
| 2002 | 模型验证失败 | 422 |
| 2003 | 模型版本不兼容 | 422 |
| 3001 | 任务执行超时 | 422 |
| 3002 | 资源不足 | 422 |
| 3003 | 调度失败 | 500 |
| 9000 | 内部服务器错误 | 500 |

## 6. 分页与过滤

### 6.1 分页参数

```
GET /api/v1/models?page=1&page_size=20
GET /api/v1/models?cursor=abc123&limit=20
```

### 6.2 过滤参数

```
GET /api/v1/models?category=hydrological&tags=runoff,sediment
GET /api/v1/tasks?status=running&created_after=2024-03-01
GET /api/v1/models?sort=-created_at&sort=name
```

### 6.3 搜索参数

```
GET /api/v1/models?q=SWAT basin
GET /api/v1/models?search_fields=name,description,tags
```
