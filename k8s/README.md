# Kubernetes 部署

本目录包含流域水系统模拟模型平台的 Kubernetes 部署配置。

## 目录结构

```
k8s/
├── deployment/           # 应用部署配置
│   ├── backend-deployment.yaml    # 后端服务部署
│   ├── frontend-deployment.yaml   # 前端服务部署
│   ├── backend-configmap.yaml     # 后端配置
│   ├── hpa.yaml                   # 水平自动伸缩配置
│   ├── infrastructure.yaml        # 数据库和中间件
│   ├── ingress.yaml               # Ingress 配置
│   └── rbac.yaml                  # RBAC 权限配置
├── monitoring/           # 监控配置
│   ├── prometheus.yaml            # Prometheus 部署
│   └── grafana.yaml               # Grafana 部署
└── operator/             # Kubernetes Operator
    ├── crd-model.yaml
    └── operator.yaml
```

## 快速开始

### 1. 创建命名空间

```bash
kubectl apply -f k8s/deployment/rbac.yaml
```

### 2. 部署基础设施

```bash
# 部署 PostgreSQL, Redis, RabbitMQ
kubectl apply -f k8s/deployment/infrastructure.yaml
```

### 3. 部署应用配置

```bash
# 部署 ConfigMap 和 Secret
kubectl apply -f k8s/deployment/backend-configmap.yaml
```

### 4. 部署后端和前端

```bash
kubectl apply -f k8s/deployment/backend-deployment.yaml
kubectl apply -f k8s/deployment/frontend-deployment.yaml
```

### 5. 部署 HPA（水平自动伸缩）

```bash
kubectl apply -f k8s/deployment/hpa.yaml
```

### 6. 部署 Ingress

```bash
kubectl apply -f k8s/deployment/ingress.yaml
```

### 7. 部署监控

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
```

## 一键部署

```bash
# 部署所有资源
kubectl apply -f k8s/deployment/
kubectl apply -f k8s/monitoring/

# 查看部署状态
kubectl get all -n watershed-system
kubectl get all -n watershed-monitoring
```

## 访问服务

### 添加 hosts 记录

```bash
# Linux/Mac
sudo echo "127.0.0.1 watershed.local grafana.watershed.local" >> /etc/hosts

# Windows (以管理员身份运行 PowerShell)
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "127.0.0.1 watershed.local grafana.watershed.local"
```

### 访问地址

| 服务 | URL | 说明 |
|------|-----|------|
| 前端应用 | http://watershed.local | 主应用入口 |
| API | http://watershed.local/api | 后端 API |
| Grafana | http://grafana.watershed.local | 监控面板 |
| Prometheus | kubectl port-forward svc/prometheus 9090:9090 -n watershed-monitoring | 指标查询 |

### 端口转发（本地调试）

```bash
# 后端服务
kubectl port-forward svc/watershed-backend 8080:8080 -n watershed-system

# 前端服务
kubectl port-forward svc/watershed-frontend 3000:3000 -n watershed-system

# Grafana
kubectl port-forward svc/grafana 3000:3000 -n watershed-monitoring

# Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n watershed-monitoring
```

## 扩缩容

### 手动扩缩容

```bash
# 扩容后端到 5 个副本
kubectl scale deployment watershed-backend --replicas=5 -n watershed-system

# 扩容前端到 3 个副本
kubectl scale deployment watershed-frontend --replicas=3 -n watershed-system
```

### 自动扩缩容（HPA）

```bash
# 查看 HPA 状态
kubectl get hpa -n watershed-system

# 查看 HPA 详情
kubectl describe hpa watershed-backend-hpa -n watershed-system
```

HPA 配置：
- **后端**: CPU > 70% 或 内存 > 80% 时自动扩容，最小 2 副本，最大 10 副本
- **前端**: CPU > 70% 时自动扩容，最小 2 副本，最大 5 副本

## 监控和日志

### 查看日志

```bash
# 后端日志
kubectl logs -f deployment/watershed-backend -n watershed-system

# 前端日志
kubectl logs -f deployment/watershed-frontend -n watershed-system

# 查看特定 Pod 日志
kubectl logs -f pod/<pod-name> -n watershed-system
```

### 查看指标

```bash
# 查看 Pod 资源使用
kubectl top pod -n watershed-system

# 查看节点资源使用
kubectl top node
```

### Grafana 登录

- URL: http://grafana.watershed.local
- 用户名: admin
- 密码: admin123

## 更新部署

```bash
# 更新镜像
kubectl set image deployment/watershed-backend backend=watershed/backend:v1.1.0 -n watershed-system

# 滚动重启
kubectl rollout restart deployment/watershed-backend -n watershed-system

# 查看滚动状态
kubectl rollout status deployment/watershed-backend -n watershed-system

# 回滚到上一个版本
kubectl rollout undo deployment/watershed-backend -n watershed-system
```

## 清理资源

```bash
# 删除所有部署
kubectl delete -f k8s/deployment/
kubectl delete -f k8s/monitoring/

# 删除命名空间（会删除所有资源）
kubectl delete namespace watershed-system
kubectl delete namespace watershed-monitoring
```

## 故障排查

### Pod 无法启动

```bash
# 查看 Pod 事件
kubectl describe pod <pod-name> -n watershed-system

# 查看 Pod 日志
kubectl logs <pod-name> -n watershed-system --previous
```

### HPA 不工作

```bash
# 检查 metrics-server 是否安装
kubectl get apiservices | grep metrics

# 查看 HPA 事件
kubectl describe hpa watershed-backend-hpa -n watershed-system
```

### 服务无法访问

```bash
# 检查 Service 端点
kubectl get endpoints -n watershed-system

# 检查 Ingress 配置
kubectl describe ingress watershed-ingress -n watershed-system
```
