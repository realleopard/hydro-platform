package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.testproject.entity.Workflow;
import com.example.testproject.mapper.WorkflowMapper;
import com.example.testproject.service.TaskScheduler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

import java.lang.reflect.Field;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WorkflowServiceImplTest {

    private WorkflowServiceImpl workflowService;
    private WorkflowMapper workflowMapper;
    private TaskScheduler taskScheduler;

    private UUID workflowId;
    private UUID ownerId;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        workflowMapper = Mockito.mock(WorkflowMapper.class);
        taskScheduler = Mockito.mock(TaskScheduler.class);
        workflowService = Mockito.spy(new WorkflowServiceImpl(taskScheduler));

        // Use reflection to inject mock mapper into ServiceImpl base class
        Field baseMapperField = workflowService.getClass().getSuperclass().getDeclaredField("baseMapper");
        baseMapperField.setAccessible(true);
        baseMapperField.set(workflowService, workflowMapper);

        workflowId = UUID.randomUUID();
        ownerId = UUID.randomUUID();
    }

    @Test
    void testCreateWorkflow() {
        Workflow workflow = new Workflow();
        workflow.setName("测试工作流");

        doReturn(true).when(workflowService).save(any(Workflow.class));

        Workflow result = workflowService.createWorkflow(workflow, ownerId);

        assertEquals(ownerId, result.getOwnerId());
        assertEquals("active", result.getStatus());
        assertEquals(0, result.getRunCount());
        verify(workflowService).save(any(Workflow.class));
    }

    @Test
    void testCreateWorkflow_SetsAllFields() {
        Workflow workflow = new Workflow();
        workflow.setName("流域模拟");
        workflow.setDescription("测试描述");

        doReturn(true).when(workflowService).save(any(Workflow.class));

        workflowService.createWorkflow(workflow, ownerId);

        ArgumentCaptor<Workflow> captor = ArgumentCaptor.forClass(Workflow.class);
        verify(workflowService).save(captor.capture());

        Workflow saved = captor.getValue();
        assertEquals(ownerId, saved.getOwnerId());
        assertEquals("active", saved.getStatus());
        assertEquals(0, saved.getRunCount());
    }

    @Test
    void testGetUserWorkflows() {
        List<Workflow> mockWorkflows = List.of(new Workflow(), new Workflow(), new Workflow());
        doReturn(mockWorkflows).when(workflowService).list(any(LambdaQueryWrapper.class));

        List<Workflow> result = workflowService.getUserWorkflows(ownerId);

        assertEquals(3, result.size());
        verify(workflowService).list(any(LambdaQueryWrapper.class));
    }

    @Test
    void testRunWorkflow() {
        Workflow workflow = new Workflow();
        workflow.setId(workflowId);
        workflow.setRunCount(5);

        doReturn(workflow).when(workflowService).getById(workflowId);
        doReturn(true).when(workflowService).updateById(any(Workflow.class));

        workflowService.runWorkflow(workflowId, UUID.randomUUID());

        ArgumentCaptor<Workflow> captor = ArgumentCaptor.forClass(Workflow.class);
        verify(workflowService).updateById(captor.capture());

        assertEquals(6, captor.getValue().getRunCount());
        assertNotNull(captor.getValue().getLastRunAt());
    }

    @Test
    void testRunWorkflow_IncrementsRunCount() {
        Workflow workflow = new Workflow();
        workflow.setId(workflowId);
        workflow.setRunCount(0);

        doReturn(workflow).when(workflowService).getById(workflowId);
        doReturn(true).when(workflowService).updateById(any(Workflow.class));

        workflowService.runWorkflow(workflowId, UUID.randomUUID());

        ArgumentCaptor<Workflow> captor = ArgumentCaptor.forClass(Workflow.class);
        verify(workflowService).updateById(captor.capture());

        assertEquals(1, captor.getValue().getRunCount());
    }

    @Test
    void testRunWorkflow_NotFound() {
        doReturn(null).when(workflowService).getById(workflowId);

        workflowService.runWorkflow(workflowId, UUID.randomUUID());

        verify(workflowService, never()).updateById(any(Workflow.class));
    }

    @Test
    void testUpdateLastRun() {
        Workflow workflow = new Workflow();
        workflow.setId(workflowId);
        workflow.setLastRunAt(null);

        doReturn(workflow).when(workflowService).getById(workflowId);
        doReturn(true).when(workflowService).updateById(any(Workflow.class));

        workflowService.updateLastRun(workflowId);

        ArgumentCaptor<Workflow> captor = ArgumentCaptor.forClass(Workflow.class);
        verify(workflowService).updateById(captor.capture());

        assertNotNull(captor.getValue().getLastRunAt());
    }

    @Test
    void testUpdateLastRun_NotFound() {
        doReturn(null).when(workflowService).getById(workflowId);

        workflowService.updateLastRun(workflowId);

        verify(workflowService, never()).updateById(any(Workflow.class));
    }
}
