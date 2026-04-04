package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.Task;
import com.example.testproject.entity.Workflow;

import java.util.List;
import java.util.UUID;

/**
 * 工作流服务接口
 */
public interface WorkflowService extends IService<Workflow> {
    
    /**
     * 创建工作流
     */
    Workflow createWorkflow(Workflow workflow, UUID ownerId);
    
    /**
     * 获取用户的工作流列表
     */
    List<Workflow> getUserWorkflows(UUID userId);
    
    /**
     * 运行工作流
     */
    Task runWorkflow(UUID workflowId, String inputs, UUID triggeredBy);
    
    /**
     * 更新最后运行时间
     */
    void updateLastRun(UUID workflowId);
}
