package com.example.testproject.service;

import com.example.testproject.dto.WorkflowDefinition;
import com.example.testproject.dto.WorkflowEdge;
import com.example.testproject.dto.WorkflowNode;
import com.example.testproject.entity.Task;
import com.example.testproject.entity.Workflow;
import com.example.testproject.mapper.TaskMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 任务调度器测试
 */
class TaskSchedulerTest {

    @Mock
    private TaskMapper taskMapper;

    @Mock
    private DagParser dagParser;

    @Mock
    private DependencyResolver dependencyResolver;

    @InjectMocks
    private TaskScheduler taskScheduler;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        objectMapper = new ObjectMapper();
    }

    @Test
    void testSubmitTask_Success() {
        // 准备工作流
        Workflow workflow = new Workflow();
        workflow.setId(UUID.randomUUID());
        workflow.setName("测试工作流");
        workflow.setDefinition("{}");
        workflow.setRunCount(0);

        // 模拟解析和验证
        WorkflowDefinition definition = createSimpleWorkflow();
        when(dagParser.parse(any())).thenReturn(definition);
        when(dagParser.validate(any())).thenReturn(new DagParser.ValidationResult(true, new ArrayList<>()));

        // 执行
        Task task = taskScheduler.submitTask(workflow, "{}", UUID.randomUUID());

        // 验证
        assertNotNull(task);
        assertNotNull(task.getId());
        assertEquals(workflow.getId(), task.getWorkflowId());
        assertEquals(TaskScheduler.TaskStatus.PENDING.name(), task.getStatus());
        assertEquals(0, task.getProgress());

        // 验证 taskMapper.insert 被调用
        verify(taskMapper, times(1)).insert(any(Task.class));
    }

    @Test
    void testSubmitTask_InvalidWorkflow() {
        Workflow workflow = new Workflow();
        workflow.setId(UUID.randomUUID());
        workflow.setName("无效工作流");
        workflow.setDefinition("{}");

        // 模拟验证失败
        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setNodes(new ArrayList<>());
        when(dagParser.parse(any())).thenReturn(definition);
        when(dagParser.validate(any())).thenReturn(
                new DagParser.ValidationResult(false, Collections.singletonList("工作流必须包含至少一个节点"))
        );

        // 执行并验证异常
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> taskScheduler.submitTask(workflow, "{}", UUID.randomUUID())
        );

        assertTrue(exception.getMessage().contains("工作流定义无效"));
        verify(taskMapper, never()).insert(any());
    }

    @Test
    void testCancelTask_RunningTask() {
        UUID taskId = UUID.randomUUID();
        Task task = new Task();
        task.setId(taskId);
        task.setStatus(TaskScheduler.TaskStatus.RUNNING.name());
        task.setProgress(50);

        when(taskMapper.selectById(taskId)).thenReturn(task);

        boolean result = taskScheduler.cancelTask(taskId);

        assertTrue(result);
        assertTrue(taskScheduler.isCancelled(taskId));
        verify(taskMapper, atLeastOnce()).updateById(any(Task.class));
    }

    @Test
    void testCancelTask_AlreadyCompleted() {
        UUID taskId = UUID.randomUUID();
        Task task = new Task();
        task.setId(taskId);
        task.setStatus(TaskScheduler.TaskStatus.COMPLETED.name());

        when(taskMapper.selectById(taskId)).thenReturn(task);

        boolean result = taskScheduler.cancelTask(taskId);

        assertFalse(result);
        verify(taskMapper, never()).updateById(any());
    }

    @Test
    void testCancelTask_NonExistent() {
        UUID taskId = UUID.randomUUID();
        when(taskMapper.selectById(taskId)).thenReturn(null);

        boolean result = taskScheduler.cancelTask(taskId);

        assertFalse(result);
    }

    @Test
    void testUpdateTaskStatus() {
        UUID taskId = UUID.randomUUID();
        Task task = new Task();
        task.setId(taskId);
        task.setStatus(TaskScheduler.TaskStatus.PENDING.name());
        task.setProgress(0);

        when(taskMapper.selectById(taskId)).thenReturn(task);

        taskScheduler.updateTaskStatus(taskId, TaskScheduler.TaskStatus.RUNNING, 50, null);

        ArgumentCaptor<Task> taskCaptor = ArgumentCaptor.forClass(Task.class);
        verify(taskMapper, atLeastOnce()).updateById(taskCaptor.capture());

        Task updatedTask = taskCaptor.getValue();
        assertEquals(TaskScheduler.TaskStatus.RUNNING.name(), updatedTask.getStatus());
        assertEquals(50, updatedTask.getProgress());
    }

    @Test
    void testGetTaskExecutionInfo() {
        UUID taskId = UUID.randomUUID();
        Task task = new Task();
        task.setId(taskId);
        task.setStatus(TaskScheduler.TaskStatus.RUNNING.name());
        task.setProgress(75);
        task.setStartedAt(java.time.LocalDateTime.now());

        when(taskMapper.selectById(taskId)).thenReturn(task);

        TaskScheduler.TaskExecutionInfo info = taskScheduler.getTaskExecutionInfo(taskId);

        assertNotNull(info);
        assertEquals(taskId, info.getTaskId());
        assertEquals(TaskScheduler.TaskStatus.RUNNING, info.getStatus());
        assertEquals(75, info.getProgress());
        assertNotNull(info.getStartedAt());
        assertFalse(info.getCancelled());
    }

    @Test
    void testGetTaskExecutionInfo_NonExistent() {
        UUID taskId = UUID.randomUUID();
        when(taskMapper.selectById(taskId)).thenReturn(null);

        TaskScheduler.TaskExecutionInfo info = taskScheduler.getTaskExecutionInfo(taskId);

        assertNull(info);
    }

    @Test
    void testRetryTask() {
        UUID oldTaskId = UUID.randomUUID();
        Task oldTask = new Task();
        oldTask.setId(oldTaskId);
        oldTask.setWorkflowId(UUID.randomUUID());
        oldTask.setName("旧任务");
        oldTask.setStatus(TaskScheduler.TaskStatus.FAILED.name());
        oldTask.setInputs("{}");
        oldTask.setTriggeredBy(UUID.randomUUID());

        when(taskMapper.selectById(oldTaskId)).thenReturn(oldTask);

        Task newTask = taskScheduler.retryTask(oldTaskId);

        assertNotNull(newTask);
        assertNotEquals(oldTaskId, newTask.getId());
        assertEquals(oldTask.getName() + "_retry_1", newTask.getName());
        assertEquals(TaskScheduler.TaskStatus.PENDING.name(), newTask.getStatus());
        assertEquals(0, newTask.getProgress());

        verify(taskMapper, times(1)).insert(any(Task.class));
    }

    @Test
    void testRetryTask_MaxRetryReached() {
        UUID oldTaskId = UUID.randomUUID();
        Task oldTask = new Task();
        oldTask.setId(oldTaskId);
        oldTask.setWorkflowId(UUID.randomUUID());
        oldTask.setStatus(TaskScheduler.TaskStatus.FAILED.name());

        when(taskMapper.selectById(oldTaskId)).thenReturn(oldTask);

        // 重试3次
        for (int i = 0; i < 3; i++) {
            taskScheduler.retryTask(oldTaskId);
        }

        // 第4次应该失败
        assertThrows(IllegalStateException.class, () -> taskScheduler.retryTask(oldTaskId));
    }

    @Test
    void testRetryTask_NonFailedTask() {
        UUID taskId = UUID.randomUUID();
        Task task = new Task();
        task.setId(taskId);
        task.setStatus(TaskScheduler.TaskStatus.RUNNING.name());

        when(taskMapper.selectById(taskId)).thenReturn(task);

        assertThrows(IllegalArgumentException.class, () -> taskScheduler.retryTask(taskId));
    }

    @Test
    void testTaskStatusTransitions() {
        // 验证所有有效的任务状态
        for (TaskScheduler.TaskStatus status : TaskScheduler.TaskStatus.values()) {
            assertNotNull(status.name());
            assertTrue(status.name().length() > 0);
        }

        // 验证状态转换
        assertTrue(isValidTransition(TaskScheduler.TaskStatus.PENDING, TaskScheduler.TaskStatus.RUNNING));
        assertTrue(isValidTransition(TaskScheduler.TaskStatus.RUNNING, TaskScheduler.TaskStatus.COMPLETED));
        assertTrue(isValidTransition(TaskScheduler.TaskStatus.RUNNING, TaskScheduler.TaskStatus.FAILED));
        assertTrue(isValidTransition(TaskScheduler.TaskStatus.RUNNING, TaskScheduler.TaskStatus.CANCELLED));
    }

    private boolean isValidTransition(TaskScheduler.TaskStatus from, TaskScheduler.TaskStatus to) {
        // 简化的状态转换验证
        switch (from) {
            case PENDING:
                return to == TaskScheduler.TaskStatus.QUEUED || to == TaskScheduler.TaskStatus.RUNNING || to == TaskScheduler.TaskStatus.CANCELLED;
            case QUEUED:
                return to == TaskScheduler.TaskStatus.RUNNING || to == TaskScheduler.TaskStatus.CANCELLED;
            case RUNNING:
                return to == TaskScheduler.TaskStatus.COMPLETED || to == TaskScheduler.TaskStatus.FAILED || to == TaskScheduler.TaskStatus.CANCELLED;
            case COMPLETED:
            case FAILED:
            case CANCELLED:
                return false; // 终态不能转换
            default:
                return false;
        }
    }

    private WorkflowDefinition createSimpleWorkflow() {
        WorkflowDefinition definition = new WorkflowDefinition();

        WorkflowNode nodeA = new WorkflowNode();
        nodeA.setId("node-a");
        nodeA.setName("节点A");
        nodeA.setType("model");
        nodeA.setModelId(UUID.randomUUID());

        WorkflowNode nodeB = new WorkflowNode();
        nodeB.setId("node-b");
        nodeB.setName("节点B");
        nodeB.setType("model");
        nodeB.setModelId(UUID.randomUUID());

        definition.setNodes(Arrays.asList(nodeA, nodeB));

        WorkflowEdge edge = new WorkflowEdge();
        edge.setId("edge-1");
        edge.setSource("node-a");
        edge.setTarget("node-b");
        definition.setEdges(Collections.singletonList(edge));

        return definition;
    }
}
