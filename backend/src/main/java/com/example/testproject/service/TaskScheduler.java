package com.example.testproject.service;

import com.example.testproject.dto.ExecutionPlan;
import com.example.testproject.dto.WorkflowDefinition;
import com.example.testproject.dto.WorkflowNode;
import com.example.testproject.dto.task.TaskMessage;
import com.example.testproject.entity.Model;
import com.example.testproject.entity.Task;
import com.example.testproject.entity.TaskNode;
import com.example.testproject.entity.Workflow;
import com.example.testproject.mapper.TaskMapper;
import com.example.testproject.mapper.TaskNodeMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.testproject.mapper.WorkflowMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;

import java.io.File;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

/**
 * 任务调度器
 * 核心调度引擎，负责任务的执行、状态管理和生命周期控制
 */
@Slf4j
@Service
public class TaskScheduler {

    private final TaskMapper taskMapper;
    private final TaskNodeMapper taskNodeMapper;
    private final WorkflowMapper workflowMapper;
    private final DagParser dagParser;
    private final DependencyResolver dependencyResolver;
    private final TaskProgressPublisher progressPublisher;
    private final DockerExecutor dockerExecutor;
    private final ModelService modelService;
    private final ObjectMapper objectMapper;

    // 线程池用于异步执行任务
    private final ExecutorService executorService;

    // 任务取消标志
    private final Map<UUID, Boolean> cancelFlags = new ConcurrentHashMap<>();

    // 任务重试次数
    private final Map<UUID, Integer> retryCounts = new ConcurrentHashMap<>();
    private static final int MAX_RETRY_COUNT = 3;

    public TaskScheduler(TaskMapper taskMapper,
                         TaskNodeMapper taskNodeMapper,
                         WorkflowMapper workflowMapper,
                         DagParser dagParser,
                         DependencyResolver dependencyResolver,
                         TaskProgressPublisher progressPublisher,
                         DockerExecutor dockerExecutor,
                         ModelService modelService,
                         ObjectMapper objectMapper,
                         @Value("${task-scheduler.pool-size:10}") int poolSize) {
        this.taskMapper = taskMapper;
        this.taskNodeMapper = taskNodeMapper;
        this.workflowMapper = workflowMapper;
        this.dagParser = dagParser;
        this.dependencyResolver = dependencyResolver;
        this.progressPublisher = progressPublisher;
        this.dockerExecutor = dockerExecutor;
        this.modelService = modelService;
        this.objectMapper = objectMapper;
        this.executorService = Executors.newFixedThreadPool(poolSize);
        log.info("任务调度器初始化完成，线程池大小: {}", poolSize);
    }

    /**
     * 提交任务（通过工作流ID）
     *
     * @param workflowId  工作流ID
     * @param inputs      输入参数
     * @param triggeredBy 触发用户ID
     * @return 创建的任务
     */
    @Transactional
    public Task submitTask(UUID workflowId, String inputs, UUID triggeredBy) {
        Workflow workflow = workflowMapper.selectById(workflowId);
        if (workflow == null) {
            throw new IllegalArgumentException("工作流不存在: " + workflowId);
        }
        return submitTask(workflow, inputs, triggeredBy);
    }

    /**
     * 提交任务
     *
     * @param workflow   工作流
     * @param inputs     输入参数
     * @param triggeredBy 触发用户ID
     * @return 创建的任务
     */
    @Transactional
    public Task submitTask(Workflow workflow, String inputs, UUID triggeredBy) {
        // 解析并验证工作流定义
        WorkflowDefinition definition = dagParser.parse(workflow.getDefinition());
        DagParser.ValidationResult validation = dagParser.validate(definition);

        if (!validation.isValid()) {
            throw new IllegalArgumentException("工作流定义无效: " + validation.getErrorMessage());
        }

        // 创建任务
        Task task = new Task();
        task.setId(UUID.randomUUID());
        task.setWorkflowId(workflow.getId());
        task.setName(workflow.getName() + "_" + System.currentTimeMillis());
        task.setStatus(TaskStatus.PENDING.name());
        task.setProgress(0);
        task.setInputs(inputs);
        task.setTriggeredBy(triggeredBy);
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());

        taskMapper.insert(task);

        // 更新工作流运行次数
        workflow.setRunCount(workflow.getRunCount() != null ? workflow.getRunCount() + 1 : 1);
        workflow.setLastRunAt(LocalDateTime.now());

        log.info("任务已提交: taskId={}, workflowId={}", task.getId(), workflow.getId());

        // 发布任务提交事件
        progressPublisher.publishTaskStatus(task.getId(), TaskStatus.PENDING, 0, "任务已提交，等待执行");

        // 异步开始执行
        executeTaskAsync(task, definition);

        return task;
    }

    /**
     * 异步执行任务
     */
    @Async
    protected void executeTaskAsync(Task task, WorkflowDefinition definition) {
        try {
            executeTask(task, definition);
        } catch (Exception e) {
            log.error("任务执行异常: taskId={}, error={}", task.getId(), e.getMessage(), e);
            updateTaskStatus(task.getId(), TaskStatus.FAILED, 0, e.getMessage());
            // 发布任务失败事件
            progressPublisher.publishTaskFailed(task.getId(), e.getMessage());
        }
    }

    /**
     * 执行任务
     */
    public void executeTask(Task task, WorkflowDefinition definition) {
        UUID taskId = task.getId();

        // 初始化取消标志
        cancelFlags.put(taskId, false);

        // 生成执行计划
        ExecutionPlan plan = dependencyResolver.generateExecutionPlan(
                definition, taskId, task.getWorkflowId());

        // 构建节点ID到节点的映射
        Map<String, WorkflowNode> nodeMap = new HashMap<>();
        for (WorkflowNode node : definition.getNodes()) {
            nodeMap.put(node.getId(), node);
        }

        // 更新状态为运行中
        updateTaskStatus(taskId, TaskStatus.RUNNING, 0, null);
        task.setStartedAt(LocalDateTime.now());
        taskMapper.updateById(task);

        // 发布任务开始事件
        progressPublisher.publishTaskStarted(taskId);

        log.info("开始执行任务: taskId={}, 共 {} 个阶段", taskId, plan.getStages().size());

        // 按阶段执行
        int totalNodes = definition.getNodes().size();
        int completedNodes = 0;
        Map<String, ExecutionStatus> nodeStatuses = new ConcurrentHashMap<>();

        for (ExecutionPlan.ExecutionStage stage : plan.getStages()) {
            // 检查是否被取消
            if (isCancelled(taskId)) {
                log.info("任务被取消: taskId={}", taskId);
                updateTaskStatus(taskId, TaskStatus.CANCELLED, task.getProgress(), null);
                progressPublisher.publishTaskCancelled(taskId);
                return;
            }

            log.info("执行任务阶段 {}: taskId={}, nodes={}",
                    stage.getStageIndex(), taskId, stage.getNodeIds());

            // 并行执行该阶段的所有节点
            List<CompletableFuture<Void>> futures = new ArrayList<>();

            for (String nodeId : stage.getNodeIds()) {
                WorkflowNode node = nodeMap.get(nodeId);
                String nodeName = node != null ? node.getName() : "节点-" + nodeId;

                // 发布节点开始事件
                progressPublisher.publishNodeStarted(taskId, nodeId, nodeName);

                CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                    executeNode(taskId, nodeId, node, plan.getNodeConfigs().get(nodeId));
                    nodeStatuses.put(nodeId, ExecutionStatus.COMPLETED);
                    // 发布节点完成事件
                    progressPublisher.publishNodeCompleted(taskId, nodeId, nodeName);
                }, executorService).exceptionally(ex -> {
                    log.error("节点执行失败: taskId={}, nodeId={}, error={}",
                            taskId, nodeId, ex.getMessage());
                    nodeStatuses.put(nodeId, ExecutionStatus.FAILED);
                    // 发布节点失败事件
                    progressPublisher.publishNodeFailed(taskId, nodeId, nodeName, ex.getMessage());
                    return null;
                });

                futures.add(future);
            }

            // 等待该阶段所有节点完成
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            // 检查是否有节点失败
            boolean hasFailure = stage.getNodeIds().stream()
                    .anyMatch(nodeId -> nodeStatuses.get(nodeId) == ExecutionStatus.FAILED);

            if (hasFailure) {
                log.error("阶段执行失败: taskId={}, stage={}", taskId, stage.getStageIndex());
                updateTaskStatus(taskId, TaskStatus.FAILED, task.getProgress(),
                        "阶段 " + stage.getStageIndex() + " 执行失败");
                progressPublisher.publishTaskFailed(taskId, "阶段 " + stage.getStageIndex() + " 执行失败");
                return;
            }

            // 更新进度
            completedNodes += stage.getNodeIds().size();
            int progress = (int) ((completedNodes * 100.0) / totalNodes);
            task.setProgress(progress);
            taskMapper.updateById(task);

            // 发布进度更新
            progressPublisher.publishTaskProgress(taskId, progress,
                    String.format("阶段 %d/%d 完成", stage.getStageIndex() + 1, plan.getStages().size()));

            log.info("阶段完成: taskId={}, stage={}, progress={}%", taskId, stage.getStageIndex(), progress);
        }

        // 任务完成
        log.info("任务执行完成: taskId={}", taskId);
        updateTaskStatus(taskId, TaskStatus.COMPLETED, 100, null);
        task.setCompletedAt(LocalDateTime.now());
        taskMapper.updateById(task);

        // 发布任务完成事件
        progressPublisher.publishTaskCompleted(taskId);

        // 清理
        cancelFlags.remove(taskId);
        retryCounts.remove(taskId);
    }

    /**
     * 执行单个节点
     */
    private void executeNode(UUID taskId, String nodeId, WorkflowNode node,
                             ExecutionPlan.NodeExecutionConfig config) {
        log.info("执行节点: taskId={}, nodeId={}, timeout={}",
                taskId, nodeId, config.getTimeout());

        // 检查是否被取消
        if (isCancelled(taskId)) {
            throw new RuntimeException("任务被取消");
        }

        // 创建任务节点执行记录
        TaskNode taskNode = createTaskNodeRecord(taskId, nodeId, node);

        try {
            // 获取节点关联的模型
            if (node == null || node.getModelId() == null) {
                throw new IllegalArgumentException("节点未配置模型: " + nodeId);
            }

            Model model = modelService.getById(node.getModelId());
            if (model == null) {
                throw new IllegalArgumentException("模型不存在: " + node.getModelId());
            }

            String dockerImage = model.getDockerImage();
            if (dockerImage == null || dockerImage.isEmpty()) {
                throw new IllegalArgumentException("模型未配置 Docker 镜像: " + model.getName());
            }

            // 解析资源限制
            ResourceLimits resourceLimits = parseResourceLimits(model.getResources());

            // 准备环境变量
            Map<String, String> envVars = buildEnvironmentVariables(node, taskId, nodeId);

            // 准备卷挂载
            Map<String, String> volumeMounts = buildVolumeMounts(taskId, nodeId, node);

            // 准备命令（如果有）
            List<String> command = buildCommand(node);

            // 更新节点状态为运行中
            taskNode.setStatus("running");
            taskNode.setStartedAt(LocalDateTime.now());
            taskNodeMapper.updateById(taskNode);

            // 执行 Docker 容器
            StringBuilder logBuilder = new StringBuilder();
            DockerExecutor.LogCollector logCollector = (logLine, isError) -> {
                logBuilder.append(logLine);
                // 实时追加日志到数据库
                taskNodeMapper.appendLog(taskNode.getId(), logLine);
            };

            DockerExecutor.ExecutionResult result = dockerExecutor.executeContainer(
                    taskId.toString(),
                    nodeId,
                    dockerImage,
                    command,
                    envVars,
                    volumeMounts,
                    "/workspace", // 默认工作目录
                    resourceLimits.getCpuLimit(),
                    resourceLimits.getMemoryLimit(),
                    config.getTimeout(),
                    logCollector
            );

            // 更新节点执行结果
            taskNode.setContainerId(result.getContainerId());
            taskNode.setCompletedAt(LocalDateTime.now());
            taskNode.setLogs(logBuilder.toString());

            if (result.isSuccess()) {
                taskNode.setStatus("completed");
                taskNode.setProgress(100);
                taskNode.setOutputs(buildNodeOutputs(result));
                taskNodeMapper.updateById(taskNode);

                log.info("节点执行成功: taskId={}, nodeId={}, time={}ms",
                        taskId, nodeId, result.getExecutionTimeMs());
            } else {
                taskNode.setStatus("failed");
                taskNode.setErrorMessage(result.getErrorMessage());
                taskNodeMapper.updateById(taskNode);

                log.error("节点执行失败: taskId={}, nodeId={}, error={}",
                        taskId, nodeId, result.getErrorMessage());
                throw new RuntimeException("节点执行失败: " + result.getErrorMessage());
            }

        } catch (Exception e) {
            taskNode.setStatus("failed");
            taskNode.setErrorMessage(e.getMessage());
            taskNode.setCompletedAt(LocalDateTime.now());
            taskNodeMapper.updateById(taskNode);

            log.error("节点执行异常: taskId={}, nodeId={}, error={}",
                    taskId, nodeId, e.getMessage(), e);
            throw new RuntimeException("节点执行异常: " + e.getMessage(), e);
        }
    }

    /**
     * 创建任务节点执行记录
     */
    private TaskNode createTaskNodeRecord(UUID taskId, String nodeId, WorkflowNode node) {
        TaskNode taskNode = new TaskNode();
        taskNode.setId(UUID.randomUUID());
        taskNode.setTaskId(taskId);
        taskNode.setNodeId(nodeId);
        taskNode.setNodeName(node != null ? node.getName() : "节点-" + nodeId);
        taskNode.setModelId(node != null ? node.getModelId() : null);
        taskNode.setStatus("pending");
        taskNode.setProgress(0);
        taskNode.setCreatedAt(LocalDateTime.now());
        taskNode.setUpdatedAt(LocalDateTime.now());

        taskNodeMapper.insert(taskNode);
        return taskNode;
    }

    /**
     * 解析资源限制
     */
    private ResourceLimits parseResourceLimits(String resourcesJson) {
        ResourceLimits limits = new ResourceLimits();
        limits.setCpuLimit(2000000000L); // 默认 2 CPUs
        limits.setMemoryLimit(4L * 1024 * 1024 * 1024); // 默认 4GB

        if (resourcesJson != null && !resourcesJson.isEmpty()) {
            try {
                JsonNode resources = objectMapper.readTree(resourcesJson);
                if (resources.has("cpu")) {
                    // CPU 以核数为单位，转换为 nanocpus
                    double cpuCores = resources.get("cpu").asDouble();
                    limits.setCpuLimit((long) (cpuCores * 1000000000L));
                }
                if (resources.has("memory")) {
                    // 内存以 MB 为单位
                    long memoryMB = resources.get("memory").asLong();
                    limits.setMemoryLimit(memoryMB * 1024 * 1024);
                }
            } catch (Exception e) {
                log.warn("解析资源限制失败: {}", e.getMessage());
            }
        }

        return limits;
    }

    /**
     * 构建环境变量
     */
    private Map<String, String> buildEnvironmentVariables(WorkflowNode node, UUID taskId, String nodeId) {
        Map<String, String> envVars = new HashMap<>();

        // 系统环境变量
        envVars.put("TASK_ID", taskId.toString());
        envVars.put("NODE_ID", nodeId);
        envVars.put("WORKING_DIR", "/workspace");

        // 节点配置中的环境变量
        if (node != null && node.getConfig() != null) {
            Object envObj = node.getConfig().get("env");
            if (envObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nodeEnv = (Map<String, Object>) envObj;
                for (Map.Entry<String, Object> entry : nodeEnv.entrySet()) {
                    envVars.put(entry.getKey(), String.valueOf(entry.getValue()));
                }
            }
        }

        return envVars;
    }

    /**
     * 构建卷挂载
     */
    private Map<String, String> buildVolumeMounts(UUID taskId, String nodeId, WorkflowNode node) {
        Map<String, String> mounts = new HashMap<>();

        // 数据目录挂载
        String dataDir = System.getProperty("user.dir") + "/data/tasks/" + taskId + "/" + nodeId;
        File dataDirFile = new File(dataDir);
        if (!dataDirFile.exists()) {
            dataDirFile.mkdirs();
        }
        mounts.put(dataDir, "/workspace/data");

        // 输出目录挂载
        String outputDir = System.getProperty("user.dir") + "/output/tasks/" + taskId + "/" + nodeId;
        File outputDirFile = new File(outputDir);
        if (!outputDirFile.exists()) {
            outputDirFile.mkdirs();
        }
        mounts.put(outputDir, "/workspace/output");

        // 节点配置中的额外挂载
        if (node != null && node.getConfig() != null) {
            Object volumesObj = node.getConfig().get("volumes");
            if (volumesObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, String>> volumes = (List<Map<String, String>>) volumesObj;
                for (Map<String, String> volume : volumes) {
                    String hostPath = volume.get("host");
                    String containerPath = volume.get("container");
                    if (hostPath != null && containerPath != null) {
                        File hostDir = new File(hostPath);
                        if (!hostDir.exists()) {
                            hostDir.mkdirs();
                        }
                        mounts.put(hostPath, containerPath);
                    }
                }
            }
        }

        return mounts;
    }

    /**
     * 构建执行命令
     */
    private List<String> buildCommand(WorkflowNode node) {
        if (node == null || node.getConfig() == null) {
            return null;
        }

        Object commandObj = node.getConfig().get("command");
        if (commandObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> command = new ArrayList<>();
            for (Object item : (List<?>) commandObj) {
                command.add(String.valueOf(item));
            }
            return command;
        }

        if (commandObj instanceof String) {
            return Arrays.asList("/bin/sh", "-c", (String) commandObj);
        }

        return null;
    }

    /**
     * 构建节点输出
     */
    private String buildNodeOutputs(DockerExecutor.ExecutionResult result) {
        Map<String, Object> outputs = new HashMap<>();
        outputs.put("exitCode", result.getExitCode());
        outputs.put("executionTimeMs", result.getExecutionTimeMs());
        outputs.put("containerId", result.getContainerId());

        // 输出文件路径（基于卷挂载约定）
        outputs.put("outputPath", "/workspace/output");

        try {
            return objectMapper.writeValueAsString(outputs);
        } catch (Exception e) {
            log.warn("构建节点输出 JSON 失败: {}", e.getMessage());
            return "{}";
        }
    }

    /**
     * 资源限制内部类
     */
    @lombok.Data
    private static class ResourceLimits {
        private Long cpuLimit;      // nanocpus
        private Long memoryLimit;   // bytes
    }

    /**
     * 取消任务
     */
    public boolean cancelTask(UUID taskId) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            return false;
        }

        // 只有处于 PENDING、QUEUED、RUNNING 状态的任务可以取消
        TaskStatus currentStatus = TaskStatus.valueOf(task.getStatus());
        if (currentStatus != TaskStatus.PENDING &&
            currentStatus != TaskStatus.QUEUED &&
            currentStatus != TaskStatus.RUNNING) {
            log.warn("任务状态不允许取消: taskId={}, status={}", taskId, task.getStatus());
            return false;
        }

        // 设置取消标志
        cancelFlags.put(taskId, true);

        // 更新状态
        updateTaskStatus(taskId, TaskStatus.CANCELLED, task.getProgress(), "用户取消");

        // 发布任务取消事件
        progressPublisher.publishTaskCancelled(taskId);

        log.info("任务已取消: taskId={}", taskId);
        return true;
    }

    /**
     * 重试任务
     */
    @Transactional
    public Task retryTask(UUID taskId) {
        Task oldTask = taskMapper.selectById(taskId);
        if (oldTask == null) {
            throw new IllegalArgumentException("任务不存在: " + taskId);
        }

        // 检查原任务状态
        TaskStatus oldStatus = TaskStatus.valueOf(oldTask.getStatus());
        if (oldStatus != TaskStatus.FAILED && oldStatus != TaskStatus.CANCELLED) {
            throw new IllegalArgumentException("只有失败或取消的任务可以重试");
        }

        // 检查重试次数
        int retryCount = retryCounts.getOrDefault(taskId, 0);
        if (retryCount >= MAX_RETRY_COUNT) {
            throw new IllegalStateException("任务已达到最大重试次数: " + MAX_RETRY_COUNT);
        }

        retryCounts.put(taskId, retryCount + 1);

        // 创建新任务
        Task newTask = new Task();
        newTask.setId(UUID.randomUUID());
        newTask.setWorkflowId(oldTask.getWorkflowId());
        newTask.setName(oldTask.getName() + "_retry_" + (retryCount + 1));
        newTask.setStatus(TaskStatus.PENDING.name());
        newTask.setProgress(0);
        newTask.setInputs(oldTask.getInputs());
        newTask.setTriggeredBy(oldTask.getTriggeredBy());
        newTask.setCreatedAt(LocalDateTime.now());
        newTask.setUpdatedAt(LocalDateTime.now());

        taskMapper.insert(newTask);

        log.info("任务已重试: oldTaskId={}, newTaskId={}, retryCount={}",
                taskId, newTask.getId(), retryCount + 1);

        // 重新获取工作流定义并异步执行
        Workflow workflow = workflowMapper.selectById(oldTask.getWorkflowId());
        if (workflow != null) {
            WorkflowDefinition definition = dagParser.parse(workflow.getDefinition());
            executeTaskAsync(newTask, definition);
        } else {
            log.error("重试失败，工作流不存在: workflowId={}", oldTask.getWorkflowId());
            updateTaskStatus(newTask.getId(), TaskStatus.FAILED, 0, "工作流不存在");
        }

        return newTask;
    }

    /**
     * 更新任务状态
     */
    @Transactional
    public void updateTaskStatus(UUID taskId, TaskStatus status, Integer progress, String message) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            return;
        }

        task.setStatus(status.name());
        if (progress != null) {
            task.setProgress(progress);
        }
        task.setUpdatedAt(LocalDateTime.now());

        taskMapper.updateById(task);

        log.debug("任务状态更新: taskId={}, status={}, progress={}%", taskId, status, progress);

        // 发送 WebSocket 通知
        progressPublisher.publishTaskStatus(taskId, status, progress, message);
    }

    /**
     * 检查任务是否被取消
     */
    public boolean isCancelled(UUID taskId) {
        return cancelFlags.getOrDefault(taskId, false);
    }

    /**
     * 获取任务执行状态
     */
    public TaskExecutionInfo getTaskExecutionInfo(UUID taskId) {
        Task task = taskMapper.selectById(taskId);
        if (task == null) {
            return null;
        }

        TaskExecutionInfo info = new TaskExecutionInfo();
        info.setTaskId(taskId);
        info.setStatus(TaskStatus.valueOf(task.getStatus()));
        info.setProgress(task.getProgress());
        info.setStartedAt(task.getStartedAt());
        info.setCompletedAt(task.getCompletedAt());
        info.setCancelled(isCancelled(taskId));

        return info;
    }

    /**
     * 调度任务（从消息队列）
     */
    public void scheduleTask(TaskMessage message) {
        log.info("调度任务: taskId={}", message.getTaskId());

        Task task = taskMapper.selectById(message.getTaskId());
        if (task == null) {
            log.error("调度失败，任务不存在: taskId={}", message.getTaskId());
            return;
        }

        Workflow workflow = workflowMapper.selectById(task.getWorkflowId());
        if (workflow == null) {
            log.error("调度失败，工作流不存在: workflowId={}", task.getWorkflowId());
            updateTaskStatus(task.getId(), TaskStatus.FAILED, 0, "工作流不存在");
            return;
        }

        WorkflowDefinition definition = dagParser.parse(workflow.getDefinition());
        DagParser.ValidationResult validation = dagParser.validate(definition);

        if (!validation.isValid()) {
            log.error("调度失败，工作流定义无效: taskId={}, error={}",
                    task.getId(), validation.getErrorMessage());
            updateTaskStatus(task.getId(), TaskStatus.FAILED, 0, validation.getErrorMessage());
            return;
        }

        executeTaskAsync(task, definition);
    }

    /**
     * 调度分析任务
     */
    public void scheduleAnalysis(TaskMessage message) {
        log.info("调度分析任务: taskId={}", message.getTaskId());

        Task task = taskMapper.selectById(message.getTaskId());
        if (task == null) {
            log.error("调度失败，任务不存在: taskId={}", message.getTaskId());
            return;
        }

        // 分析任务使用相同的工作流执行路径
        scheduleTask(message);
    }

    /**
     * 调度验证任务
     */
    public void scheduleValidation(TaskMessage message) {
        log.info("调度验证任务: taskId={}", message.getTaskId());

        Task task = taskMapper.selectById(message.getTaskId());
        if (task == null) {
            log.error("调度失败，任务不存在: taskId={}", message.getTaskId());
            return;
        }

        // 验证任务使用相同的工作流执行路径
        scheduleTask(message);
    }

    /**
     * 关闭调度器（Spring 容器销毁时自动调用）
     */
    @PreDestroy
    public void shutdown() {
        log.info("关闭任务调度器...");

        // 清理所有运行中的 Docker 容器
        if (dockerExecutor != null) {
            dockerExecutor.cleanupAll();
        }

        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
        }
    }

    /**
     * 任务状态枚举
     */
    public enum TaskStatus {
        PENDING,    // 待执行
        QUEUED,     // 已入队
        RUNNING,    // 运行中
        COMPLETED,  // 已完成
        FAILED,     // 失败
        CANCELLED   // 已取消
    }

    /**
     * 节点执行状态
     */
    private enum ExecutionStatus {
        PENDING,    // 待执行
        RUNNING,    // 运行中
        COMPLETED,  // 已完成
        FAILED      // 失败
    }

    /**
     * 任务执行信息
     */
    @lombok.Data
    public static class TaskExecutionInfo {
        private UUID taskId;
        private TaskStatus status;
        private Integer progress;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private Boolean cancelled;
    }
}
