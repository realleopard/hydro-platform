package com.example.testproject.dto.task;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 任务消息 DTO
 * 用于在消息队列中传输任务信息
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
     * 工作流ID
     */
    private Long workflowId;

    /**
     * 模型ID
     */
    private Long modelId;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 任务类型
     */
    private String type; // SIMULATION, ANALYSIS, VALIDATION

    /**
     * 输入数据
     */
    private Map<String, Object> inputs;

    /**
     * 运行参数
     */
    private Map<String, Object> parameters;

    /**
     * 资源需求
     */
    private ResourceRequirement resources;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 优先级
     */
    private Integer priority;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResourceRequirement {
        private Integer cpuCores;
        private Integer memoryMb;
        private Integer diskMb;
        private Integer maxRuntimeSeconds;
    }
}
