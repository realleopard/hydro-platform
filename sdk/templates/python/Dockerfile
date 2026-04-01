# {{model_name}} Docker 镜像
FROM {{base_image or 'python:3.11-slim'}}

LABEL maintainer="{{author}}"
LABEL model.name="{{model_name}}"
LABEL model.version="{{version}}"

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libnetcdf-dev \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制模型代码
COPY model.py .
COPY config.json .

# 创建输入输出目录
RUN mkdir -p /app/inputs /app/outputs

# 设置环境变量
ENV MODEL_NAME={{model_name}}
ENV MODEL_VERSION={{version}}
ENV PYTHONUNBUFFERED=1

# 运行模型
ENTRYPOINT ["python", "-m", "watershed_sdk.runner"]
CMD ["model.py"]
