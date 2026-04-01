package com.example.testproject.service.impl;

import com.example.testproject.entity.TaskNode;
import com.example.testproject.mapper.TaskNodeMapper;
import com.example.testproject.service.TaskNodeService;
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
 * 任务节点服务测试
 */
class TaskNodeServiceImplTest {

    @Mock
    private TaskNodeMapper taskNodeMapper;

    @InjectMocks
    private TaskNodeServiceImpl taskNodeService;

    private UUID taskId;
    private UUID nodeId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        taskId = UUID.randomUUID();
        nodeId = UUID.randomUUID();
    }

    @Test
    void testUpdateNodeStatus() {
        TaskNode node = new TaskNode();
        node.setId(nodeId);
        node.setStatus(TaskNodeService.TaskNodeStatus.PENDING.name());

        when(taskNodeMapper.selectById(nodeId)).thenReturn(node);

        taskNodeService.updateNodeStatus(nodeId, TaskNodeService.TaskNodeStatus.RUNNING);

        ArgumentCaptor<TaskNode> captor = ArgumentCaptor.forClass(TaskNode.class);
        verify(taskNodeMapper).updateById(captor.capture());

        assertEquals(TaskNodeService.TaskNodeStatus.RUNNING.name(), captor.getValue().getStatus());
        assertNotNull(captor.getValue().getStartedAt());
    }

    @Test
    void testUpdateNodeProgress() {
        TaskNode node = new TaskNode();
        node.setId(nodeId);
        node.setProgress(0);

        when(taskNodeMapper.selectById(nodeId)).thenReturn(node);

        taskNodeService.updateNodeProgress(nodeId, 50);

        ArgumentCaptor<TaskNode> captor = ArgumentCaptor.forClass(TaskNode.class);
        verify(taskNodeMapper).updateById(captor.capture());

        assertEquals(50, captor.getValue().getProgress());
    }

    @Test
    void testCompleteNode() {
        TaskNode node = new TaskNode();
        node.setId(nodeId);
        node.setStatus(TaskNodeService.TaskNodeStatus.RUNNING.name());

        when(taskNodeMapper.selectById(nodeId)).thenReturn(node);

        String outputs = "{\"result\": \"success\"}";
        String resourceUsage = "{\"cpu\": 1.5, \"memory\": \"512MB\"}";

        taskNodeService.completeNode(nodeId, outputs, resourceUsage);

        ArgumentCaptor<TaskNode> captor = ArgumentCaptor.forClass(TaskNode.class);
        verify(taskNodeMapper).updateById(captor.capture());

        TaskNode updatedNode = captor.getValue();
        assertEquals(TaskNodeService.TaskNodeStatus.COMPLETED.name(), updatedNode.getStatus());
        assertEquals(100, updatedNode.getProgress());
        assertEquals(outputs, updatedNode.getOutputs());
        assertEquals(resourceUsage, updatedNode.getResourceUsage());
        assertNotNull(updatedNode.getCompletedAt());
    }

    @Test
    void testFailNode() {
        TaskNode node = new TaskNode();
        node.setId(nodeId);
        node.setStatus(TaskNodeService.TaskNodeStatus.RUNNING.name());

        when(taskNodeMapper.selectById(nodeId)).thenReturn(node);

        String errorMessage = "容器执行失败";
        taskNodeService.failNode(nodeId, errorMessage);

        ArgumentCaptor<TaskNode> captor = ArgumentCaptor.forClass(TaskNode.class);
        verify(taskNodeMapper).updateById(captor.capture());

        assertEquals(TaskNodeService.TaskNodeStatus.FAILED.name(), captor.getValue().getStatus());
        assertEquals(errorMessage, captor.getValue().getErrorMessage());
    }

    @Test
    void testRetryNode() {
        TaskNode oldNode = new TaskNode();
        oldNode.setId(nodeId);
        oldNode.setTaskId(taskId);
        oldNode.setNodeId("node-1");
        oldNode.setNodeName("测试节点");
        oldNode.setStatus(TaskNodeService.TaskNodeStatus.FAILED.name());
        oldNode.setRetryCount(0);

        when(taskNodeMapper.selectById(nodeId)).thenReturn(oldNode);

        TaskNode newNode = taskNodeService.retryNode(nodeId);

        assertNotNull(newNode);
        assertNotEquals(nodeId, newNode.getId());
        assertEquals(taskId, newNode.getTaskId());
        assertEquals("node-1", newNode.getNodeId());
        assertEquals(TaskNodeService.TaskNodeStatus.PENDING.name(), newNode.getStatus());
        assertEquals(1, newNode.getRetryCount());

        verify(taskNodeMapper).insert(any(TaskNode.class));
    }

    @Test
    void testRetryNode_NotFailed() {
        TaskNode node = new TaskNode();
        node.setId(nodeId);
        node.setStatus(TaskNodeService.TaskNodeStatus.COMPLETED.name());

        when(taskNodeMapper.selectById(nodeId)).thenReturn(node);

        assertThrows(IllegalStateException.class, () -> taskNodeService.retryNode(nodeId));
    }

    @Test
    void testIsAllNodesCompleted() {
        List<HashMap<String, Object>> counts = new ArrayList<>();

        HashMap<String, Object> completed = new HashMap<>();
        completed.put("status", "COMPLETED");
        completed.put("count", 3L);
        counts.add(completed);

        HashMap<String, Object> failed = new HashMap<>();
        failed.put("status", "FAILED");
        failed.put("count", 1L);
        counts.add(failed);

        when(taskNodeMapper.countByStatus(taskId)).thenReturn(counts);

        boolean result = taskNodeService.isAllNodesCompleted(taskId);

        assertTrue(result);
    }

    @Test
    void testIsAllNodesCompleted_WithRunning() {
        List<HashMap<String, Object>> counts = new ArrayList<>();

        HashMap<String, Object> running = new HashMap<>();
        running.put("status", "RUNNING");
        running.put("count", 1L);
        counts.add(running);

        HashMap<String, Object> completed = new HashMap<>();
        completed.put("status", "COMPLETED");
        completed.put("count", 2L);
        counts.add(completed);

        when(taskNodeMapper.countByStatus(taskId)).thenReturn(counts);

        boolean result = taskNodeService.isAllNodesCompleted(taskId);

        assertFalse(result);
    }

    @Test
    void testUpdateNodeProgress_InvalidProgress() {
        assertThrows(IllegalArgumentException.class, () -> taskNodeService.updateNodeProgress(nodeId, 150));
        assertThrows(IllegalArgumentException.class, () -> taskNodeService.updateNodeProgress(nodeId, -10));
    }
}
