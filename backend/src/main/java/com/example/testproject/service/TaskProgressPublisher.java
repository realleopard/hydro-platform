package com.example.testproject.service;

import com.example.testproject.websocket.TaskWebSocketHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * 任务进度发布服务
 * 用于将任务状态更新推送到 WebSocket
 */
@Slf4j
@Service
public class TaskProgressPublisher {

    private final TaskWebSocketHandler webSocketHandler;

    public TaskProgressPublisher(TaskWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    /**
     * 发布任务状态更新
     */
    public void publishTaskStatus(UUID taskId, TaskScheduler.TaskStatus status,
                                   Integer progress, String message) {
        try {
            webSocketHandler.broadcastTaskStatus(taskId, status, progress, message);
        } catch (Exception e) {
            log.error("发布任务状态失败: taskId={}, error={}", taskId, e.getMessage());
        }
    }

    /**
     * 发布任务日志
     */
    public void publishTaskLog(UUID taskId, String level, String message) {
        try {
            webSocketHandler.sendTaskLog(taskId, level, message);
        } catch (Exception e) {
            log.error("发布任务日志失败: taskId={}, error={}", taskId, e.getMessage());
        }
    }

    /**
     * 发布任务开始
     */
    public void publishTaskStarted(UUID taskId) {
        publishTaskStatus(taskId, TaskScheduler.TaskStatus.RUNNING, 0, "任务开始执行");
        publishTaskLog(taskId, "info", "任务开始执行");
    }

    /**
     * 发布任务进度
     */
    public void publishTaskProgress(UUID taskId, int progress, String message) {
        publishTaskStatus(taskId, TaskScheduler.TaskStatus.RUNNING, progress, message);
    }

    /**
     * 发布任务完成
     */
    public void publishTaskCompleted(UUID taskId) {
        publishTaskStatus(taskId, TaskScheduler.TaskStatus.COMPLETED, 100, "任务执行完成");
        publishTaskLog(taskId, "info", "任务执行完成");
    }

    /**
     * 发布任务失败
     */
    public void publishTaskFailed(UUID taskId, String errorMessage) {
        publishTaskStatus(taskId, TaskScheduler.TaskStatus.FAILED, null, errorMessage);
        publishTaskLog(taskId, "error", errorMessage);
    }

    /**
     * 发布任务取消
     */
    public void publishTaskCancelled(UUID taskId) {
        publishTaskStatus(taskId, TaskScheduler.TaskStatus.CANCELLED, null, "任务已取消");
        publishTaskLog(taskId, "warning", "任务已取消");
    }

    /**
     * 发布节点开始执行
     */
    public void publishNodeStarted(UUID taskId, String nodeId, String nodeName) {
        String message = String.format("节点 [%s] 开始执行", nodeName);
        publishTaskLog(taskId, "info", message);
    }

    /**
     * 发布节点完成
     */
    public void publishNodeCompleted(UUID taskId, String nodeId, String nodeName) {
        String message = String.format("节点 [%s] 执行完成", nodeName);
        publishTaskLog(taskId, "info", message);
    }

    /**
     * 发布节点失败
     */
    public void publishNodeFailed(UUID taskId, String nodeId, String nodeName, String error) {
        String message = String.format("节点 [%s] 执行失败: %s", nodeName, error);
        publishTaskLog(taskId, "error", message);
    }
}
