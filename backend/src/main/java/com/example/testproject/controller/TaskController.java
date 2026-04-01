package com.example.testproject.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.entity.Task;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * 任务控制器
 */
@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
public class TaskController {
    
    private final TaskService taskService;
    
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
     * 取消任务
     */
    @DeleteMapping("/{id}")
    public Result<Void> cancel(@PathVariable UUID id) {
        taskService.cancelTask(id);
        return Result.success(null);
    }
    
    /**
     * 获取任务日志
     */
    @GetMapping("/{id}/logs")
    public Result<String> getLogs(@PathVariable UUID id) {
        String logs = taskService.getTaskLogs(id);
        return Result.success(logs);
    }
}
