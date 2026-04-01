package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 模型验证记录实体 - 对应 model_validations 表
 */
@Data
@TableName("model_validations")
public class ModelValidation implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 验证ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 模型ID */
    private UUID modelId;
    
    /** 版本ID */
    private UUID versionId;
    
    /** 验证者ID */
    private UUID validatorId;
    
    /** 参考数据集ID */
    private UUID referenceDatasetId;
    
    /** 验证指标 (JSON) */
    private String metrics;
    
    /** 状态 (pending/completed/failed) */
    private String status;
    
    /** 报告URL */
    private String reportUrl;
    
    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    
    /** 完成时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime completedAt;
}
