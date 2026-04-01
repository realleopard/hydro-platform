# Watershed Model SDK

流域水系统模拟模型平台 Python SDK

## 安装

```bash
pip install watershed-sdk
```

安装完整功能：

```bash
pip install watershed-sdk[full]
```

## 快速开始

### 1. 创建简单模型

```python
from watershed_sdk import BaseModel, ModelConfig, Parameter, Variable
import numpy as np

class RainfallRunoffModel(BaseModel):
    def __init__(self):
        config = ModelConfig(
            name="rainfall_runoff",
            version="1.0.0",
            description="降雨径流模型",
            parameters=[
                Parameter(
                    name="cn",
                    type="float",
                    default=65,
                    min_value=30,
                    max_value=100,
                    description="曲线号"
                ),
            ],
            inputs=[
                Variable(
                    name="rainfall",
                    type="timeseries",
                    data_type="float",
                    description="降雨量(mm)",
                    unit="mm"
                ),
            ],
            outputs=[
                Variable(
                    name="runoff",
                    type="timeseries",
                    data_type="float",
                    description="径流量(mm)",
                    unit="mm"
                ),
            ]
        )
        super().__init__(config)

    def run(self):
        self._pre_run()

        # 简化的 SCS CN 方法
        rainfall = self.inputs["rainfall"]
        cn = self.parameters["cn"]

        s = 25400 / cn - 254  # 潜在最大保持量
        ia = 0.2 * s  # 初始损失

        runoff = []
        for p in rainfall:
            if p <= ia:
                q = 0
            else:
                q = (p - ia) ** 2 / (p - ia + s)
            runoff.append(q)

        self.outputs["runoff"] = np.array(runoff)
        self._post_run()
        return self

# 使用模型
model = RainfallRunoffModel()
model.set_parameters(cn=75)
model.set_inputs(rainfall=[10, 20, 30, 15, 5])
model.run()

print(model.get_outputs())
```

### 2. 本地执行

```python
from watershed_sdk import LocalExecutor

executor = LocalExecutor()
result = executor.run(
    model,
    inputs={"rainfall": [10, 20, 30]},
    parameters={"cn": 75}
)

print(f"输出目录: {result['output_dir']}")
```

### 3. 批量运行

```python
parameter_sets = [
    {"cn": 65},
    {"cn": 75},
    {"cn": 85},
]

results = executor.batch_run(
    model,
    parameter_sets,
    inputs={"rainfall": [10, 20, 30]},
    n_jobs=3
)
```

### 4. 模型验证

```python
from watershed_sdk import Validator

# 模拟值和观测值
simulated = model.get_outputs()["runoff"]
observed = [8.5, 15.2, 22.1]  # 实测径流

metrics = Validator.calculate_all(simulated, observed)
print(f"NSE: {metrics.nse:.4f}")
print(f"RMSE: {metrics.rmse:.4f}")
print(f"R²: {metrics.r2:.4f}")
```

### 5. 连接平台

```python
from watershed_sdk import PlatformClient

# 登录
client = PlatformClient(base_url="http://localhost:8080")
client.login("username", "password")

# 创建模型
model_info = client.create_model(
    name="我的降雨径流模型",
    description="基于 SCS CN 方法的降雨径流模型",
    category_id="hydrological"
)

# 提交任务
task = client.submit_task(
    workflow_id="workflow-123",
    inputs={"rainfall": "dataset-456"},
    parameters={"cn": 75}
)

# 获取任务状态
status = client.get_task(task["id"])
print(f"任务状态: {status['status']}")
```

## 项目结构

```
watershed_sdk/
├── __init__.py          # SDK 入口
├── model.py             # 模型基类和配置
├── io.py                # 输入输出处理
├── validation.py        # 验证指标
├── client.py            # 平台 API 客户端
└── executor.py          # 本地/容器执行器
```

## 许可证

MIT License
