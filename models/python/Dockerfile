FROM python:3.11-slim

WORKDIR /app

# 安装依赖
RUN pip install --no-cache-dir numpy pandas xarray netCDF4 scipy

# 复制模型代码
COPY src/ /app/

# 设置入口点
ENTRYPOINT ["python", "-m", "model.run"]
