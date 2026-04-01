package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 模型版本实体 - 对应 model_versions 表
 */
@Data
@TableName("model_versions")
public class ModelVersion implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 版本ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 模型ID */
    private UUID modelId;
    
    /** 版本号 */
    private String version;
    
    /** Docker镜像 */
    private String dockerImage;
    
    /** Docker镜像摘要 */
    private String dockerImageDigest;
    
    /** 接口定义 (JSON) */
    private String interfaces;
    
    /** 参数定义 (JSON) */
    private String parameters;
    
    /** 变更日志 */
    private String changelog;
    
    /** 状态 (active/deprecated) */
    private String status;
    
    /** 创建者ID */
    private UUID createdBy;
    
    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
