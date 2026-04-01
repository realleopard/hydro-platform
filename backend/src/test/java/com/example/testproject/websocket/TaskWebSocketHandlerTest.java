package com.example.testproject.websocket;

import com.example.testproject.service.TaskScheduler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * WebSocket 处理器测试
 */
class TaskWebSocketHandlerTest {

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private TaskScheduler taskScheduler;

    @Mock
    private WebSocketSession session;

    @InjectMocks
    private TaskWebSocketHandler webSocketHandler;

    private UUID taskId;
    private String sessionId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        taskId = UUID.randomUUID();
        sessionId = "test-session-123";

        when(session.getId()).thenReturn(sessionId);
    }

    @Test
    void testAfterConnectionEstablished_Success() throws Exception {
        // 模拟 URL
        when(session.getUri()).thenReturn(new URI("ws://localhost:8080/ws/v1/tasks/" + taskId));

        // 模拟任务信息
        TaskScheduler.TaskExecutionInfo taskInfo = new TaskScheduler.TaskExecutionInfo();
        taskInfo.setTaskId(taskId);
        taskInfo.setStatus(TaskScheduler.TaskStatus.RUNNING);
        taskInfo.setProgress(50);
        when(taskScheduler.getTaskExecutionInfo(taskId)).thenReturn(taskInfo);

        // 模拟序列化
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"type\":\"status_update\"}");

        // 执行
        webSocketHandler.afterConnectionEstablished(session);

        // 验证
        verify(taskScheduler).getTaskExecutionInfo(taskId);
        verify(session).sendMessage(any(TextMessage.class));
    }

    @Test
    void testAfterConnectionEstablished_InvalidTaskId() throws Exception {
        // 模拟无效的 URL
        when(session.getUri()).thenReturn(new URI("ws://localhost:8080/ws/v1/tasks/invalid-uuid"));

        // 执行
        webSocketHandler.afterConnectionEstablished(session);

        // 验证连接被关闭
        verify(session).close(any(CloseStatus.class));
    }

    @Test
    void testAfterConnectionEstablished_NonExistentTask() throws Exception {
        // 模拟 URL
        when(session.getUri()).thenReturn(new URI("ws://localhost:8080/ws/v1/tasks/" + taskId));

        // 模拟任务不存在
        when(taskScheduler.getTaskExecutionInfo(taskId)).thenReturn(null);

        // 执行
        webSocketHandler.afterConnectionEstablished(session);

        // 验证连接被关闭
        verify(session).close(argThat(status ->
            status.getCode() == CloseStatus.BAD_DATA.getCode()
        ));
    }

    @Test
    void testHandleTextMessage_Ping() throws Exception {
        // 建立连接
        when(session.getUri()).thenReturn(new URI("ws://localhost:8080/ws/v1/tasks/" + taskId));
        when(taskScheduler.getTaskExecutionInfo(taskId)).thenReturn(new TaskScheduler.TaskExecutionInfo());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        webSocketHandler.afterConnectionEstablished(session);

        // 发送 ping 消息
        String pingMessage = "{\"type\":\"ping\"}";
        when(objectMapper.readValue(pingMessage, TaskWebSocketHandler.WebSocketMessage.class))
            .thenReturn(createWebSocketMessage("ping", null));

        webSocketHandler.handleTextMessage(session, new TextMessage(pingMessage));

        // 验证发送了 pong 响应
        verify(session, atLeastOnce()).sendMessage(any(TextMessage.class));
    }

    @Test
    void testBroadcastTaskStatus() throws Exception {
        // 建立连接
        when(session.getUri()).thenReturn(new URI("ws://localhost:8080/ws/v1/tasks/" + taskId));
        when(taskScheduler.getTaskExecutionInfo(taskId)).thenReturn(new TaskScheduler.TaskExecutionInfo());
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"type\":\"status_update\"}");
        webSocketHandler.afterConnectionEstablished(session);

        when(session.isOpen()).thenReturn(true);

        // 广播状态更新
        webSocketHandler.broadcastTaskStatus(taskId, TaskScheduler.TaskStatus.COMPLETED, 100, "完成");

        // 验证消息被发送
        verify(session, atLeastOnce()).sendMessage(any(TextMessage.class));
    }

    @Test
    void testSendTaskLog() throws Exception {
        // 建立连接
        when(session.getUri()).thenReturn(new URI("ws://localhost:8080/ws/v1/tasks/" + taskId));
        when(taskScheduler.getTaskExecutionInfo(taskId)).thenReturn(new TaskScheduler.TaskExecutionInfo());
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"type\":\"log\"}");
        webSocketHandler.afterConnectionEstablished(session);

        when(session.isOpen()).thenReturn(true);

        // 发送日志
        webSocketHandler.sendTaskLog(taskId, "info", "测试日志消息");

        // 验证消息被发送
        verify(session, atLeastOnce()).sendMessage(any(TextMessage.class));
    }

    @Test
    void testAfterConnectionClosed() throws Exception {
        // 先建立连接
        when(session.getUri()).thenReturn(new URI("ws://localhost:8080/ws/v1/tasks/" + taskId));
        when(taskScheduler.getTaskExecutionInfo(taskId)).thenReturn(new TaskScheduler.TaskExecutionInfo());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        webSocketHandler.afterConnectionEstablished(session);

        // 关闭连接
        webSocketHandler.afterConnectionClosed(session, CloseStatus.NORMAL);

        // 验证状态清理 - 再次广播不应该发送给已关闭的会话
        reset(session);
        when(session.isOpen()).thenReturn(false);
        webSocketHandler.broadcastTaskStatus(taskId, TaskScheduler.TaskStatus.COMPLETED, 100, "完成");
        verify(session, never()).sendMessage(any(TextMessage.class));
    }

    @Test
    void testHandleTextMessage_Cancel() throws Exception {
        // 建立连接
        when(session.getUri()).thenReturn(new URI("ws://localhost:8080/ws/v1/tasks/" + taskId));
        when(taskScheduler.getTaskExecutionInfo(taskId)).thenReturn(new TaskScheduler.TaskExecutionInfo());
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        webSocketHandler.afterConnectionEstablished(session);

        // 模拟取消成功
        when(taskScheduler.cancelTask(taskId)).thenReturn(true);

        // 发送取消消息
        String cancelMessage = "{\"type\":\"cancel\"}";
        when(objectMapper.readValue(cancelMessage, TaskWebSocketHandler.WebSocketMessage.class))
            .thenReturn(createWebSocketMessage("cancel", null));

        webSocketHandler.handleTextMessage(session, new TextMessage(cancelMessage));

        // 验证调用了取消方法
        verify(taskScheduler).cancelTask(taskId);
    }

    private TaskWebSocketHandler.WebSocketMessage createWebSocketMessage(String type, Map<String, Object> data) {
        TaskWebSocketHandler.WebSocketMessage message = new TaskWebSocketHandler.WebSocketMessage();
        message.setType(type);
        message.setData(data);
        return message;
    }
}
