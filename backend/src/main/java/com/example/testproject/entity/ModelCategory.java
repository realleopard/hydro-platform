package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 模型分类实体 - 对应 model_categories 表
 */
@Data
@TableName("model_categories")
public class ModelCategory implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 分类ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 分类名称 */
    private String name;
    
    /** 描述 */
    private String description;
    
    /** 父分类ID */
    private UUID parentId;
    
    /** 排序顺序 */
    private Integer sortOrder;
    
    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
