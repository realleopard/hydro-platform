# 数据库设计文档

## 1. 数据库选型

| 数据库 | 用途 | 版本 |
|-------|------|------|
| PostgreSQL 16 | 主数据库 | 关系型数据存储 |
| Redis 7 | 缓存 & 消息 | 会话、热点数据、实时状态 |
| TimescaleDB | 时序数据 | 水文传感器数据、模拟结果 |
| MinIO | 对象存储 | 模型文件、输入输出数据 |
| Elasticsearch | 搜索 & 日志 | 全文检索、审计日志 |

---

## 2. PostgreSQL 核心 Schema

### 2.1 用户与权限模块

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    organization VARCHAR(200),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'expert', 'user', 'student')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 组织表
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    logo_url TEXT,
    parent_id UUID REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户组织关联
CREATE TABLE user_organizations (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, organization_id)
);

-- API Token 管理
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 模型管理模块

```sql
-- 模型分类
CREATE TABLE model_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES model_categories(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 模型表
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES model_categories(id),
    owner_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Docker 镜像信息
    docker_image VARCHAR(255) NOT NULL,
    docker_image_digest VARCHAR(255),
    
    -- 接口定义
    interfaces JSONB NOT NULL DEFAULT '{"input": [], "output": []}',
    
    -- 资源需求
    resources JSONB DEFAULT '{"cpu": 1, "memory": "2Gi", "storage": "10Gi", "gpu": 0}',
    
    -- 参数定义
    parameters JSONB DEFAULT '[]',
    
    -- 版本控制
    current_version VARCHAR(50) DEFAULT '0.1.0',
    version_count INTEGER DEFAULT 1,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'deprecated', 'archived')),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'organization', 'private')),
    
    -- 统计
    download_count INTEGER DEFAULT 0,
    run_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(2,1),
    rating_count INTEGER DEFAULT 0,
    
    -- 标签
    tags TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- 模型版本表
CREATE TABLE model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    docker_image VARCHAR(255) NOT NULL,
    docker_image_digest VARCHAR(255),
    interfaces JSONB,
    parameters JSONB,
    changelog TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, version)
);

-- 模型评价表
CREATE TABLE model_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    metrics JSONB, -- 存储 NSE, RMSE 等验证指标
    is_verified BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, user_id)
);

-- 模型验证记录
CREATE TABLE model_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    version_id UUID REFERENCES model_versions(id),
    validator_id UUID REFERENCES users(id),
    reference_dataset_id UUID,
    metrics JSONB, -- {nse: 0.82, rmse: 12.5, ...}
    status VARCHAR(20) DEFAULT 'pending',
    report_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### 2.3 工作流与任务模块

```sql
-- 工作流表
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- 工作流定义 (DAG)
    definition JSONB NOT NULL, -- {nodes: [...], edges: [...]}
    
    -- 调度配置
    schedule_type VARCHAR(20) DEFAULT 'manual' CHECK (schedule_type IN ('manual', 'cron', 'event')),
    schedule_config JSONB, -- {cron: '0 0 * * *', timezone: 'Asia/Shanghai'}
    
    -- 输入参数模板
    input_parameters JSONB,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    
    -- 统计
    run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务表 (工作流执行实例)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    name VARCHAR(200),
    
    -- 执行状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER CHECK (progress >= 0 AND progress <= 100),
    
    -- 输入输出
    inputs JSONB, -- 实际输入参数
    outputs JSONB, -- 输出文件路径
    
    -- 资源使用
    resource_usage JSONB, -- {cpu_seconds: 3600, memory_max: "8Gi", runtime_seconds: 7200}
    
    -- 执行信息
    triggered_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务节点执行详情
CREATE TABLE task_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL, -- workflow definition 中的 node id
    model_id UUID REFERENCES models(id),
    
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    
    -- 执行信息
    container_id VARCHAR(100),
    pod_name VARCHAR(100),
    node_hostname VARCHAR(100),
    
    -- 资源使用
    resource_usage JSONB,
    
    -- 输入输出
    inputs JSONB,
    outputs JSONB,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务日志 (热点数据，可迁移到 ES)
CREATE TABLE task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    node_id VARCHAR(100),
    level VARCHAR(10) CHECK (level IN ('debug', 'info', 'warning', 'error')),
    message TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- 创建分区表
CREATE TABLE task_logs_2024_q1 PARTITION OF task_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

### 2.4 可视化模块

```sql
-- 可视化场景
CREATE TABLE visualization_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- 视口配置
    viewport JSONB, -- {longitude, latitude, height, heading, pitch}
    
    -- 基础图层
    basemap_config JSONB,
    
    -- 图层列表
    layers JSONB DEFAULT '[]',
    
    -- 粒子特效配置
    particles_config JSONB,
    
    -- 时间轴配置
    timeline_config JSONB,
    
    -- 关联数据
    data_sources JSONB, -- [{type: 'task', id: 'xxx'}, ...]
    
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 数据集 (输入/输出数据)
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    
    -- 数据类型
    data_type VARCHAR(50) CHECK (data_type IN ('timeseries', 'raster', 'vector', 'netcdf', 'csv', 'geotiff', 'shapefile')),
    
    -- 存储信息
    storage_type VARCHAR(20) DEFAULT 's3' CHECK (storage_type IN ('s3', 'local', 'nfs')),
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    checksum VARCHAR(64),
    
    -- 元数据
    metadata JSONB, -- {crs, bbox, time_range, variables, ...}
    
    -- 时空范围 (用于查询优化)
    spatial_bounds GEOMETRY(Polygon, 4326),
    temporal_start TIMESTAMPTZ,
    temporal_end TIMESTAMPTZ,
    
    -- 统计
    download_count INTEGER DEFAULT 0,
    
    visibility VARCHAR(20) DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 空间索引
CREATE INDEX idx_datasets_spatial ON datasets USING GIST(spatial_bounds);
CREATE INDEX idx_datasets_temporal ON datasets(temporal_start, temporal_end);
```

### 2.5 教学模块

```sql
-- 虚拟实验
CREATE TABLE teaching_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    course_id UUID, -- 关联课程
    instructor_id UUID REFERENCES users(id),
    
    -- 实验配置
    experiment_type VARCHAR(50) CHECK (experiment_type IN ('sensitivity_analysis', 'parameter_optimization', 'scenario_comparison')),
    base_model_id UUID REFERENCES models(id),
    
    -- 实验参数
    configuration JSONB, -- {parameter, range, steps, fixed_parameters, ...}
    
    -- 教学资源
    instructions TEXT,
    resources JSONB, -- [{type: 'video', url: '...'}, ...]
    
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学生实验记录
CREATE TABLE student_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES teaching_experiments(id),
    student_id UUID REFERENCES users(id),
    
    -- 学生提交的参数
    submitted_parameters JSONB,
    
    -- 运行结果
    results JSONB,
    task_id UUID REFERENCES tasks(id),
    
    -- 评分
    score INTEGER,
    feedback TEXT,
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 演示文稿
CREATE TABLE teaching_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    owner_id UUID REFERENCES users(id),
    
    -- 幻灯片列表
    slides JSONB DEFAULT '[]', -- [{id, type, content, annotations, ...}]
    
    -- 3D 场景集成
    scene_id UUID REFERENCES visualization_scenes(id),
    
    -- 播放配置
    playback_config JSONB,
    
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.6 审计日志

```sql
-- 操作审计日志
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- create, update, delete, run, etc.
    resource_type VARCHAR(50) NOT NULL, -- model, workflow, task, etc.
    resource_id UUID,
    
    -- 变更详情
    old_values JSONB,
    new_values JSONB,
    
    -- 请求信息
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    
    timestamp TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- 索引
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp);
```

---

## 3. Redis 数据结构

### 3.1 会话管理

```
Key: session:{session_id}
Type: Hash
Fields:
  - user_id
  - username
  - role
  - created_at
  - expires_at
TTL: 3600s
```

### 3.2 任务实时状态

```
Key: task:{task_id}:status
Type: Hash
Fields:
  - status
  - progress
  - current_node
  - message
  - updated_at
TTL: 86400s

Key: task:{task_id}:logs
Type: List
Value: JSON strings of log entries
Max length: 1000
```

### 3.3 热点数据缓存

```
Key: model:{model_id}:info
Type: String (JSON)
TTL: 300s

Key: models:popular
Type: Sorted Set
Score: download_count
Member: model_id

Key: models:recent
Type: List
Max length: 100
```

### 3.4 限流计数

```
Key: rate_limit:{user_id}:{api_endpoint}
Type: String (Counter)
TTL: 60s
```

---

## 4. TimescaleDB 时序数据

```sql
-- 传感器数据表
CREATE TABLE sensor_data (
    time TIMESTAMPTZ NOT NULL,
    sensor_id VARCHAR(100) NOT NULL,
    station_id VARCHAR(100) NOT NULL,
    variable VARCHAR(50) NOT NULL, -- precipitation, flow, level, etc.
    value DOUBLE PRECISION,
    quality_flag VARCHAR(20),
    metadata JSONB
);

-- 转换为超表
SELECT create_hypertable('sensor_data', 'time', chunk_time_interval => INTERVAL '1 day');

-- 模拟结果时序数据
CREATE TABLE simulation_results (
    time TIMESTAMPTZ NOT NULL,
    task_id UUID NOT NULL,
    node_id VARCHAR(100),
    variable VARCHAR(50) NOT NULL, -- runoff, sediment, etc.
    value DOUBLE PRECISION,
    unit VARCHAR(20),
    location GEOMETRY(Point, 4326)
);

SELECT create_hypertable('simulation_results', 'time', chunk_time_interval => INTERVAL '1 week');

-- 索引
CREATE INDEX idx_sensor_data_sensor ON sensor_data(sensor_id, time DESC);
CREATE INDEX idx_sensor_data_station ON sensor_data(station_id, variable, time DESC);
CREATE INDEX idx_simulation_task ON simulation_results(task_id, variable, time DESC);
```

---

## 5. 索引策略

```sql
-- 常用查询索引
CREATE INDEX idx_models_owner ON models(owner_id) WHERE status = 'published';
CREATE INDEX idx_models_category ON models(category_id, status);
CREATE INDEX idx_models_tags ON models USING GIN(tags);
CREATE INDEX idx_models_search ON models USING GIN(to_tsvector('chinese', name || ' ' || COALESCE(description, '')));

CREATE INDEX idx_tasks_status ON tasks(status, created_at DESC);
CREATE INDEX idx_tasks_workflow ON tasks(workflow_id, created_at DESC);
CREATE INDEX idx_tasks_owner ON tasks(triggered_by, created_at DESC);

CREATE INDEX idx_workflows_owner ON workflows(owner_id, status);
CREATE INDEX idx_datasets_owner ON datasets(owner_id, data_type);

-- 时间序列索引 (自动由 TimescaleDB 管理)
-- 分区表索引
CREATE INDEX idx_task_logs_task ON task_logs(task_id, timestamp DESC);
CREATE INDEX idx_audit_logs_time ON audit_logs(timestamp DESC);
```

---

## 6. 数据归档策略

| 表名 | 保留策略 | 归档方式 |
|-----|---------|---------|
| task_logs | 90天 | 自动分区，过期删除 |
| audit_logs | 1年 | 归档到冷存储 |
| simulation_results | 6个月 | 压缩存储 |
| sensor_data | 永久 | 分层存储 |
| tasks | 2年 | 软删除，定期清理 |
