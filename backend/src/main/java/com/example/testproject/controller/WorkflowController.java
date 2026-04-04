package com.example.testproject.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.entity.Task;
import com.example.testproject.entity.Workflow;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 工作流控制器
 */
@RestController
@RequestMapping("/api/v1/workflows")
@RequiredArgsConstructor
public class WorkflowController {
    
    private final WorkflowService workflowService;
    
    /**
     * 获取工作流列表
     */
    @GetMapping("")
    public Result<Page<Workflow>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Page<Workflow> pageParam = new Page<>(page, size);
        Page<Workflow> result = workflowService.page(pageParam);
        return Result.success(result);
    }
    
    /**
     * 获取用户工作流列表
     */
    @GetMapping("/my")
    public Result<List<Workflow>> getMyWorkflows(@CurrentUser UUID userId) {
        List<Workflow> workflows = workflowService.getUserWorkflows(userId);
        return Result.success(workflows);
    }
    
    /**
     * 创建工作流
     */
    @PostMapping("")
    public Result<Workflow> create(@RequestBody Workflow workflow, @CurrentUser UUID userId) {
        Workflow created = workflowService.createWorkflow(workflow, userId);
        return Result.success(created);
    }
    
    /**
     * 获取工作流详情
     */
    @GetMapping("/{id}")
    public Result<Workflow> get(@PathVariable UUID id) {
        Workflow workflow = workflowService.getById(id);
        if (workflow == null) {
            return Result.error("工作流不存在");
        }
        return Result.success(workflow);
    }
    
    /**
     * 更新工作流
     */
    @PutMapping("/{id}")
    public Result<Workflow> update(@PathVariable UUID id, @RequestBody Workflow workflow) {
        workflow.setId(id);
        workflowService.updateById(workflow);
        return Result.success(workflowService.getById(id));
    }
    
    /**
     * 删除工作流
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable UUID id) {
        workflowService.removeById(id);
        return Result.success(null);
    }
    
    /**
     * 运行工作流
     */
    @PostMapping("/{id}/run")
    public Result<Task> run(@PathVariable UUID id, @RequestBody(required = false) Map<String, Object> body, @CurrentUser UUID userId) {
        String inputs = null;
        if (body != null && body.containsKey("inputs")) {
            Object inputsObj = body.get("inputs");
            if (inputsObj instanceof String) {
                inputs = (String) inputsObj;
            } else if (inputsObj != null) {
                inputs = inputsObj.toString();
            }
        }
        Task task = workflowService.runWorkflow(id, inputs, userId);
        return Result.success(task);
    }
}
