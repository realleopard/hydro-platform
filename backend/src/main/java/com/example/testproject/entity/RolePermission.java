package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 角色权限关联 - 对应 role_permissions 表
 */
@Data
@TableName("role_permissions")
public class RolePermission implements Serializable {

    private static final long serialVersionUID = 1L;

    /** ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;

    /** 角色 */
    private String role;

    /** 权限ID */
    private UUID permissionId;

    /** 创建时间 */
    private LocalDateTime createdAt;
}
