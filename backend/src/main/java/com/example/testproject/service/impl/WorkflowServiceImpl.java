package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.Task;
import com.example.testproject.entity.Workflow;
import com.example.testproject.mapper.WorkflowMapper;
import com.example.testproject.service.TaskScheduler;
import com.example.testproject.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 工作流服务实现
 */
@Service
@RequiredArgsConstructor
public class WorkflowServiceImpl extends ServiceImpl<WorkflowMapper, Workflow> implements WorkflowService {

    private final TaskScheduler taskScheduler;

    @Override
    @Transactional
    public Workflow createWorkflow(Workflow workflow, UUID ownerId) {
        if (workflow.getId() == null) {
            workflow.setId(UUID.randomUUID());
        }
        workflow.setOwnerId(ownerId);
        workflow.setStatus("active");
        workflow.setRunCount(0);
        save(workflow);
        return workflow;
    }
    
    @Override
    public List<Workflow> getUserWorkflows(UUID userId) {
        LambdaQueryWrapper<Workflow> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Workflow::getOwnerId, userId)
               .orderByDesc(Workflow::getCreatedAt);
        return list(wrapper);
    }
    
    @Override
    @Transactional
    public Task runWorkflow(UUID workflowId, String inputs, UUID triggeredBy) {
        Workflow workflow = getById(workflowId);
        if (workflow == null) {
            throw new IllegalArgumentException("工作流不存在: " + workflowId);
        }

        return taskScheduler.submitTask(workflowId, inputs, triggeredBy);
    }
    
    @Override
    @Transactional
    public void updateLastRun(UUID workflowId) {
        Workflow workflow = getById(workflowId);
        if (workflow != null) {
            workflow.setLastRunAt(LocalDateTime.now());
            updateById(workflow);
        }
    }
}
