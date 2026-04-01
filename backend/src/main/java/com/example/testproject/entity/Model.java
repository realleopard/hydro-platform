package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 水文模型实体 - 对应 models 表
 */
@Data
@TableName("models")
public class Model implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 模型ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 模型名称 */
    private String name;
    
    /** 描述 */
    private String description;
    
    /** 分类ID */
    private UUID categoryId;
    
    /** 所有者ID */
    private UUID ownerId;
    
    /** 组织ID */
    private UUID organizationId;
    
    /** Docker镜像 */
    private String dockerImage;
    
    /** Docker镜像摘要 */
    private String dockerImageDigest;
    
    /** 接口定义 (JSON) */
    private String interfaces;
    
    /** 资源需求 (JSON) */
    private String resources;
    
    /** 参数定义 (JSON) */
    private String parameters;
    
    /** 当前版本 */
    private String currentVersion;
    
    /** 版本数量 */
    private Integer versionCount;
    
    /** 状态 (draft/published/deprecated) */
    private String status;
    
    /** 可见性 (private/public/organization) */
    private String visibility;
    
    /** 下载次数 */
    private Integer downloadCount;
    
    /** 运行次数 */
    private Integer runCount;
    
    /** 评分平均值 */
    private Double ratingAvg;
    
    /** 评分数量 */
    private Integer ratingCount;
    
    /** 标签 */
    private String tags;
    
    /** 发布时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime publishedAt;
    
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
