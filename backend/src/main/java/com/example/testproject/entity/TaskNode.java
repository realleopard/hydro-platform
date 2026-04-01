package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 任务节点执行详情 - 对应 task_nodes 表
 * 记录工作流中每个节点的执行状态和日志
 */
@Data
@TableName("task_nodes")
public class TaskNode implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 节点执行记录ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;

    /** 所属任务ID */
    private UUID taskId;

    /** 节点ID（工作流定义中的节点标识） */
    private String nodeId;

    /** 节点名称 */
    private String nodeName;

    /** 执行模型ID */
    private UUID modelId;

    /** 节点状态 (pending/running/completed/failed/cancelled/skipped) */
    private String status;

    /** 执行进度 (0-100) */
    private Integer progress;

    /** 执行顺序序号 */
    private Integer executionOrder;

    /** 容器ID */
    private String containerId;

    /** Pod名称（K8s环境） */
    private String podName;

    /** 执行节点主机名 */
    private String nodeHostname;

    /** 输入参数 (JSON) */
    private String inputs;

    /** 输出结果 (JSON) */
    private String outputs;

    /** 资源使用统计 (JSON) */
    private String resourceUsage;

    /** 执行日志 */
    @TableField(typeHandler = org.apache.ibatis.type.StringTypeHandler.class)
    private String logs;

    /** 错误信息 */
    private String errorMessage;

    /** 重试次数 */
    private Integer retryCount;

    /** 开始时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startedAt;

    /** 完成时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime completedAt;

    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    /** 删除时间 */
    @TableLogic
    private LocalDateTime deletedAt;
}
