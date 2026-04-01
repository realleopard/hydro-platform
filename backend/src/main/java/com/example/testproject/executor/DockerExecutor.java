package com.example.testproject.executor;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerCmd;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.InspectContainerResponse;
import com.github.dockerjava.api.command.LogContainerCmd;
import com.github.dockerjava.api.model.*;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

/**
 * Docker 执行器
 * 负责创建、启动和管理模型容器
 */
@Slf4j
@Component
public class DockerExecutor {

    private DockerClient dockerClient;

    // 存储任务ID到容器ID的映射
    private final Map<UUID, String> taskContainerMap = new HashMap<>();

    @PostConstruct
    public void init() {
        try {
            DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
                    .withDockerHost("unix:///var/run/docker.sock")
                    .build();

            DockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
                    .dockerHost(config.getDockerHost())
                    .sslConfig(config.getSSLConfig())
                    .maxConnections(100)
                    .connectionTimeout(Duration.ofSeconds(30))
                    .responseTimeout(Duration.ofSeconds(45))
                    .build();

            dockerClient = DockerClientImpl.getInstance(config, httpClient);

            // 测试连接
            dockerClient.pingCmd().exec();
            log.info("Docker 客户端初始化成功");

        } catch (Exception e) {
            log.error("Docker 客户端初始化失败: {}", e.getMessage(), e);
            // 开发环境可能没有 Docker，记录警告但不阻止启动
            log.warn("Docker 不可用，容器执行功能将被禁用");
        }
    }

    @PreDestroy
    public void shutdown() {
        if (dockerClient != null) {
            try {
                // 清理所有正在运行的任务容器
                for (Map.Entry<UUID, String> entry : taskContainerMap.entrySet()) {
                    try {
                        stopAndRemoveContainer(entry.getValue());
                    } catch (Exception e) {
                        log.error("清理容器失败: containerId={}, error={}", entry.getValue(), e.getMessage());
                    }
                }
                dockerClient.close();
                log.info("Docker 客户端已关闭");
            } catch (IOException e) {
                log.error("关闭 Docker 客户端失败: {}", e.getMessage());
            }
        }
    }

    /**
     * 检查 Docker 是否可用
     */
    public boolean isDockerAvailable() {
        if (dockerClient == null) {
            return false;
        }
        try {
            dockerClient.pingCmd().exec();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 拉取镜像
     */
    public boolean pullImage(String imageName) {
        if (!isDockerAvailable()) {
            throw new RuntimeException("Docker 不可用");
        }

        try {
            log.info("拉取 Docker 镜像: {}", imageName);

            // 检查镜像是否已存在
            List<Image> images = dockerClient.listImagesCmd()
                    .withImageNameFilter(imageName)
                    .exec();

            if (!images.isEmpty()) {
                log.info("镜像已存在: {}", imageName);
                return true;
            }

            // 拉取镜像
            dockerClient.pullImageCmd(imageName)
                    .start()
                    .awaitCompletion();

            log.info("镜像拉取完成: {}", imageName);
            return true;

        } catch (Exception e) {
            log.error("拉取镜像失败: imageName={}, error={}", imageName, e.getMessage());
            return false;
        }
    }

    /**
     * 创建并启动容器
     */
    public ContainerExecutionResult executeContainer(UUID taskId, ContainerConfig config) {
        if (!isDockerAvailable()) {
            throw new RuntimeException("Docker 不可用");
        }

        String containerId = null;

        try {
            // 拉取镜像
            if (!pullImage(config.getImage())) {
                return ContainerExecutionResult.failed("拉取镜像失败: " + config.getImage());
            }

            // 创建容器
            log.info("创建容器: taskId={}, image={}", taskId, config.getImage());

            CreateContainerCmd createCmd = dockerClient.createContainerCmd(config.getImage())
                    .withName("hydro-task-" + taskId.toString().substring(0, 8));

            // 设置命令
            if (config.getCommand() != null && !config.getCommand().isEmpty()) {
                createCmd.withCmd(config.getCommand());
            }

            // 设置环境变量
            if (config.getEnv() != null) {
                createCmd.withEnv(config.getEnv());
            }

            // 设置工作目录
            if (config.getWorkingDir() != null) {
                createCmd.withWorkingDir(config.getWorkingDir());
            }

            // 设置资源限制
            HostConfig hostConfig = new HostConfig();

            // CPU 限制
            if (config.getCpuLimit() != null) {
                hostConfig.withCpuQuota(config.getCpuLimit() * 100000L); // 转换为 microseconds
                hostConfig.withCpuPeriod(100000L);
            }

            // 内存限制
            if (config.getMemoryLimit() != null) {
                hostConfig.withMemory(config.getMemoryLimit());
            }

            // 卷挂载
            if (config.getVolumes() != null) {
                List<Bind> binds = new ArrayList<>();
                for (Map.Entry<String, String> entry : config.getVolumes().entrySet()) {
                    binds.add(new Bind(entry.getKey(), new Volume(entry.getValue())));
                }
                hostConfig.withBinds(binds);
            }

            // 网络配置
            if (config.getNetworkMode() != null) {
                hostConfig.withNetworkMode(config.getNetworkMode());
            } else {
                hostConfig.withNetworkMode("bridge");
            }

            createCmd.withHostConfig(hostConfig);

            // 创建容器
            CreateContainerResponse container = createCmd.exec();
            containerId = container.getId();
            taskContainerMap.put(taskId, containerId);

            log.info("容器创建成功: taskId={}, containerId={}", taskId, containerId);

            // 启动容器
            dockerClient.startContainerCmd(containerId).exec();
            log.info("容器启动成功: containerId={}", containerId);

            // 等待容器完成或超时
            long startTime = System.currentTimeMillis();
            long timeoutMs = config.getTimeoutSeconds() * 1000L;

            while (System.currentTimeMillis() - startTime < timeoutMs) {
                InspectContainerResponse inspect = dockerClient.inspectContainerCmd(containerId).exec();
                InspectContainerResponse.ContainerState state = inspect.getState();

                if (!state.getRunning()) {
                    // 容器已完成
                    int exitCode = state.getExitCode();
                    String logs = getContainerLogs(containerId);

                    // 清理容器
                    stopAndRemoveContainer(containerId);
                    taskContainerMap.remove(taskId);

                    if (exitCode == 0) {
                        return ContainerExecutionResult.success(logs);
                    } else {
                        return ContainerExecutionResult.failed("容器退出码: " + exitCode + ", 日志: " + logs);
                    }
                }

                // 等待 1 秒再检查
                Thread.sleep(1000);
            }

            // 超时
            log.warn("容器执行超时: taskId={}, containerId={}", taskId, containerId);
            stopAndRemoveContainer(containerId);
            taskContainerMap.remove(taskId);

            return ContainerExecutionResult.failed("执行超时（" + config.getTimeoutSeconds() + "秒）");

        } catch (Exception e) {
            log.error("容器执行异常: taskId={}, error={}", taskId, e.getMessage(), e);

            // 清理容器
            if (containerId != null) {
                try {
                    stopAndRemoveContainer(containerId);
                } catch (Exception ignored) {
                }
                taskContainerMap.remove(taskId);
            }

            return ContainerExecutionResult.failed("执行异常: " + e.getMessage());
        }
    }

    /**
     * 停止容器
     */
    public boolean stopContainer(UUID taskId) {
        String containerId = taskContainerMap.get(taskId);
        if (containerId == null) {
            log.warn("未找到任务对应的容器: taskId={}", taskId);
            return false;
        }

        try {
            log.info("停止容器: taskId={}, containerId={}", taskId, containerId);
            dockerClient.stopContainerCmd(containerId).withTimeout(10).exec();
            stopAndRemoveContainer(containerId);
            taskContainerMap.remove(taskId);
            return true;
        } catch (Exception e) {
            log.error("停止容器失败: taskId={}, error={}", taskId, e.getMessage());
            return false;
        }
    }

    /**
     * 获取容器日志
     */
    private String getContainerLogs(String containerId) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            LogContainerCmd logCmd = dockerClient.logContainerCmd(containerId)
                    .withStdOut(true)
                    .withStdErr(true)
                    .withTimestamps(false);

            logCmd.exec(new com.github.dockerjava.api.async.ResultCallback.Adapter<>() {
                @Override
                public void onNext(Frame frame) {
                    try {
                        outputStream.write(frame.getPayload());
                    } catch (IOException e) {
                        log.error("写入日志失败: {}", e.getMessage());
                    }
                }
            }).awaitCompletion();

            return outputStream.toString(StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("获取容器日志失败: {}", e.getMessage());
            return "";
        }
    }

    /**
     * 停止并删除容器
     */
    private void stopAndRemoveContainer(String containerId) {
        try {
            // 先尝试停止
            try {
                dockerClient.stopContainerCmd(containerId).withTimeout(5).exec();
            } catch (Exception e) {
                // 容器可能已经停止
            }

            // 删除容器
            dockerClient.removeContainerCmd(containerId)
                    .withRemoveVolumes(true)
                    .withForce(true)
                    .exec();

            log.debug("容器已删除: containerId={}", containerId);

        } catch (Exception e) {
            log.error("删除容器失败: containerId={}, error={}", containerId, e.getMessage());
        }
    }

    /**
     * 获取容器状态
     */
    public ContainerStatus getContainerStatus(UUID taskId) {
        String containerId = taskContainerMap.get(taskId);
        if (containerId == null) {
            return null;
        }

        try {
            InspectContainerResponse inspect = dockerClient.inspectContainerCmd(containerId).exec();
            InspectContainerResponse.ContainerState state = inspect.getState();

            ContainerStatus status = new ContainerStatus();
            status.setContainerId(containerId);
            status.setRunning(state.getRunning());
            status.setExitCode(state.getExitCode());
            status.setStartedAt(state.getStartedAt());
            status.setFinishedAt(state.getFinishedAt());

            return status;

        } catch (Exception e) {
            log.error("获取容器状态失败: taskId={}, error={}", taskId, e.getMessage());
            return null;
        }
    }

    /**
     * 容器配置
     */
    @lombok.Data
    public static class ContainerConfig {
        private String image;
        private List<String> command;
        private List<String> env;
        private String workingDir;
        private Map<String, String> volumes; // hostPath -> containerPath
        private Integer cpuLimit; // CPU 核数
        private Long memoryLimit; // 字节
        private String networkMode;
        private Integer timeoutSeconds = 3600; // 默认 1 小时
    }

    /**
     * 容器执行结果
     */
    @lombok.Data
    public static class ContainerExecutionResult {
        private boolean success;
        private String logs;
        private String errorMessage;

        public static ContainerExecutionResult success(String logs) {
            ContainerExecutionResult result = new ContainerExecutionResult();
            result.success = true;
            result.logs = logs;
            return result;
        }

        public static ContainerExecutionResult failed(String errorMessage) {
            ContainerExecutionResult result = new ContainerExecutionResult();
            result.success = false;
            result.errorMessage = errorMessage;
            return result;
        }
    }

    /**
     * 容器状态
     */
    @lombok.Data
    public static class ContainerStatus {
        private String containerId;
        private Boolean running;
        private Integer exitCode;
        private String startedAt;
        private String finishedAt;
    }
}
