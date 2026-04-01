package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 用户实体 - 对应 users 表
 */
@Data
@TableName("users")
public class User implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 用户ID (UUID) */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;
    
    /** 用户名 */
    private String username;
    
    /** 邮箱 */
    private String email;
    
    /** 密码哈希 (不返回给前端) */
    private String passwordHash;
    
    /** 全名 */
    private String fullName;
    
    /** 组织 */
    private String organization;
    
    /** 角色 (admin/user) */
    private String role;
    
    /** 头像URL */
    private String avatarUrl;
    
    /** 是否激活 */
    private Boolean isActive;
    
    /** 最后登录时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastLoginAt;
    
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
