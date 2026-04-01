package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 模型评价实体 - 对应 model_reviews 表
 */
@Data
@TableName("model_reviews")
public class ModelReview implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 评价ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 模型ID */
    private UUID modelId;
    
    /** 用户ID */
    private UUID userId;
    
    /** 评分 (1-5) */
    private Integer rating;
    
    /** 评论内容 */
    private String comment;
    
    /** 验证指标 (JSON) */
    private String metrics;
    
    /** 是否已验证 */
    private Boolean isVerified;
    
    /**  helpful 计数 */
    private Integer helpfulCount;
    
    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    
    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
