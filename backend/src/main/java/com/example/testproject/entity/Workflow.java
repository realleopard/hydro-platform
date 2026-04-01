package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 工作流实体 - 对应 workflows 表
 */
@Data
@TableName("workflows")
public class Workflow implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 工作流ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 工作流名称 */
    private String name;
    
    /** 描述 */
    private String description;
    
    /** 所有者ID */
    private UUID ownerId;
    
    /** 组织ID */
    private UUID organizationId;
    
    /** 工作流定义 (JSON) */
    private String definition;
    
    /** 调度类型 (manual/scheduled/cron) */
    private String scheduleType;
    
    /** 调度配置 (JSON) */
    private String scheduleConfig;
    
    /** 输入参数 (JSON) */
    private String inputParameters;
    
    /** 状态 (active/inactive) */
    private String status;
    
    /** 运行次数 */
    private Integer runCount;
    
    /** 最后运行时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastRunAt;
    
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
