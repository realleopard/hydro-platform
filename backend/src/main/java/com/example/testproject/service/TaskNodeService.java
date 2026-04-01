package com.example.testproject.service;

import com.example.testproject.dto.ExecutionPlan;
import com.example.testproject.dto.WorkflowDefinition;
import com.example.testproject.dto.WorkflowNode;
import com.example.testproject.entity.TaskNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 任务节点服务接口
 */
public interface TaskNodeService {

    /**
     * 创建任务节点执行记录
     */
    TaskNode createTaskNode(UUID taskId, String nodeId, WorkflowNode nodeDef, Integer executionOrder);

    /**
     * 更新节点状态
     */
    void updateNodeStatus(UUID nodeId, TaskNodeStatus status);

    /**
     * 更新节点进度
     */
    void updateNodeProgress(UUID nodeId, Integer progress);

    /**
     * 更新节点容器信息
     */
    void updateContainerInfo(UUID nodeId, String containerId, String podName, String nodeHostname);

    /**
     * 追加节点日志
     */
    void appendNodeLog(UUID nodeId, String log);

    /**
     * 完成节点执行
     */
    void completeNode(UUID nodeId, String outputs, String resourceUsage);

    /**
     * 标记节点失败
     */
    void failNode(UUID nodeId, String errorMessage);

    /**
     * 获取任务的节点执行列表
     */
    List<TaskNode> getTaskNodes(UUID taskId);

    /**
     * 获取节点详情
     */
    TaskNode getTaskNode(UUID nodeId);

    /**
     * 获取任务节点统计
     */
    Map<String, Integer> getTaskNodeStatistics(UUID taskId);

    /**
     * 检查任务是否所有节点都已完成
     */
    boolean isAllNodesCompleted(UUID taskId);

    /**
     * 重试失败节点
     */
    TaskNode retryNode(UUID nodeId);

    /**
     * 节点状态枚举
     */
    enum TaskNodeStatus {
        PENDING,    // 待执行
        RUNNING,    // 运行中
        COMPLETED,  // 已完成
        FAILED,     // 失败
        CANCELLED,  // 已取消
        SKIPPED     // 已跳过
    }
}
