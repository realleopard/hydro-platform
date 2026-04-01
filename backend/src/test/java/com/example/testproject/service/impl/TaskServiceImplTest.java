package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.testproject.entity.Task;
import com.example.testproject.mapper.TaskMapper;
import com.example.testproject.service.TaskNodeService;
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

class TaskServiceImplTest {

    private TaskServiceImpl taskService;
    private TaskMapper taskMapper;
    private TaskNodeService taskNodeService;

    private UUID taskId;
    private UUID workflowId;
    private UUID userId;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        taskMapper = Mockito.mock(TaskMapper.class);
        taskNodeService = Mockito.mock(TaskNodeService.class);
        taskService = Mockito.spy(new TaskServiceImpl(taskNodeService));

        // Use reflection to inject mock mapper into ServiceImpl base class
        Field baseMapperField = taskService.getClass().getSuperclass().getDeclaredField("baseMapper");
        baseMapperField.setAccessible(true);
        baseMapperField.set(taskService, taskMapper);

        taskId = UUID.randomUUID();
        workflowId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Test
    void testCreateTask() {
        Task task = new Task();
        task.setName("测试任务");
        task.setWorkflowId(workflowId);
        task.setTriggeredBy(userId);

        doReturn(true).when(taskService).save(any(Task.class));

        Task result = taskService.createTask(task);

        assertEquals("pending", result.getStatus());
        assertEquals(0, result.getProgress());
        verify(taskService).save(any(Task.class));
    }

    @Test
    void testUpdateStatus_ToRunning() {
        Task task = new Task();
        task.setId(taskId);
        task.setStatus("queued");

        doReturn(task).when(taskService).getById(taskId);
        doReturn(true).when(taskService).updateById(any(Task.class));

        taskService.updateStatus(taskId, "running");

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskService).updateById(captor.capture());

        assertEquals("running", captor.getValue().getStatus());
        assertNotNull(captor.getValue().getStartedAt());
    }

    @Test
    void testUpdateStatus_ToCompleted() {
        Task task = new Task();
        task.setId(taskId);
        task.setStatus("running");

        doReturn(task).when(taskService).getById(taskId);
        doReturn(true).when(taskService).updateById(any(Task.class));

        taskService.updateStatus(taskId, "completed");

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskService).updateById(captor.capture());

        assertEquals("completed", captor.getValue().getStatus());
        assertNotNull(captor.getValue().getCompletedAt());
    }

    @Test
    void testUpdateStatus_ToFailed() {
        Task task = new Task();
        task.setId(taskId);
        task.setStatus("running");

        doReturn(task).when(taskService).getById(taskId);
        doReturn(true).when(taskService).updateById(any(Task.class));

        taskService.updateStatus(taskId, "failed");

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskService).updateById(captor.capture());

        assertEquals("failed", captor.getValue().getStatus());
        assertNotNull(captor.getValue().getCompletedAt());
    }

    @Test
    void testUpdateStatus_TaskNotFound() {
        doReturn(null).when(taskService).getById(taskId);

        taskService.updateStatus(taskId, "running");

        verify(taskService, never()).updateById(any(Task.class));
    }

    @Test
    void testUpdateProgress() {
        Task task = new Task();
        task.setId(taskId);
        task.setProgress(0);

        doReturn(task).when(taskService).getById(taskId);
        doReturn(true).when(taskService).updateById(any(Task.class));

        taskService.updateProgress(taskId, 75);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskService).updateById(captor.capture());

        assertEquals(75, captor.getValue().getProgress());
    }

    @Test
    void testUpdateProgress_TaskNotFound() {
        doReturn(null).when(taskService).getById(taskId);

        taskService.updateProgress(taskId, 50);

        verify(taskService, never()).updateById(any(Task.class));
    }

    @Test
    void testCancelTask_PendingTask() {
        Task task = new Task();
        task.setId(taskId);
        task.setStatus("pending");

        doReturn(task).when(taskService).getById(taskId);
        doReturn(true).when(taskService).updateById(any(Task.class));

        taskService.cancelTask(taskId);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskService).updateById(captor.capture());

        assertEquals("cancelled", captor.getValue().getStatus());
        assertNotNull(captor.getValue().getCompletedAt());
    }

    @Test
    void testCancelTask_RunningTask() {
        Task task = new Task();
        task.setId(taskId);
        task.setStatus("running");

        doReturn(task).when(taskService).getById(taskId);
        doReturn(true).when(taskService).updateById(any(Task.class));

        taskService.cancelTask(taskId);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskService).updateById(captor.capture());

        assertEquals("cancelled", captor.getValue().getStatus());
    }

    @Test
    void testCancelTask_AlreadyCompleted() {
        Task task = new Task();
        task.setId(taskId);
        task.setStatus("completed");

        doReturn(task).when(taskService).getById(taskId);

        taskService.cancelTask(taskId);

        verify(taskService, never()).updateById(any(Task.class));
    }

    @Test
    void testCancelTask_AlreadyFailed() {
        Task task = new Task();
        task.setId(taskId);
        task.setStatus("failed");

        doReturn(task).when(taskService).getById(taskId);

        taskService.cancelTask(taskId);

        verify(taskService, never()).updateById(any(Task.class));
    }

    @Test
    void testCancelTask_TaskNotFound() {
        doReturn(null).when(taskService).getById(taskId);

        taskService.cancelTask(taskId);

        verify(taskService, never()).updateById(any(Task.class));
    }

    @Test
    void testGetTaskLogs() {
        String logs = taskService.getTaskLogs(taskId);
        assertNotNull(logs);
    }

    @Test
    void testGetWorkflowTasks() {
        List<Task> mockTasks = List.of(new Task(), new Task());
        doReturn(mockTasks).when(taskService).list(any(LambdaQueryWrapper.class));

        List<Task> result = taskService.getWorkflowTasks(workflowId);

        assertEquals(2, result.size());
        verify(taskService).list(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetUserTasks() {
        List<Task> mockTasks = List.of(new Task());
        doReturn(mockTasks).when(taskService).list(any(LambdaQueryWrapper.class));

        List<Task> result = taskService.getUserTasks(userId);

        assertEquals(1, result.size());
        verify(taskService).list(any(LambdaQueryWrapper.class));
    }
}
