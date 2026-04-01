# 部署方案

## 1. 部署架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               负载均衡层                                      │
│                    ┌─────────┐         ┌─────────┐                          │
│                    │   CDN   │         │  WAF    │                          │
│                    │(静态资源)│         │(安全防护)│                          │
│                    └────┬────┘         └────┬────┘                          │
│                         └───────────────────┘                                │
│                                     │                                        │
│                              ┌──────┴──────┐                                 │
│                              │  Cloud LB   │                                 │
│                              │ (Kong/ALB)  │                                 │
│                              └──────┬──────┘                                 │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼───────────────────────────────────────┐
│                            Kubernetes 集群                                   │
│  ┌──────────────────────────────────┼──────────────────────────────────┐   │
│  │                          Ingress Controller                        │   │
│  └──────────────────────────────────┼──────────────────────────────────┘   │
│                                     │                                       │
│  ┌──────────────────────────────────┼──────────────────────────────────┐   │
│  │                            服务网格 (可选)                           │   │
│  │                            Istio/Linkerd                           │   │
│  └──────────────────────────────────┼──────────────────────────────────┘   │
│                                     │                                       │
│  ┌──────────────────────────────────┼──────────────────────────────────┐   │
│  │                              应用服务层                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │   │
│  │  │   API    │ │  Model   │ │ Scheduler│ │   Viz    │              │   │
│  │  │ Gateway  │ │  Mgmt    │ │  Engine  │ │ Service  │              │   │
│  │  │ (3副本)  │ │ (3副本)  │ │ (3副本)  │ │ (2副本)  │              │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │   │
│  │  │  Auth    │ │ Teaching │ │ WebSocket│                          │   │
│  │  │ Service  │ │ Service  │ │  Gateway │                          │   │
│  │  └──────────┘ └──────────┘ └──────────┘                          │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                            数据处理层                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │   │
│  │  │  Kafka   │ │ RabbitMQ │ │ Celery   │ │  Flink   │              │   │
│  │  │(消息队列) │ │(任务队列) │ │(任务执行)│ │(流处理)  │              │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                            数据存储层                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │   │
│  │  │PostgreSQL│ │  Redis   │ │  MinIO   │ │   ES     │              │   │
│  │  │(主从集群) │ │ (Cluster)│ │  (分布式)│ │ (集群)   │              │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │   │
│  │  ┌──────────┐ ┌──────────┐                                         │   │
│  │  │TimescaleDB│ │ ClickHouse│ (可选，大数据分析)                    │   │
│  │  └──────────┘ └──────────┘                                         │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┼───────────────────────────────────┐
│                          计算资源层 (HPC/云端)                             │
│  ┌──────────────────────────────────┼─────────────────────────────────┐ │
│  │                      Kubernetes 计算集群                           │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │                    GPU 节点池 (可选)                         │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │  │ │
│  │  │  │ GPU Node │ │ GPU Node │ │ GPU Node │                   │  │ │
│  │  │  │ (NVIDIA) │ │ (NVIDIA) │ │ (NVIDIA) │                   │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘                   │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │                    CPU 计算节点池                            │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │ │
│  │  │  │CPU Node  │ │CPU Node  │ │CPU Node  │ │CPU Node  │       │  │ │
│  │  │  │(32c128g) │ │(32c128g) │ │(32c128g) │ │(32c128g) │       │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      超算中心对接 (Slurm/PBS)                     │ │
│  │              通过专用网关提交大规模并行计算任务                    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

## 2. 环境规划

### 2.1 环境划分

| 环境 | 用途 | 规模 | 数据保留 |
|-----|------|------|---------|
| Development | 开发测试 | 单节点 K8s | 每周清理 |
| Staging | 集成测试 | 3节点 K8s | 每月清理 |
| Production | 生产环境 | 7+节点 K8s | 长期保留 |
| HPC | 超算对接 | 按需 | 任务完成后清理 |

### 2.2 资源配置

#### 生产环境最小配置

| 组件 | 实例数 | CPU/实例 | 内存/实例 | 存储 |
|-----|-------|---------|----------|------|
| API Gateway | 3 | 2核 | 4Gi | 50GB |
| Model Management | 3 | 4核 | 8Gi | 100GB |
| Scheduler | 3 | 4核 | 8Gi | 100GB |
| Visualization | 2 | 4核 | 16Gi | 200GB |
| Auth Service | 2 | 2核 | 4Gi | 50GB |
| WebSocket GW | 2 | 2核 | 4Gi | 50GB |
| PostgreSQL | 3 | 8核 | 32Gi | 1TB SSD |
| Redis | 3 | 4核 | 16Gi | 100GB |
| MinIO | 4 | 4核 | 8Gi | 10TB |
| Elasticsearch | 3 | 8核 | 32Gi | 2TB SSD |
| Kafka | 3 | 8核 | 16Gi | 1TB |

#### 计算节点池

| 类型 | 节点数 | CPU | 内存 | GPU | 用途 |
|-----|-------|-----|------|-----|------|
| Standard | 5-20 | 32核 | 128Gi | - | 常规模型计算 |
| High-Mem | 2-10 | 32核 | 512Gi | - | 大规模数据处理 |
| GPU | 0-5 | 32核 | 256Gi | 8xA100 | AI/ML 模型 |

## 3. Kubernetes 部署配置

### 3.1 Namespace 划分

```yaml
# 基础服务
apiVersion: v1
kind: Namespace
metadata:
  name: hydro-platform-infra
  labels:
    environment: production
    tier: infrastructure

# 应用服务  
apiVersion: v1
kind: Namespace
metadata:
  name: hydro-platform-app
  labels:
    environment: production
    tier: application

# 计算任务
apiVersion: v1
kind: Namespace
metadata:
  name: hydro-platform-compute
  labels:
    environment: production
    tier: compute
    pod-security.kubernetes.io/enforce: restricted
```

### 3.2 核心服务 Deployment

```yaml
# API Gateway 部署
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: hydro-platform-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: gateway
        image: hydro-platform/api-gateway:v1.0.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8443
          name: https
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        - name: REDIS_HOST
          value: redis-cluster.hydro-platform-infra.svc.cluster.local
        - name: KAFKA_BROKERS
          value: kafka:9092
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /app/config
        - name: tls
          mountPath: /app/tls
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: api-gateway-config
      - name: tls
        secret:
          secretName: api-gateway-tls
```

### 3.3 HPA 自动伸缩

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: hydro-platform-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### 3.4 计算任务专用节点池

```yaml
# 计算任务节点池配置
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: compute-pool
spec:
  template:
    spec:
      requirements:
      - key: node.kubernetes.io/instance-type
        operator: In
        values: ["c7.2xlarge", "c7.4xlarge", "r7.2xlarge"]
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot", "on-demand"]
      taints:
      - key: dedicated
        value: compute
        effect: NoSchedule
  limits:
    cpu: 1000
    memory: 4000Gi
  disruption:
    consolidationPolicy: WhenEmpty
    consolidateAfter: 30s
    expireAfter: 720h
---
# 计算任务 Pod 调度
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-executor
  namespace: hydro-platform-compute
spec:
  template:
    spec:
      nodeSelector:
        node-type: compute
      tolerations:
      - key: dedicated
        operator: Equal
        value: compute
        effect: NoSchedule
      containers:
      - name: executor
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "64Gi"
            cpu: "32"
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
```

## 4. 数据存储部署

### 4.1 PostgreSQL 集群 (使用 CloudNativePG)

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: hydro-platform-db
  namespace: hydro-platform-infra
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2
  storage:
    size: 500Gi
    storageClass: premium-rwo
  postgresql:
    parameters:
      max_connections: "500"
      shared_buffers: "8GB"
      effective_cache_size: "24GB"
  resources:
    requests:
      memory: "16Gi"
      cpu: "4"
    limits:
      memory: "32Gi"
      cpu: "8"
  monitoring:
    enabled: true
    customQueriesConfigMap:
      name: cnpg-custom-queries
  backup:
    enabled: true
    retentionPolicy: "30d"
    schedule: "0 2 * * *"
    barmanObjectStore:
      destinationPath: "s3://hydro-platform-backups/postgresql"
      s3Credentials:
        accessKeyId:
          name: backup-s3-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-s3-credentials
          key: ACCESS_SECRET_KEY
```

### 4.2 Redis Cluster

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: hydro-platform-infra
spec:
  clusterSize: 3
  kubernetesConfig:
    image: redis:7.2-alpine
    resources:
      requests:
        cpu: 2000m
        memory: 16Gi
      limits:
        cpu: 4000m
        memory: 32Gi
  redisExporter:
    enabled: true
  storage:
    type: persistent-claim
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
```

### 4.3 MinIO 分布式存储

```yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: hydro-platform-storage
  namespace: hydro-platform-infra
spec:
  pools:
  - servers: 4
    volumesPerServer: 4
    volumeClaimTemplate:
      metadata:
        name: data
      spec:
        storageClassName: standard
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 2.5Ti
  credsSecret:
    name: minio-credentials
  configuration:
    name: minio-configuration
  mountPath: /export
```

## 5. 监控与日志

### 5.1 Prometheus + Grafana

```yaml
# Prometheus ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hydro-platform-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      monitoring: enabled
  namespaceSelector:
    matchNames:
    - hydro-platform-app
    - hydro-platform-infra
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
```

### 5.2 关键监控指标

| 类别 | 指标 | 告警阈值 |
|-----|------|---------|
| 应用 | API 响应时间 P99 | > 500ms |
| 应用 | 错误率 | > 1% |
| 数据库 | 连接数使用率 | > 80% |
| 存储 | 磁盘使用率 | > 85% |
| 计算 | 队列等待时间 | > 10min |
| 集群 | 节点 CPU 使用率 | > 90% |
| 集群 | Pod 重启次数 | > 3次/小时 |

### 5.3 日志收集 (Loki)

```yaml
apiVersion: logging.grafana.com/v1alpha1
kind: PodLogConfig
metadata:
  name: hydro-platform-logs
  namespace: logging
spec:
  selectors:
  - namespace: hydro-platform-app
    podSelector: {}
  - namespace: hydro-platform-compute
    podSelector: {}
  output:
    loki:
      url: http://loki:3100
      labels:
        app: '{{ .PodLabels.app }}'
        namespace: '{{ .Namespace }}'
```

## 6. CI/CD 流程

### 6.1 GitLab CI 配置

```yaml
stages:
  - build
  - test
  - security
  - deploy

variables:
  DOCKER_REGISTRY: registry.hydro-platform.io
  KUBE_NAMESPACE: hydro-platform-app

build:
  stage: build
  script:
    - docker build -t $DOCKER_REGISTRY/$CI_PROJECT_NAME:$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY/$CI_PROJECT_NAME:$CI_COMMIT_SHA
  only:
    - main
    - develop

test:
  stage: test
  script:
    - go test -v ./...
    - go test -race ./...
  coverage: '/coverage: \d+\.\d+% of statements/'

deploy-staging:
  stage: deploy
  script:
    - kubectl set image deployment/$CI_PROJECT_NAME
        app=$DOCKER_REGISTRY/$CI_PROJECT_NAME:$CI_COMMIT_SHA
        -n $KUBE_NAMESPACE-staging
  environment:
    name: staging
  only:
    - develop

deploy-production:
  stage: deploy
  script:
    - kubectl set image deployment/$CI_PROJECT_NAME
        app=$DOCKER_REGISTRY/$CI_PROJECT_NAME:$CI_COMMIT_SHA
        -n $KUBE_NAMESPACE
  environment:
    name: production
  when: manual
  only:
    - main
```

### 6.2 GitOps (ArgoCD)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hydro-platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/hydro-platform/gitops.git
    targetRevision: HEAD
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: hydro-platform-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

## 7. 备份与灾难恢复

### 7.1 备份策略

| 数据类型 | 频率 | 保留期 | 存储位置 |
|---------|------|-------|---------|
| 数据库全量 | 每日 | 30天 | S3 冷存储 |
| 数据库增量 | 每小时 | 7天 | S3 标准 |
| 对象存储 | 实时复制 | 永久 | 跨区域 S3 |
| 配置文件 | 每次变更 | 永久 | Git + S3 |

### 7.2 灾难恢复 RTO/RPO

| 场景 | RTO | RPO |
|-----|-----|-----|
| 单 Pod 故障 | 0s (自动) | 0 |
| 单节点故障 | 5min | 0 |
| 可用区故障 | 15min | 5min |
| 区域故障 | 4h | 1h |
| 数据误删 | 2h | 取决于备份 |

## 8. 安全加固

### 8.1 网络安全

```yaml
# NetworkPolicy - 服务间访问控制
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-gateway-policy
  namespace: hydro-platform-app
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: backend
  - to:
    - namespaceSelector:
        matchLabels:
          name: hydro-platform-infra
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
```

### 8.2 Pod 安全策略

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    resources:
      limits:
        memory: "512Mi"
        cpu: "500m"
```

## 9. 部署检查清单

### 部署前检查

- [ ] 镜像版本正确且已推送
- [ ] 配置文件已更新 (ConfigMap/Secret)
- [ ] 数据库迁移脚本已准备
- [ ] 回滚方案已确认
- [ ] 监控告警已配置

### 部署后检查

- [ ] Pod 状态 Running
- [ ] 服务健康检查通过
- [ ] 日志正常输出
- [ ] 监控指标上报正常
- [ ] 关键业务流程验证通过
