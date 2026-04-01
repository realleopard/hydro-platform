package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 用户组织关联实体 - 对应 user_organizations 表
 */
@Data
@TableName("user_organizations")
public class UserOrganization implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /** 用户ID */
    @TableId
    private UUID userId;
    
    /** 组织ID */
    @TableId
    private UUID organizationId;
    
    /** 角色 (admin/member) */
    private String role;
    
    /** 加入时间 */
    private LocalDateTime joinedAt;
}
