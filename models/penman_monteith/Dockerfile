FROM python:3.11-slim
WORKDIR /workspace
COPY model.py .
COPY config.json .
RUN mkdir -p /workspace/data /workspace/output /workspace/input
ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["python", "model.py"]
