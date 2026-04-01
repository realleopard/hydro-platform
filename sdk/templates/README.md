# Watershed SDK 模型模板

本目录包含多种编程语言的模型模板，用于快速开发流域水系统模拟模型。

## 支持的编程语言

- **Python** - 主要推荐语言，功能完整
- **C++** - 高性能计算场景
- **R** - 统计分析和数据科学
- **MATLAB** - 工程和学术研究

## 模板结构

每种语言的模板包含以下文件：

```
├── model.{ext}          # 模型主代码
├── Dockerfile           # 容器镜像定义
├── requirements.txt     # 依赖列表 (Python/R)
└── CMakeLists.txt       # 构建配置 (C++)
```

## 使用方法

### Python 模板

```bash
cd templates/python
pip install -r requirements.txt
python model.py
```

### C++ 模板

```bash
cd templates/cpp
mkdir build && cd build
cmake ..
make
./model
```

### R 模板

```bash
cd templates/r
Rscript model.R
```

### MATLAB 模板

在 MATLAB 中打开 `model.m` 文件并运行。

## 变量说明

模板中使用以下变量：

- `{{model_name}}` - 模型名称
- `{{version}}` - 版本号
- `{{model_description}}` - 模型描述
- `{{author}}` - 作者
- `{{parameters}}` - 参数列表
- `{{inputs}}` - 输入变量列表
- `{{outputs}}` - 输出变量列表

## 模板渲染工具

可以使用 Python 的 Jinja2 库渲染模板：

```python
from jinja2 import Template

# 加载模板
with open('templates/python/model.py') as f:
    template = Template(f.read())

# 渲染
output = template.render(
    model_name='my_model',
    version='1.0.0',
    parameters=[
        {'name': 'cn', 'type': 'float', 'default': 75}
    ],
    inputs=[
        {'name': 'rainfall', 'type': 'timeseries', 'description': '降雨量'}
    ],
    outputs=[
        {'name': 'runoff', 'type': 'timeseries', 'description': '径流量'}
    ]
)

# 保存
with open('my_model.py', 'w') as f:
    f.write(output)
```
