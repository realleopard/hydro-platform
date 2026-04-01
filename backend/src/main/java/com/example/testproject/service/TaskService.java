package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.Task;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 任务服务接口
 */
public interface TaskService extends IService<Task> {

    /**
     * 创建任务
     */
    Task createTask(Task task);

    /**
     * 获取工作流的任务列表
     */
    List<Task> getWorkflowTasks(UUID workflowId);

    /**
     * 获取用户的任务列表
     */
    List<Task> getUserTasks(UUID userId);

    /**
     * 更新任务状态
     */
    void updateStatus(UUID taskId, String status);

    /**
     * 更新任务进度
     */
    void updateProgress(UUID taskId, Integer progress);

    /**
     * 取消任务
     */
    void cancelTask(UUID taskId);

    /**
     * 获取任务日志（聚合所有节点日志）
     */
    String getTaskLogs(UUID taskId);

    /**
     * 获取任务统计信息
     */
    Map<String, Object> getTaskStatistics(UUID userId);
}
