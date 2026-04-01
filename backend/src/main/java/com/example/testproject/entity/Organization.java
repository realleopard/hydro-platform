package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 组织实体 - 对应 organizations 表
 */
@Data
@TableName("organizations")
public class Organization implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 组织ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 组织名称 */
    private String name;
    
    /** 描述 */
    private String description;
    
    /** Logo URL */
    private String logoUrl;
    
    /** 父组织ID */
    private UUID parentId;
    
    /** 创建时间 */
    private LocalDateTime createdAt;
}
