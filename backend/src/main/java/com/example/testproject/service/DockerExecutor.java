commit 09d81493670cb270f1bde1d7b1635f73d7721b44
Author: sunbao <sunbao@dashuiyun.cn>
Date:   Wed Apr 1 13:02:53 2026 +0800

    Initial commit: watershed water system simulation platform
    
    Spring Boot 3.2 backend with JWT auth, model management, workflow DAG engine,
    task scheduling, and RabbitMQ integration. React 18 frontend with Cesium 3D
    visualization, workflow editor (React Flow), and Zustand state management.
    PostgreSQL/Redis infrastructure with Docker Compose.
    
    Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

diff --git a/backend/src/main/java/com/example/testproject/service/DockerExecutor.java b/backend/src/main/java/com/example/testproject/service/DockerExecutor.java
new file mode 100644
index 0000000..bd8f604
--- /dev/null
+++ b/backend/src/main/java/com/example/testproject/service/DockerExecutor.java
@@ -0,0 +1,563 @@
+package com.example.testproject.service;
+
+import com.example.testproject.config.DockerConfig;
+import com.github.dockerjava.api.DockerClient;
+import com.github.dockerjava.api.async.ResultCallback;
+import com.github.dockerjava.api.command.CreateContainerResponse;
+import com.github.dockerjava.api.command.InspectContainerResponse;
+import com.github.dockerjava.api.command.PullImageResultCallback;
+import com.github.dockerjava.api.exception.NotFoundException;
+import com.github.dockerjava.api.model.*;
+import lombok.extern.slf4j.Slf4j;
+import org.springframework.stereotype.Service;
+
+import java.io.Closeable;
+import java.io.File;
+import java.time.Duration;
+import java.time.Instant;
+import java.util.*;
+import java.util.concurrent.TimeUnit;
+
+/**
+ * Docker 执行器
+ * 负责拉取镜像、启动容器、执行模型计算、收集输出和日志、清理容器
+ */
+@Slf4j
+@Service
+public class DockerExecutor {
+
+    private final DockerClient dockerClient;
+    private final DockerConfig dockerConfig;
+
+    // 容器执行上下文，用于跟踪运行中的容器
+    private final Map<String, ContainerContext> runningContainers = new HashMap<>();
+
+    // 默认资源限制
+    private static final long DEFAULT_CPU_LIMIT = 2000000000L; // 2 CPUs (nanocpus)
+    private static final long DEFAULT_MEMORY_LIMIT = 4L * 1024 * 1024 * 1024; // 4GB
+    private static final long DEFAULT_MEMORY_SWAP = 4L * 1024 * 1024 * 1024; // 4GB (no swap)
+
+    public DockerExecutor(DockerClient dockerClient, DockerConfig dockerConfig) {
+        this.dockerClient = dockerClient;
+        this.dockerConfig = dockerConfig;
+    }
+
+    /**
+     * 容器执行结果
+     */
+    public static class ExecutionResult {
+        private final boolean success;
+        private final int exitCode;
+        private final String stdout;
+        private final String stderr;
+        private final String containerId;
+        private final long executionTimeMs;
+        private final String errorMessage;
+
+        public ExecutionResult(boolean success, int exitCode, String stdout, String stderr,
+                               String containerId, long executionTimeMs, String errorMessage) {
+            this.success = success;
+            this.exitCode = exitCode;
+            this.stdout = stdout;
+            this.stderr = stderr;
+            this.containerId = containerId;
+            this.executionTimeMs = executionTimeMs;
+            this.errorMessage = errorMessage;
+        }
+
+        public boolean isSuccess() {
+            return success;
+        }
+
+        public int getExitCode() {
+            return exitCode;
+        }
+
+        public String getStdout() {
+            return stdout;
+        }
+
+        public String getStderr() {
+            return stderr;
+        }
+
+        public String getContainerId() {
+            return containerId;
+        }
+
+        public long getExecutionTimeMs() {
+            return executionTimeMs;
+        }
+
+        public String getErrorMessage() {
+            return errorMessage;
+        }
+    }
+
+    /**
+     * 容器执行上下文
+     */
+    private static class ContainerContext {
+        private final String containerId;
+        private final String taskId;
+        private final String nodeId;
+        private final Instant startTime;
+        private volatile boolean cancelled = false;
+
+        public ContainerContext(String containerId, String taskId, String nodeId, Instant startTime) {
+            this.containerId = containerId;
+            this.taskId = taskId;
+            this.nodeId = nodeId;
+            this.startTime = startTime;
+        }
+
+        public String getContainerId() {
+            return containerId;
+        }
+
+        public String getTaskId() {
+            return taskId;
+        }
+
+        public String getNodeId() {
+            return nodeId;
+        }
+
+        public Instant getStartTime() {
+            return startTime;
+        }
+
+        public boolean isCancelled() {
+            return cancelled;
+        }
+
+        public void setCancelled(boolean cancelled) {
+            this.cancelled = cancelled;
+        }
+    }
+
+    /**
+     * 拉取 Docker 镜像
+     *
+     * @param imageName 镜像名称（包含标签，如 "hydromodel:v1.0"）
+     * @return 是否成功
+     */
+    public boolean pullImage(String imageName) {
+        log.info("开始拉取镜像: {}", imageName);
+
+        try {
+            // 检查镜像是否已存在
+            try {
+                dockerClient.inspectImageCmd(imageName).exec();
+                log.info("镜像 {} 已存在，跳过拉取", imageName);
+                return true;
+            } catch (NotFoundException e) {
+                // 镜像不存在，继续拉取
+                log.info("镜像 {} 不存在，开始拉取", imageName);
+            }
+
+            // 拉取镜像
+            PullImageResultCallback callback = new PullImageResultCallback();
+            dockerClient.pullImageCmd(imageName)
+                    .exec(callback)
+                    .awaitCompletion(dockerConfig.getPullTimeoutSeconds(), TimeUnit.SECONDS);
+
+            log.info("镜像 {} 拉取成功", imageName);
+            return true;
+
+        } catch (InterruptedException e) {
+            Thread.currentThread().interrupt();
+            log.error("拉取镜像 {} 被中断", imageName, e);
+            return false;
+        } catch (Exception e) {
+            log.error("拉取镜像 {} 失败: {}", imageName, e.getMessage(), e);
+            return false;
+        }
+    }
+
+    /**
+     * 执行容器
+     *
+     * @param taskId          任务ID
+     * @param nodeId          节点ID
+     * @param imageName       镜像名称
+     * @param command         执行命令（可选，为空则使用镜像默认命令）
+     * @param envVars         环境变量
+     * @param volumeMounts    卷挂载配置（本地路径 -> 容器内路径）
+     * @param workingDir      工作目录
+     * @param cpuLimit        CPU限制（nanocpus，如 2000000000 表示 2 CPUs）
+     * @param memoryLimit     内存限制（字节，如 4*1024*1024*1024 表示 4GB）
+     * @param timeoutSeconds  超时时间（秒）
+     * @param logCollector    日志收集回调
+     * @return 执行结果
+     */
+    public ExecutionResult executeContainer(String taskId, String nodeId, String imageName,
+                                            List<String> command, Map<String, String> envVars,
+                                            Map<String, String> volumeMounts, String workingDir,
+                                            Long cpuLimit, Long memoryLimit, Integer timeoutSeconds,
+                                            LogCollector logCollector) {
+
+        String containerId = null;
+        Instant startTime = Instant.now();
+
+        try {
+            // 1. 拉取镜像
+            if (!pullImage(imageName)) {
+                return new ExecutionResult(false, -1, "", "", null, 0,
+                        "拉取镜像失败: " + imageName);
+            }
+
+            // 2. 构建容器配置
+            HostConfig hostConfig = buildHostConfig(volumeMounts, cpuLimit, memoryLimit);
+
+            // 3. 创建容器
+            CreateContainerResponse container = createContainer(imageName, command, envVars,
+                    workingDir, hostConfig);
+            containerId = container.getId();
+
+            log.info("容器创建成功: taskId={}, nodeId={}, containerId={}", taskId, nodeId, containerId);
+
+            // 4. 注册到运行上下文
+            ContainerContext context = new ContainerContext(containerId, taskId, nodeId, startTime);
+            runningContainers.put(containerId, context);
+
+            // 5. 启动容器
+            dockerClient.startContainerCmd(containerId).exec();
+            log.info("容器启动成功: containerId={}", containerId);
+
+            // 6. 收集日志（异步）
+            StringBuilder stdoutBuilder = new StringBuilder();
+            StringBuilder stderrBuilder = new StringBuilder();
+            collectLogsAsync(containerId, stdoutBuilder, stderrBuilder, logCollector);
+
+            // 7. 等待容器完成或超时
+            int effectiveTimeout = timeoutSeconds != null ? timeoutSeconds
+                    : dockerConfig.getContainerTimeoutSeconds();
+            boolean completed = waitForContainer(containerId, effectiveTimeout, context);
+
+            if (!completed) {
+                // 超时或被取消
+                if (context.isCancelled()) {
+                    log.info("容器执行被取消: containerId={}", containerId);
+                    stopAndRemoveContainer(containerId);
+                    return new ExecutionResult(false, -1, stdoutBuilder.toString(),
+                            stderrBuilder.toString(), containerId,
+                            Duration.between(startTime, Instant.now()).toMillis(),
+                            "任务被取消");
+                } else {
+                    log.warn("容器执行超时: containerId={}, timeout={}s", containerId, effectiveTimeout);
+                    stopAndRemoveContainer(containerId);
+                    return new ExecutionResult(false, -1, stdoutBuilder.toString(),
+                            stderrBuilder.toString(), containerId,
+                            Duration.between(startTime, Instant.now()).toMillis(),
+                            "执行超时（" + effectiveTimeout + "秒）");
+                }
+            }
+
+            // 8. 获取容器退出码
+            InspectContainerResponse inspectResponse = dockerClient
+                    .inspectContainerCmd(containerId).exec();
+            Integer exitCode = inspectResponse.getState().getExitCodeLong() != null
+                    ? inspectResponse.getState().getExitCodeLong().intValue()
+                    : -1;
+
+            long executionTimeMs = Duration.between(startTime, Instant.now()).toMillis();
+
+            log.info("容器执行完成: containerId={}, exitCode={}, time={}ms",
+                    containerId, exitCode, executionTimeMs);
+
+            // 9. 清理容器
+            removeContainer(containerId);
+            runningContainers.remove(containerId);
+
+            boolean success = exitCode == 0;
+            return new ExecutionResult(success, exitCode, stdoutBuilder.toString(),
+                    stderrBuilder.toString(), containerId, executionTimeMs,
+                    success ? null : "容器退出码: " + exitCode);
+
+        } catch (Exception e) {
+            long executionTimeMs = Duration.between(startTime, Instant.now()).toMillis();
+            log.error("容器执行异常: taskId={}, nodeId={}, error={}", taskId, nodeId, e.getMessage(), e);
+
+            // 清理容器
+            if (containerId != null) {
+                stopAndRemoveContainer(containerId);
+                runningContainers.remove(containerId);
+            }
+
+            return new ExecutionResult(false, -1, "", "", containerId,
+                    executionTimeMs, "执行异常: " + e.getMessage());
+        }
+    }
+
+    /**
+     * 构建 HostConfig
+     */
+    private HostConfig buildHostConfig(Map<String, String> volumeMounts,
+                                       Long cpuLimit, Long memoryLimit) {
+        HostConfig hostConfig = new HostConfig();
+
+        // 资源限制
+        hostConfig.withCpuQuota(cpuLimit != null ? cpuLimit : DEFAULT_CPU_LIMIT);
+        hostConfig.withMemory(memoryLimit != null ? memoryLimit : DEFAULT_MEMORY_LIMIT);
+        hostConfig.withMemorySwap(memoryLimit != null ? memoryLimit : DEFAULT_MEMORY_SWAP);
+
+        // 自动移除容器（如果希望在停止后自动删除）
+        // hostConfig.withAutoRemove(true);
+
+        // 卷挂载
+        if (volumeMounts != null && !volumeMounts.isEmpty()) {
+            List<Bind> binds = new ArrayList<>();
+            for (Map.Entry<String, String> entry : volumeMounts.entrySet()) {
+                String hostPath = entry.getKey();
+                String containerPath = entry.getValue();
+
+                // 确保主机路径存在
+                File hostDir = new File(hostPath);
+                if (!hostDir.exists()) {
+                    hostDir.mkdirs();
+                }
+
+                binds.add(new Bind(hostPath, new Volume(containerPath), AccessMode.rw));
+                log.debug("卷挂载: {} -> {}", hostPath, containerPath);
+            }
+            hostConfig.withBinds(binds);
+        }
+
+        // 网络配置（默认使用 bridge）
+        hostConfig.withNetworkMode("bridge");
+
+        return hostConfig;
+    }
+
+    /**
+     * 创建容器
+     */
+    private CreateContainerResponse createContainer(String imageName, List<String> command,
+                                                    Map<String, String> envVars, String workingDir,
+                                                    HostConfig hostConfig) {
+        com.github.dockerjava.api.command.CreateContainerCmd createCmd =
+                dockerClient.createContainerCmd(imageName)
+                        .withHostConfig(hostConfig);
+
+        // 设置命令
+        if (command != null && !command.isEmpty()) {
+            createCmd.withCmd(command);
+        }
+
+        // 设置环境变量
+        if (envVars != null && !envVars.isEmpty()) {
+            List<String> envList = new ArrayList<>();
+            for (Map.Entry<String, String> entry : envVars.entrySet()) {
+                envList.add(entry.getKey() + "=" + entry.getValue());
+            }
+            createCmd.withEnv(envList);
+        }
+
+        // 设置工作目录
+        if (workingDir != null && !workingDir.isEmpty()) {
+            createCmd.withWorkingDir(workingDir);
+        }
+
+        // 设置容器名称（可选，添加时间戳避免冲突）
+        // createCmd.withName("hydro-task-" + System.currentTimeMillis());
+
+        return createCmd.exec();
+    }
+
+    /**
+     * 异步收集日志
+     */
+    private void collectLogsAsync(String containerId, StringBuilder stdoutBuilder,
+                                  StringBuilder stderrBuilder, LogCollector logCollector) {
+        dockerClient.logContainerCmd(containerId)
+                .withStdOut(true)
+                .withStdErr(true)
+                .withFollowStream(true)
+                .withTimestamps(false)
+                .exec(new ResultCallback<Frame>() {
+                    @Override
+                    public void onStart(Closeable closeable) {
+                        log.debug("开始收集容器日志: containerId={}", containerId);
+                    }
+
+                    @Override
+                    public void onNext(Frame frame) {
+                        String payload = new String(frame.getPayload());
+                        switch (frame.getStreamType()) {
+                            case STDOUT:
+                                stdoutBuilder.append(payload);
+                                if (logCollector != null) {
+                                    logCollector.onLog(payload, false);
+                                }
+                                break;
+                            case STDERR:
+                                stderrBuilder.append(payload);
+                                if (logCollector != null) {
+                                    logCollector.onLog(payload, true);
+                                }
+                                break;
+                            default:
+                                break;
+                        }
+                    }
+
+                    @Override
+                    public void onError(Throwable throwable) {
+                        log.error("收集日志出错: containerId={}, error={}",
+                                containerId, throwable.getMessage());
+                    }
+
+                    @Override
+                    public void onComplete() {
+                        log.debug("日志收集完成: containerId={}", containerId);
+                    }
+
+                    @Override
+                    public void close() {
+                        // 清理资源
+                    }
+                });
+    }
+
+    /**
+     * 等待容器完成
+     *
+     * @return true 表示正常完成，false 表示超时或被取消
+     */
+    private boolean waitForContainer(String containerId, int timeoutSeconds,
+                                     ContainerContext context) throws InterruptedException {
+        long deadline = System.currentTimeMillis() + (timeoutSeconds * 1000L);
+
+        while (System.currentTimeMillis() < deadline) {
+            // 检查是否被取消
+            if (context.isCancelled()) {
+                return false;
+            }
+
+            // 检查容器状态
+            InspectContainerResponse inspectResponse = dockerClient
+                    .inspectContainerCmd(containerId).exec();
+
+            Boolean running = inspectResponse.getState().getRunning();
+            if (running == null || !running) {
+                // 容器已停止
+                return true;
+            }
+
+            // 等待一段时间再检查
+            Thread.sleep(1000);
+        }
+
+        // 超时
+        return false;
+    }
+
+    /**
+     * 停止并移除容器
+     */
+    public void stopAndRemoveContainer(String containerId) {
+        try {
+            // 先停止容器
+            try {
+                InspectContainerResponse inspect = dockerClient
+                        .inspectContainerCmd(containerId).exec();
+                if (Boolean.TRUE.equals(inspect.getState().getRunning())) {
+                    log.info("停止容器: containerId={}", containerId);
+                    dockerClient.stopContainerCmd(containerId)
+                            .withTimeout(30) // 30秒优雅停止
+                            .exec();
+                }
+            } catch (NotFoundException e) {
+                log.warn("容器不存在，无需停止: containerId={}", containerId);
+                return;
+            }
+
+            // 移除容器
+            removeContainer(containerId);
+
+        } catch (Exception e) {
+            log.error("停止/移除容器失败: containerId={}, error={}",
+                    containerId, e.getMessage());
+        }
+    }
+
+    /**
+     * 移除容器
+     */
+    public void removeContainer(String containerId) {
+        try {
+            dockerClient.removeContainerCmd(containerId)
+                    .withForce(true)
+                    .withRemoveVolumes(true)
+                    .exec();
+            log.info("容器已移除: containerId={}", containerId);
+        } catch (NotFoundException e) {
+            log.warn("容器不存在，无需移除: containerId={}", containerId);
+        } catch (Exception e) {
+            log.error("移除容器失败: containerId={}, error={}",
+                    containerId, e.getMessage());
+        }
+    }
+
+    /**
+     * 取消容器执行
+     */
+    public boolean cancelContainer(String taskId, String nodeId) {
+        log.info("尝试取消容器执行: taskId={}, nodeId={}", taskId, nodeId);
+
+        for (ContainerContext context : runningContainers.values()) {
+            if (context.getTaskId().equals(taskId) && context.getNodeId().equals(nodeId)) {
+                context.setCancelled(true);
+                stopAndRemoveContainer(context.getContainerId());
+                runningContainers.remove(context.getContainerId());
+                log.info("容器执行已取消: containerId={}", context.getContainerId());
+                return true;
+            }
+        }
+
+        log.warn("未找到运行的容器: taskId={}, nodeId={}", taskId, nodeId);
+        return false;
+    }
+
+    /**
+     * 获取容器资源使用情况
+     */
+    public Map<String, Object> getContainerStats(String containerId) {
+        Map<String, Object> stats = new HashMap<>();
+        try {
+            InspectContainerResponse inspect = dockerClient
+                    .inspectContainerCmd(containerId).exec();
+
+            stats.put("status", inspect.getState().getStatus());
+            stats.put("running", inspect.getState().getRunning());
+            stats.put("exitCode", inspect.getState().getExitCodeLong());
+            stats.put("startedAt", inspect.getState().getStartedAt());
+            stats.put("finishedAt", inspect.getState().getFinishedAt());
+
+        } catch (Exception e) {
+            log.error("获取容器状态失败: containerId={}, error={}",
+                    containerId, e.getMessage());
+        }
+        return stats;
+    }
+
+    /**
+     * 日志收集回调接口
+     */
+    public interface LogCollector {
+        void onLog(String logLine, boolean isError);
+    }
+
+    /**
+     * 清理所有运行中的容器（用于应用关闭时）
+     */
+    public void cleanupAll() {
+        log.info("清理所有运行中的容器，数量: {}", runningContainers.size());
+
+        for (ContainerContext context : runningContainers.values()) {
+            stopAndRemoveContainer(context.getContainerId());
+        }
+        runningContainers.clear();
+    }
+}
