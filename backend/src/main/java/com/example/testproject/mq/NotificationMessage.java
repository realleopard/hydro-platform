package com.example.testproject.mq;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 通知消息 DTO
 * 用于系统通知和告警
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 通知ID
     */
    private String notificationId;

    /**
     * 通知类型
     */
    private NotificationType type;

    /**
     * 接收用户ID
     */
    private String userId;

    /**
     * 通知标题
     */
    private String title;

    /**
     * 通知内容
     */
    private String content;

    /**
     * 关联任务ID
     */
    private String taskId;

    /**
     * 关联工作流ID
     */
    private String workflowId;

    /**
     * 额外数据
     */
    private Map<String, Object> extraData;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 通知类型枚举
     */
    public enum NotificationType {
        TASK_COMPLETED,
        TASK_FAILED,
        TASK_CANCELLED,
        WORKFLOW_COMPLETED,
        WORKFLOW_FAILED,
        SYSTEM_ALERT,
        MODEL_PUBLISHED,
        DATASET_READY
    }
}
