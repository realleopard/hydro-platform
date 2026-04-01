package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 审计日志实体 - 对应 audit_logs 表
 */
@Data
@TableName("audit_logs")
public class AuditLog implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 日志ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;

    /** 操作用户ID */
    private UUID userId;

    /** 用户名 */
    private String username;

    /** 操作类型 (CREATE/UPDATE/DELETE/LOGIN/LOGOUT/RUN/EXPORT/IMPORT) */
    private String action;

    /** 资源类型 (User/Model/Workflow/Task/Dataset/Organization) */
    private String resourceType;

    /** 资源ID */
    private UUID resourceId;

    /** 资源名称 */
    private String resourceName;

    /** 变更前数据 (JSON) */
    private String oldValues;

    /** 变更后数据 (JSON) */
    private String newValues;

    /** 操作描述 */
    private String description;

    /** IP地址 */
    private String ipAddress;

    /** 用户代理 */
    private String userAgent;

    /** 请求ID */
    private String requestId;

    /** 操作结果 (SUCCESS/FAILED) */
    private String result;

    /** 错误信息 */
    private String errorMessage;

    /** 操作时间 */
    @TableField(fill = FieldFill.INSERT)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
