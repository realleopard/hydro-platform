package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 权限实体 - 对应 permissions 表
 */
@Data
@TableName("permissions")
public class Permission implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 权限ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;

    /** 权限编码 */
    private String code;

    /** 权限名称 */
    private String name;

    /** 资源类型 */
    private String resourceType;

    /** 操作类型 (CREATE/READ/UPDATE/DELETE/EXECUTE/ADMIN) */
    private String action;

    /** 描述 */
    private String description;

    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
