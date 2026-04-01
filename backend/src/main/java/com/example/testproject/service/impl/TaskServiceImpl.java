package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.Task;
import com.example.testproject.mapper.TaskMapper;
import com.example.testproject.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 任务服务实现
 */
@Service
@RequiredArgsConstructor
public class TaskServiceImpl extends ServiceImpl<TaskMapper, Task> implements TaskService {
    
    @Override
    @Transactional
    public Task createTask(Task task) {
        task.setStatus("pending");
        task.setProgress(0);
        save(task);
        return task;
    }
    
    @Override
    public List<Task> getWorkflowTasks(UUID workflowId) {
        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Task::getWorkflowId, workflowId)
               .orderByDesc(Task::getCreatedAt);
        return list(wrapper);
    }
    
    @Override
    public List<Task> getUserTasks(UUID userId) {
        LambdaQueryWrapper<Task> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Task::getTriggeredBy, userId)
               .orderByDesc(Task::getCreatedAt);
        return list(wrapper);
    }
    
    @Override
    @Transactional
    public void updateStatus(UUID taskId, String status) {
        Task task = getById(taskId);
        if (task != null) {
            task.setStatus(status);
            if ("running".equals(status)) {
                task.setStartedAt(LocalDateTime.now());
            } else if ("completed".equals(status) || "failed".equals(status)) {
                task.setCompletedAt(LocalDateTime.now());
            }
            updateById(task);
        }
    }
    
    @Override
    @Transactional
    public void updateProgress(UUID taskId, Integer progress) {
        Task task = getById(taskId);
        if (task != null) {
            task.setProgress(progress);
            updateById(task);
        }
    }
    
    @Override
    @Transactional
    public void cancelTask(UUID taskId) {
        Task task = getById(taskId);
        if (task != null && !"completed".equals(task.getStatus()) && !"failed".equals(task.getStatus())) {
            task.setStatus("cancelled");
            task.setCompletedAt(LocalDateTime.now());
            updateById(task);
        }
    }
    
    @Override
    public String getTaskLogs(UUID taskId) {
        // TODO: 实现从日志存储获取任务日志
        return "任务日志功能待实现";
    }
}
