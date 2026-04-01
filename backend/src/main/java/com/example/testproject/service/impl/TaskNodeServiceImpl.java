package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.testproject.dto.WorkflowNode;
import com.example.testproject.entity.TaskNode;
import com.example.testproject.mapper.TaskNodeMapper;
import com.example.testproject.service.TaskNodeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 任务节点服务实现
 */
@Slf4j
@Service
public class TaskNodeServiceImpl implements TaskNodeService {

    private final TaskNodeMapper taskNodeMapper;

    public TaskNodeServiceImpl(TaskNodeMapper taskNodeMapper) {
        this.taskNodeMapper = taskNodeMapper;
    }

    @Override
    @Transactional
    public TaskNode createTaskNode(UUID taskId, String nodeId, WorkflowNode nodeDef, Integer executionOrder) {
        TaskNode taskNode = new TaskNode();
        taskNode.setId(UUID.randomUUID());
        taskNode.setTaskId(taskId);
        taskNode.setNodeId(nodeId);
        taskNode.setNodeName(nodeDef.getName());
        taskNode.setModelId(nodeDef.getModelId());
        taskNode.setStatus(TaskNodeStatus.PENDING.name());
        taskNode.setProgress(0);
        taskNode.setExecutionOrder(executionOrder);
        taskNode.setRetryCount(0);
        taskNode.setCreatedAt(LocalDateTime.now());
        taskNode.setUpdatedAt(LocalDateTime.now());

        taskNodeMapper.insert(taskNode);

        log.debug("创建任务节点: taskId={}, nodeId={}, nodeName={}", taskId, nodeId, nodeDef.getName());
        return taskNode;
    }

    @Override
    @Transactional
    public void updateNodeStatus(UUID nodeId, TaskNodeStatus status) {
        TaskNode node = taskNodeMapper.selectById(nodeId);
        if (node == null) {
            throw new IllegalArgumentException("节点不存在: " + nodeId);
        }

        node.setStatus(status.name());
        node.setUpdatedAt(LocalDateTime.now());

        if (status == TaskNodeStatus.RUNNING && node.getStartedAt() == null) {
            node.setStartedAt(LocalDateTime.now());
        }

        if (status == TaskNodeStatus.COMPLETED || status == TaskNodeStatus.FAILED || status == TaskNodeStatus.CANCELLED) {
            node.setCompletedAt(LocalDateTime.now());
        }

        taskNodeMapper.updateById(node);

        log.debug("更新节点状态: nodeId={}, status={}", nodeId, status);
    }

    @Override
    @Transactional
    public void updateNodeProgress(UUID nodeId, Integer progress) {
        if (progress < 0 || progress > 100) {
            throw new IllegalArgumentException("进度必须在 0-100 之间");
        }

        TaskNode node = taskNodeMapper.selectById(nodeId);
        if (node == null) {
            throw new IllegalArgumentException("节点不存在: " + nodeId);
        }

        node.setProgress(progress);
        node.setUpdatedAt(LocalDateTime.now());
        taskNodeMapper.updateById(node);
    }

    @Override
    @Transactional
    public void updateContainerInfo(UUID nodeId, String containerId, String podName, String nodeHostname) {
        TaskNode node = taskNodeMapper.selectById(nodeId);
        if (node == null) {
            throw new IllegalArgumentException("节点不存在: " + nodeId);
        }

        node.setContainerId(containerId);
        node.setPodName(podName);
        node.setNodeHostname(nodeHostname);
        node.setUpdatedAt(LocalDateTime.now());
        taskNodeMapper.updateById(node);

        log.debug("更新节点容器信息: nodeId={}, containerId={}", nodeId, containerId);
    }

    @Override
    @Transactional
    public void appendNodeLog(UUID nodeId, String logContent) {
        if (logContent == null || logContent.isEmpty()) {
            return;
        }

        TaskNode node = taskNodeMapper.selectById(nodeId);
        if (node == null) {
            return;
        }

        // 添加时间戳
        String timestampedLog = String.format("[%s] %s\n", LocalDateTime.now(), logContent);

        // 使用数据库追加
        taskNodeMapper.appendLog(nodeId, timestampedLog);

        log.debug("追加节点日志: nodeId={}, log={}", nodeId, logContent.substring(0, Math.min(logContent.length(), 100)));
    }

    @Override
    @Transactional
    public void completeNode(UUID nodeId, String outputs, String resourceUsage) {
        TaskNode node = taskNodeMapper.selectById(nodeId);
        if (node == null) {
            throw new IllegalArgumentException("节点不存在: " + nodeId);
        }

        node.setStatus(TaskNodeStatus.COMPLETED.name());
        node.setProgress(100);
        node.setOutputs(outputs);
        node.setResourceUsage(resourceUsage);
        node.setCompletedAt(LocalDateTime.now());
        node.setUpdatedAt(LocalDateTime.now());

        taskNodeMapper.updateById(node);

        log.info("节点执行完成: nodeId={}", nodeId);
    }

    @Override
    @Transactional
    public void failNode(UUID nodeId, String errorMessage) {
        TaskNode node = taskNodeMapper.selectById(nodeId);
        if (node == null) {
            throw new IllegalArgumentException("节点不存在: " + nodeId);
        }

        node.setStatus(TaskNodeStatus.FAILED.name());
        node.setErrorMessage(errorMessage);
        node.setCompletedAt(LocalDateTime.now());
        node.setUpdatedAt(LocalDateTime.now());

        taskNodeMapper.updateById(node);

        log.error("节点执行失败: nodeId={}, error={}", nodeId, errorMessage);
    }

    @Override
    public List<TaskNode> getTaskNodes(UUID taskId) {
        return taskNodeMapper.selectByTaskId(taskId);
    }

    @Override
    public TaskNode getTaskNode(UUID nodeId) {
        return taskNodeMapper.selectById(nodeId);
    }

    @Override
    public Map<String, Integer> getTaskNodeStatistics(UUID taskId) {
        List<HashMap<String, Object>> counts = taskNodeMapper.countByStatus(taskId);
        Map<String, Integer> statistics = new HashMap<>();

        for (HashMap<String, Object> count : counts) {
            String status = (String) count.get("status");
            Long countValue = (Long) count.get("count");
            statistics.put(status, countValue.intValue());
        }

        return statistics;
    }

    @Override
    public boolean isAllNodesCompleted(UUID taskId) {
        Map<String, Integer> statistics = getTaskNodeStatistics(taskId);

        // 检查是否有正在运行或待执行的节点
        int pendingCount = statistics.getOrDefault(TaskNodeStatus.PENDING.name(), 0);
        int runningCount = statistics.getOrDefault(TaskNodeStatus.RUNNING.name(), 0);

        return pendingCount == 0 && runningCount == 0;
    }

    @Override
    @Transactional
    public TaskNode retryNode(UUID nodeId) {
        TaskNode oldNode = taskNodeMapper.selectById(nodeId);
        if (oldNode == null) {
            throw new IllegalArgumentException("节点不存在: " + nodeId);
        }

        // 只有失败或取消的节点可以重试
        TaskNodeStatus currentStatus = TaskNodeStatus.valueOf(oldNode.getStatus());
        if (currentStatus != TaskNodeStatus.FAILED && currentStatus != TaskNodeStatus.CANCELLED) {
            throw new IllegalStateException("只有失败或取消的节点可以重试");
        }

        // 创建新节点记录
        TaskNode newNode = new TaskNode();
        newNode.setId(UUID.randomUUID());
        newNode.setTaskId(oldNode.getTaskId());
        newNode.setNodeId(oldNode.getNodeId());
        newNode.setNodeName(oldNode.getNodeName());
        newNode.setModelId(oldNode.getModelId());
        newNode.setStatus(TaskNodeStatus.PENDING.name());
        newNode.setProgress(0);
        newNode.setExecutionOrder(oldNode.getExecutionOrder());
        newNode.setRetryCount(oldNode.getRetryCount() + 1);
        newNode.setInputs(oldNode.getInputs());
        newNode.setCreatedAt(LocalDateTime.now());
        newNode.setUpdatedAt(LocalDateTime.now());

        taskNodeMapper.insert(newNode);

        log.info("节点已重试: oldNodeId={}, newNodeId={}, nodeId={}", nodeId, newNode.getId(), oldNode.getNodeId());

        return newNode;
    }
}
