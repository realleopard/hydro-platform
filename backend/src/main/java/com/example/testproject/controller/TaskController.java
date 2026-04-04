package com.example.testproject.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.entity.Task;
import com.example.testproject.entity.TaskNode;
import com.example.testproject.entity.Workflow;
import com.example.testproject.mapper.WorkflowMapper;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.TaskNodeService;
import com.example.testproject.service.TaskScheduler;
import com.example.testproject.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 任务控制器
 */
@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final TaskNodeService taskNodeService;
    private final TaskScheduler taskScheduler;
    private final WorkflowMapper workflowMapper;

    /**
     * 获取任务列表（包含工作流名称，支持按工作流筛选）
     */
    @GetMapping("")
    public Result<Map<String, Object>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID workflowId) {
        Page<Task> pageParam = new Page<>(page, size);

        // 构建查询条件
        com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Task> wrapper =
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<>();
        if (status != null && !status.isEmpty()) {
            wrapper.eq(Task::getStatus, status);
        }
        if (workflowId != null) {
            wrapper.eq(Task::getWorkflowId, workflowId);
        }
        wrapper.orderByDesc(Task::getCreatedAt);

        Page<Task> result = taskService.page(pageParam, wrapper);

        // 批量查询工作流名称
        Map<UUID, String> workflowNameMap = new HashMap<>();
        for (Task task : result.getRecords()) {
            if (task.getWorkflowId() != null && !workflowNameMap.containsKey(task.getWorkflowId())) {
                try {
                    Workflow wf = workflowMapper.selectById(task.getWorkflowId());
                    workflowNameMap.put(task.getWorkflowId(), wf != null ? wf.getName() : null);
                } catch (Exception ignored) {}
            }
        }

        // 组装结果
        List<Map<String, Object>> records = new ArrayList<>();
        for (Task task : result.getRecords()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", task.getId());
            item.put("workflowId", task.getWorkflowId());
            item.put("name", task.getName());
            item.put("status", task.getStatus());
            item.put("progress", task.getProgress());
            item.put("startedAt", task.getStartedAt());
            item.put("completedAt", task.getCompletedAt());
            item.put("createdAt", task.getCreatedAt());
            item.put("updatedAt", task.getUpdatedAt());
            item.put("workflowName", workflowNameMap.getOrDefault(task.getWorkflowId(), null));
            records.add(item);
        }

        Map<String, Object> pageData = new LinkedHashMap<>();
        pageData.put("records", records);
        pageData.put("total", result.getTotal());
        pageData.put("current", result.getCurrent());
        pageData.put("size", result.getSize());
        pageData.put("pages", result.getPages());

        return Result.success(pageData);
    }

    /**
     * 获取用户任务列表
     */
    @GetMapping("/my")
    public Result<List<Task>> getMyTasks(@CurrentUser UUID userId) {
        List<Task> tasks = taskService.getUserTasks(userId);
        return Result.success(tasks);
    }

    /**
     * 获取任务详情（包含节点执行信息、资源使用、工作流名称等）
     */
    @GetMapping("/{id}")
    public Result<Map<String, Object>> get(@PathVariable UUID id) {
        Task task = taskService.getById(id);
        if (task == null) {
            return Result.error("任务不存在");
        }

        Map<String, Object> result = new LinkedHashMap<>();

        // 基本信息
        result.put("id", task.getId());
        result.put("workflowId", task.getWorkflowId());
        result.put("name", task.getName());
        result.put("status", task.getStatus());
        result.put("progress", task.getProgress());
        result.put("inputs", task.getInputs());
        result.put("outputs", task.getOutputs());
        result.put("triggeredBy", task.getTriggeredBy());
        result.put("startedAt", task.getStartedAt());
        result.put("completedAt", task.getCompletedAt());
        result.put("createdAt", task.getCreatedAt());
        result.put("updatedAt", task.getUpdatedAt());

        // 工作流名称
        String workflowName = null;
        try {
            Workflow wf = workflowMapper.selectById(task.getWorkflowId());
            if (wf != null) {
                workflowName = wf.getName();
            }
        } catch (Exception ignored) {}
        result.put("workflowName", workflowName);

        // 运行时长（秒）
        Long durationSeconds = null;
        if (task.getStartedAt() != null) {
            LocalDateTime end = task.getCompletedAt() != null ? task.getCompletedAt() : LocalDateTime.now();
            durationSeconds = Duration.between(task.getStartedAt(), end).getSeconds();
        }
        result.put("duration", durationSeconds);

        // 节点执行信息
        List<TaskNode> nodes = taskNodeService.getTaskNodes(id);
        List<Map<String, Object>> nodeList = new ArrayList<>();
        long totalCpuNanos = 0;
        long maxMemoryBytes = 0;

        for (TaskNode node : nodes) {
            Map<String, Object> nodeMap = new LinkedHashMap<>();
            nodeMap.put("id", node.getId());
            nodeMap.put("nodeId", node.getNodeId());
            nodeMap.put("nodeName", node.getNodeName());
            nodeMap.put("modelId", node.getModelId());
            nodeMap.put("status", node.getStatus());
            nodeMap.put("progress", node.getProgress());
            nodeMap.put("executionOrder", node.getExecutionOrder());
            nodeMap.put("containerId", node.getContainerId());
            nodeMap.put("outputs", node.getOutputs());
            nodeMap.put("logs", node.getLogs());
            nodeMap.put("errorMessage", node.getErrorMessage());
            nodeMap.put("retryCount", node.getRetryCount());
            nodeMap.put("startedAt", node.getStartedAt());
            nodeMap.put("completedAt", node.getCompletedAt());

            // 节点运行时长
            Long nodeDuration = null;
            if (node.getStartedAt() != null) {
                LocalDateTime end = node.getCompletedAt() != null ? node.getCompletedAt() : LocalDateTime.now();
                nodeDuration = Duration.between(node.getStartedAt(), end).getSeconds();
            }
            nodeMap.put("duration", nodeDuration);

            // 解析节点级别的 resourceUsage JSON
            Map<String, Object> nodeResource = null;
            if (node.getResourceUsage() != null && !node.getResourceUsage().isEmpty()) {
                try {
                    com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                    nodeResource = om.readValue(node.getResourceUsage(), Map.class);
                    // 累加 CPU/内存统计
                    if (nodeResource != null) {
                        if (nodeResource.get("cpuUsagePercent") != null) {
                            totalCpuNanos += ((Number) nodeResource.get("cpuUsagePercent")).longValue();
                        }
                        if (nodeResource.get("memoryUsageBytes") != null) {
                            long mem = ((Number) nodeResource.get("memoryUsageBytes")).longValue();
                            maxMemoryBytes = Math.max(maxMemoryBytes, mem);
                        }
                    }
                } catch (Exception ignored) {}
            }
            nodeMap.put("resourceUsage", nodeResource);

            nodeList.add(nodeMap);
        }
        result.put("nodes", nodeList);

        // 聚合资源使用
        Map<String, Object> resourceUsage = new LinkedHashMap<>();
        resourceUsage.put("duration", durationSeconds);
        if (!nodeList.isEmpty()) {
            resourceUsage.put("cpuUsagePercent", nodes.size() > 0 ? totalCpuNanos / nodes.size() : 0);
            resourceUsage.put("memoryUsageMB", maxMemoryBytes / (1024 * 1024));
        }
        result.put("resourceUsage", resourceUsage);

        return Result.success(result);
    }

    /**
     * 创建任务（通过工作流运行）
     */
    @PostMapping("")
    public Result<Task> create(@RequestBody Map<String, Object> body, @CurrentUser UUID userId) {
        UUID workflowId = UUID.fromString((String) body.get("workflowId"));
        String inputs = body.containsKey("inputs") ?
                (body.get("inputs") instanceof String ? (String) body.get("inputs") : null) : null;

        Task task = taskScheduler.submitTask(workflowId, inputs, userId);
        return Result.success(task);
    }

    /**
     * 重试任务
     */
    @PostMapping("/{id}/retry")
    public Result<Task> retry(@PathVariable UUID id) {
        Task task = taskScheduler.retryTask(id);
        return Result.success(task);
    }

    /**
     * 取消任务
     */
    @PostMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable UUID id) {
        taskScheduler.cancelTask(id);
        return Result.success(null);
    }

    /**
     * 删除任务
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable UUID id) {
        taskService.removeById(id);
        return Result.success(null);
    }

    /**
     * 获取任务日志（聚合所有节点日志，按时间顺序拆分为独立日志条目）
     */
    @GetMapping("/{id}/logs")
    public Result<List<Map<String, Object>>> getLogs(@PathVariable UUID id) {
        List<TaskNode> nodes = taskNodeService.getTaskNodes(id);
        List<Map<String, Object>> logEntries = new ArrayList<>();

        for (TaskNode node : nodes) {
            String nodeLogs = node.getLogs();
            if (nodeLogs != null && !nodeLogs.isEmpty()) {
                // 按行拆分日志
                String[] lines = nodeLogs.split("\n");
                for (String line : lines) {
                    if (line.trim().isEmpty()) continue;
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("id", UUID.randomUUID().toString());
                    entry.put("taskId", id.toString());
                    entry.put("nodeId", node.getNodeId());
                    entry.put("nodeName", node.getNodeName());
                    entry.put("level", "info");
                    entry.put("message", line.trim());
                    entry.put("timestamp", node.getStartedAt() != null ? node.getStartedAt().toString() : null);
                    logEntries.add(entry);
                }
            }

            // 如果有错误信息，追加为 error 级别日志
            if (node.getErrorMessage() != null && !node.getErrorMessage().isEmpty()) {
                Map<String, Object> errorEntry = new LinkedHashMap<>();
                errorEntry.put("id", UUID.randomUUID().toString());
                errorEntry.put("taskId", id.toString());
                errorEntry.put("nodeId", node.getNodeId());
                errorEntry.put("nodeName", node.getNodeName());
                errorEntry.put("level", "error");
                errorEntry.put("message", node.getErrorMessage());
                errorEntry.put("timestamp", node.getCompletedAt() != null ? node.getCompletedAt().toString() : null);
                logEntries.add(errorEntry);
            }
        }
        return Result.success(logEntries);
    }

    /**
     * 获取任务统计信息
     */
    @GetMapping("/statistics")
    public Result<Map<String, Object>> getStatistics(@CurrentUser UUID userId) {
        Map<String, Object> stats = taskService.getTaskStatistics(userId);
        return Result.success(stats);
    }
}
