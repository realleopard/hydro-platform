package com.example.testproject.mq;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 任务消息 DTO
 * 用于在消息队列中传递任务信息
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 任务ID
     */
    private String taskId;

    /**
     * 任务类型
     */
    private TaskType type;

    /**
     * 任务优先级 (0-10, 数字越大优先级越高)
     */
    private Integer priority;

    /**
     * 工作流ID
     */
    private String workflowId;

    /**
     * 模型ID
     */
    private String modelId;

    /**
     * 输入数据
     */
    private Map<String, Object> inputs;

    /**
     * 任务参数
     */
    private Map<String, Object> parameters;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 重试次数
     */
    private Integer retryCount;

    /**
     * 任务类型枚举
     */
    public enum TaskType {
        MODEL_EXECUTION,
        WORKFLOW_EXECUTION,
        DATA_PROCESSING,
        MODEL_VALIDATION,
        NOTIFICATION
    }
}
