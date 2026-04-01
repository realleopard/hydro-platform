package com.example.testproject.controller;

import com.example.testproject.common.Result;
import com.example.testproject.entity.TaskNode;
import com.example.testproject.service.TaskNodeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 任务节点控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/tasks/{taskId}/nodes")
public class TaskNodeController {

    private final TaskNodeService taskNodeService;

    public TaskNodeController(TaskNodeService taskNodeService) {
        this.taskNodeService = taskNodeService;
    }

    /**
     * 获取任务的节点执行列表
     */
    @GetMapping
    public Result<List<TaskNode>> getTaskNodes(@PathVariable UUID taskId) {
        log.debug("获取任务节点列表: taskId={}", taskId);
        List<TaskNode> nodes = taskNodeService.getTaskNodes(taskId);
        return Result.success(nodes);
    }

    /**
     * 获取节点详情
     */
    @GetMapping("/{nodeId}")
    public Result<TaskNode> getTaskNode(@PathVariable UUID taskId, @PathVariable UUID nodeId) {
        log.debug("获取节点详情: taskId={}, nodeId={}", taskId, nodeId);
        TaskNode node = taskNodeService.getTaskNode(nodeId);
        if (node == null || !node.getTaskId().equals(taskId)) {
            return Result.error(404, "节点不存在");
        }
        return Result.success(node);
    }

    /**
     * 获取节点日志
     */
    @GetMapping("/{nodeId}/logs")
    public Result<String> getNodeLogs(@PathVariable UUID taskId, @PathVariable UUID nodeId) {
        log.debug("获取节点日志: taskId={}, nodeId={}", taskId, nodeId);
        TaskNode node = taskNodeService.getTaskNode(nodeId);
        if (node == null || !node.getTaskId().equals(taskId)) {
            return Result.error(404, "节点不存在");
        }
        return Result.success(node.getLogs());
    }

    /**
     * 获取任务节点统计
     */
    @GetMapping("/statistics")
    public Result<Map<String, Integer>> getTaskNodeStatistics(@PathVariable UUID taskId) {
        log.debug("获取任务节点统计: taskId={}", taskId);
        Map<String, Integer> statistics = taskNodeService.getTaskNodeStatistics(taskId);
        return Result.success(statistics);
    }

    /**
     * 重试节点
     */
    @PostMapping("/{nodeId}/retry")
    public Result<TaskNode> retryNode(@PathVariable UUID taskId, @PathVariable UUID nodeId) {
        log.info("重试节点: taskId={}, nodeId={}", taskId, nodeId);
        try {
            TaskNode newNode = taskNodeService.retryNode(nodeId);
            return Result.success(newNode);
        } catch (IllegalArgumentException e) {
            return Result.error(404, e.getMessage());
        } catch (IllegalStateException e) {
            return Result.error(400, e.getMessage());
        }
    }
}
