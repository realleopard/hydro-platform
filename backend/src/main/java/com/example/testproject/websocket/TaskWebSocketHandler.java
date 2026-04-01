package com.example.testproject.websocket;

import com.example.testproject.service.TaskScheduler;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 任务 WebSocket 处理器
 * 处理任务状态的实时推送
 */
@Slf4j
@Component
public class TaskWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final TaskScheduler taskScheduler;

    // 存储任务ID到会话列表的映射（一个任务可以有多个客户端监听）
    private final Map<UUID, Map<String, WebSocketSession>> taskSessions = new ConcurrentHashMap<>();

    // 存储会话ID到任务ID的映射
    private final Map<String, UUID> sessionTaskMap = new ConcurrentHashMap<>();

    public TaskWebSocketHandler(ObjectMapper objectMapper, TaskScheduler taskScheduler) {
        this.objectMapper = objectMapper;
        this.taskScheduler = taskScheduler;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // 从 URL 路径中提取任务ID
        UUID taskId = extractTaskId(session);

        if (taskId == null) {
            log.warn("WebSocket 连接失败：无法提取任务ID, sessionId={}", session.getId());
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        // 验证任务是否存在
        TaskScheduler.TaskExecutionInfo taskInfo = taskScheduler.getTaskExecutionInfo(taskId);
        if (taskInfo == null) {
            log.warn("WebSocket 连接失败：任务不存在, taskId={}, sessionId={}", taskId, session.getId());
            session.close(CloseStatus.BAD_DATA.withReason("任务不存在"));
            return;
        }

        // 注册会话
        taskSessions.computeIfAbsent(taskId, k -> new ConcurrentHashMap<>())
                .put(session.getId(), session);
        sessionTaskMap.put(session.getId(), taskId);

        log.info("WebSocket 连接已建立: taskId={}, sessionId={}", taskId, session.getId());

        // 发送当前任务状态
        sendTaskStatus(session, taskInfo);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.debug("收到 WebSocket 消息: sessionId={}, message={}", session.getId(), payload);

        try {
            WebSocketMessage wsMessage = objectMapper.readValue(payload, WebSocketMessage.class);

            switch (wsMessage.getType()) {
                case "ping":
                    // 心跳响应
                    sendPong(session);
                    break;
                case "get_status":
                    // 客户端请求当前状态
                    UUID taskId = sessionTaskMap.get(session.getId());
                    if (taskId != null) {
                        TaskScheduler.TaskExecutionInfo info = taskScheduler.getTaskExecutionInfo(taskId);
                        if (info != null) {
                            sendTaskStatus(session, info);
                        }
                    }
                    break;
                case "cancel":
                    // 客户端请求取消任务
                    UUID cancelTaskId = sessionTaskMap.get(session.getId());
                    if (cancelTaskId != null) {
                        boolean success = taskScheduler.cancelTask(cancelTaskId);
                        sendMessage(session, "cancel_result", Map.of(
                                "success", success,
                                "taskId", cancelTaskId
                        ));
                    }
                    break;
                default:
                    log.warn("未知的 WebSocket 消息类型: {}", wsMessage.getType());
            }
        } catch (Exception e) {
            log.error("处理 WebSocket 消息失败: {}", e.getMessage(), e);
            sendError(session, "消息处理失败: " + e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID taskId = sessionTaskMap.remove(session.getId());
        if (taskId != null) {
            Map<String, WebSocketSession> sessions = taskSessions.get(taskId);
            if (sessions != null) {
                sessions.remove(session.getId());
                if (sessions.isEmpty()) {
                    taskSessions.remove(taskId);
                }
            }
        }

        log.info("WebSocket 连接已关闭: sessionId={}, status={}", session.getId(), status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket 传输错误: sessionId={}, error={}", session.getId(), exception.getMessage());
        session.close(CloseStatus.SERVER_ERROR);
    }

    /**
     * 广播任务状态更新到所有监听该任务的客户端
     */
    public void broadcastTaskStatus(UUID taskId, TaskScheduler.TaskStatus status,
                                    Integer progress, String message) {
        Map<String, WebSocketSession> sessions = taskSessions.get(taskId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        TaskStatusMessage statusMessage = new TaskStatusMessage();
        statusMessage.setTaskId(taskId);
        statusMessage.setStatus(status);
        statusMessage.setProgress(progress);
        statusMessage.setMessage(message);
        statusMessage.setTimestamp(LocalDateTime.now());

        String payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of(
                    "type", "status_update",
                    "data", statusMessage
            ));
        } catch (Exception e) {
            log.error("序列化任务状态消息失败: {}", e.getMessage());
            return;
        }

        TextMessage textMessage = new TextMessage(payload);

        sessions.values().forEach(session -> {
            if (session.isOpen()) {
                try {
                    session.sendMessage(textMessage);
                } catch (IOException e) {
                    log.error("发送 WebSocket 消息失败: sessionId={}, error={}",
                            session.getId(), e.getMessage());
                }
            }
        });

        log.debug("广播任务状态: taskId={}, status={}, progress={}, 客户端数={}",
                taskId, status, progress, sessions.size());
    }

    /**
     * 发送任务日志
     */
    public void sendTaskLog(UUID taskId, String level, String logMessage) {
        Map<String, WebSocketSession> sessions = taskSessions.get(taskId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "type", "log",
                    "data", Map.of(
                            "level", level,
                            "message", logMessage,
                            "timestamp", LocalDateTime.now().toString()
                    )
            ));

            TextMessage textMessage = new TextMessage(payload);

            sessions.values().forEach(session -> {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(textMessage);
                    } catch (IOException e) {
                        log.error("发送日志消息失败: {}", e.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            log.error("序列化日志消息失败: {}", e.getMessage());
        }
    }

    /**
     * 向指定会话发送任务状态
     */
    private void sendTaskStatus(WebSocketSession session,
                                TaskScheduler.TaskExecutionInfo info) throws IOException {
        sendMessage(session, "status_update", info);
    }

    /**
     * 发送心跳响应
     */
    private void sendPong(WebSocketSession session) throws IOException {
        sendMessage(session, "pong", Map.of("timestamp", LocalDateTime.now().toString()));
    }

    /**
     * 发送错误消息
     */
    private void sendError(WebSocketSession session, String errorMessage) throws IOException {
        sendMessage(session, "error", Map.of("message", errorMessage));
    }

    /**
     * 发送通用消息
     */
    private void sendMessage(WebSocketSession session, String type, Object data) throws IOException {
        String payload = objectMapper.writeValueAsString(Map.of(
                "type", type,
                "data", data
        ));
        session.sendMessage(new TextMessage(payload));
    }

    /**
     * 从 URL 路径中提取任务ID
     */
    private UUID extractTaskId(WebSocketSession session) {
        String path = session.getUri().getPath();
        // 路径格式: /ws/v1/tasks/{taskId}
        String[] parts = path.split("/");
        if (parts.length >= 5) {
            try {
                return UUID.fromString(parts[4]);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * WebSocket 消息格式
     */
    public static class WebSocketMessage {
        private String type;
        private Map<String, Object> data;

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public Map<String, Object> getData() {
            return data;
        }

        public void setData(Map<String, Object> data) {
            this.data = data;
        }
    }

    /**
     * 任务状态消息
     */
    public static class TaskStatusMessage {
        private UUID taskId;
        private TaskScheduler.TaskStatus status;
        private Integer progress;
        private String message;
        private LocalDateTime timestamp;

        public UUID getTaskId() {
            return taskId;
        }

        public void setTaskId(UUID taskId) {
            this.taskId = taskId;
        }

        public TaskScheduler.TaskStatus getStatus() {
            return status;
        }

        public void setStatus(TaskScheduler.TaskStatus status) {
            this.status = status;
        }

        public Integer getProgress() {
            return progress;
        }

        public void setProgress(Integer progress) {
            this.progress = progress;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public LocalDateTime getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
        }
    }
}
