package com.example.testproject.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 执行计划
 */
@Data
public class ExecutionPlan {

    /** 计划ID */
    private UUID id;

    /** 任务ID */
    private UUID taskId;

    /** 工作流ID */
    private UUID workflowId;

    /** 执行阶段列表 */
    private List<ExecutionStage> stages;

    /** 节点执行配置 */
    private Map<String, NodeExecutionConfig> nodeConfigs;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /**
     * 执行阶段
     */
    @Data
    public static class ExecutionStage {
        /** 阶段序号 */
        private Integer stageIndex;

        /** 该阶段并行执行的节点ID列表 */
        private List<String> nodeIds;

        /** 阶段描述 */
        private String description;
    }

    /**
     * 节点执行配置
     */
    @Data
    public static class NodeExecutionConfig {
        /** 节点ID */
        private String nodeId;

        /** 依赖的节点 */
        private List<String> dependencies;

        /** 被依赖的节点 */
        private List<String> dependents;

        /** 执行优先级 */
        private Integer priority;

        /** 超时时间（秒） */
        private Integer timeout;
    }
}
