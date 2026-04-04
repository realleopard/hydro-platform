package com.example.testproject.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.entity.Task;
import com.example.testproject.entity.TaskNode;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.TaskNodeService;
import com.example.testproject.service.TaskScheduler;
import com.example.testproject.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
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

    /**
     * 获取任务列表
     */
    @GetMapping("")
    public Result<Page<Task>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Page<Task> pageParam = new Page<>(page, size);
        Page<Task> result = taskService.page(pageParam);
        return Result.success(result);
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
     * 获取任务详情
     */
    @GetMapping("/{id}")
    public Result<Task> get(@PathVariable UUID id) {
        Task task = taskService.getById(id);
        if (task == null) {
            return Result.error("任务不存在");
        }
        return Result.success(task);
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
     * 获取任务日志（聚合所有节点日志）
     */
    @GetMapping("/{id}/logs")
    public Result<List<Map<String, Object>>> getLogs(@PathVariable UUID id) {
        List<TaskNode> nodes = taskNodeService.getTaskNodes(id);
        List<Map<String, Object>> logs = nodes.stream().map(node -> {
            Map<String, Object> entry = new java.util.LinkedHashMap<>();
            entry.put("nodeId", node.getNodeId());
            entry.put("nodeName", node.getNodeName());
            entry.put("status", node.getStatus());
            entry.put("logs", node.getLogs() != null ? node.getLogs() : "");
            entry.put("errorMessage", node.getErrorMessage());
            entry.put("startedAt", node.getStartedAt());
            entry.put("completedAt", node.getCompletedAt());
            return entry;
        }).collect(Collectors.toList());
        return Result.success(logs);
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
