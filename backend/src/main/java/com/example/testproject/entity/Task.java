package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 任务实体 - 对应 tasks 表
 */
@Data
@TableName("tasks")
public class Task implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 任务ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 工作流ID */
    private UUID workflowId;
    
    /** 任务名称 */
    private String name;
    
    /** 执行状态 (pending/queued/running/completed/failed/cancelled) */
    private String status;
    
    /** 进度 (0-100) */
    private Integer progress;
    
    /** 输入参数 (JSON) */
    private String inputs;
    
    /** 输出结果 (JSON) */
    private String outputs;
    
    /** 资源使用统计 (JSON) */
    private String resourceUsage;
    
    /** 触发者ID */
    private UUID triggeredBy;
    
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
    @TableLogic(value = "NULL", delval = "NOW()")
    private LocalDateTime deletedAt;
}
