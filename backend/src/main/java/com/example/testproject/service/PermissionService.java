package com.example.testproject.service;

import com.example.testproject.entity.Permission;

import java.util.List;
import java.util.UUID;

/**
 * 权限服务接口
 */
public interface PermissionService {

    /**
     * 创建权限
     */
    Permission createPermission(String code, String name, String resourceType, String action, String description);

    /**
     * 为角色分配权限
     */
    void assignPermissionToRole(String role, UUID permissionId);

    /**
     * 移除角色的权限
     */
    void removePermissionFromRole(String role, UUID permissionId);

    /**
     * 获取角色的所有权限
     */
    List<Permission> getRolePermissions(String role);

    /**
     * 检查角色是否有权限
     */
    boolean hasPermission(String role, String permissionCode);

    /**
     * 初始化系统默认权限
     */
    void initDefaultPermissions();

    /**
     * 预定义权限编码
     */
    interface PermissionCodes {
        // 用户管理权限
        String USER_CREATE = "user:create";
        String USER_READ = "user:read";
        String USER_UPDATE = "user:update";
        String USER_DELETE = "user:delete";

        // 模型管理权限
        String MODEL_CREATE = "model:create";
        String MODEL_READ = "model:read";
        String MODEL_UPDATE = "model:update";
        String MODEL_DELETE = "model:delete";
        String MODEL_EXECUTE = "model:execute";

        // 工作流权限
        String WORKFLOW_CREATE = "workflow:create";
        String WORKFLOW_READ = "workflow:read";
        String WORKFLOW_UPDATE = "workflow:update";
        String WORKFLOW_DELETE = "workflow:delete";
        String WORKFLOW_EXECUTE = "workflow:execute";

        // 任务权限
        String TASK_READ = "task:read";
        String TASK_CANCEL = "task:cancel";
        String TASK_RETRY = "task:retry";

        // 数据集权限
        String DATASET_CREATE = "dataset:create";
        String DATASET_READ = "dataset:read";
        String DATASET_UPDATE = "dataset:update";
        String DATASET_DELETE = "dataset:delete";

        // 系统管理权限
        String SYSTEM_ADMIN = "system:admin";
    }
}
