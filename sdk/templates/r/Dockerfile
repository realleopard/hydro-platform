# {{model_name}} Docker 镜像
FROM rocker/r-ver:4.3.0

LABEL maintainer="{{author}}"
LABEL model.name="{{model_name}}"
LABEL model.version="{{version}}"

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libnetcdf-dev \
    libxml2-dev \
    libssl-dev \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 R 包
RUN R -e "install.packages(c('jsonlite', 'ncdf4', 'R6'))"

# 设置工作目录
WORKDIR /app

# 复制模型代码
COPY model.R .
COPY config.json .

# 创建输入输出目录
RUN mkdir -p /app/inputs /app/outputs

# 设置环境变量
ENV MODEL_NAME={{model_name}}
ENV MODEL_VERSION={{version}}

# 运行模型
ENTRYPOINT ["Rscript", "model.R"]