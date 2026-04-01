package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.testproject.entity.Permission;
import com.example.testproject.entity.RolePermission;
import com.example.testproject.mapper.PermissionMapper;
import com.example.testproject.mapper.RolePermissionMapper;
import com.example.testproject.service.PermissionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * 权限服务实现
 */
@Slf4j
@Service
public class PermissionServiceImpl implements PermissionService {

    private final PermissionMapper permissionMapper;
    private final RolePermissionMapper rolePermissionMapper;

    public PermissionServiceImpl(PermissionMapper permissionMapper, RolePermissionMapper rolePermissionMapper) {
        this.permissionMapper = permissionMapper;
        this.rolePermissionMapper = rolePermissionMapper;
    }

    @Override
    @Transactional
    public Permission createPermission(String code, String name, String resourceType, String action, String description) {
        // 检查是否已存在
        Permission existing = permissionMapper.selectByCode(code);
        if (existing != null) {
            log.warn("权限已存在: {}", code);
            return existing;
        }

        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setCode(code);
        permission.setName(name);
        permission.setResourceType(resourceType);
        permission.setAction(action);
        permission.setDescription(description);
        permission.setCreatedAt(LocalDateTime.now());
        permission.setUpdatedAt(LocalDateTime.now());

        permissionMapper.insert(permission);

        log.info("创建权限: code={}, name={}", code, name);
        return permission;
    }

    @Override
    @Transactional
    public void assignPermissionToRole(String role, UUID permissionId) {
        // 检查是否已分配
        LambdaQueryWrapper<RolePermission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RolePermission::getRole, role)
                .eq(RolePermission::getPermissionId, permissionId);

        if (rolePermissionMapper.selectCount(wrapper) > 0) {
            log.debug("权限已分配给角色: role={}, permissionId={}", role, permissionId);
            return;
        }

        RolePermission rolePermission = new RolePermission();
        rolePermission.setId(UUID.randomUUID());
        rolePermission.setRole(role);
        rolePermission.setPermissionId(permissionId);
        rolePermission.setCreatedAt(LocalDateTime.now());

        rolePermissionMapper.insert(rolePermission);

        log.info("分配权限给角色: role={}, permissionId={}", role, permissionId);
    }

    @Override
    @Transactional
    public void removePermissionFromRole(String role, UUID permissionId) {
        LambdaQueryWrapper<RolePermission> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(RolePermission::getRole, role)
                .eq(RolePermission::getPermissionId, permissionId);

        rolePermissionMapper.delete(wrapper);

        log.info("移除角色权限: role={}, permissionId={}", role, permissionId);
    }

    @Override
    public List<Permission> getRolePermissions(String role) {
        return permissionMapper.selectByRole(role);
    }

    @Override
    public boolean hasPermission(String role, String permissionCode) {
        if ("admin".equals(role)) {
            return true;
        }
        return permissionMapper.hasPermission(role, permissionCode) > 0;
    }

    @Override
    @Transactional
    public void initDefaultPermissions() {
        log.info("初始化系统默认权限...");

        // 用户管理权限
        Permission userCreate = createPermission(PermissionCodes.USER_CREATE, "创建用户", "User", "CREATE", "创建新用户账号");
        Permission userRead = createPermission(PermissionCodes.USER_READ, "查看用户", "User", "READ", "查看用户信息");
        Permission userUpdate = createPermission(PermissionCodes.USER_UPDATE, "更新用户", "User", "UPDATE", "更新用户信息");
        Permission userDelete = createPermission(PermissionCodes.USER_DELETE, "删除用户", "User", "DELETE", "删除用户账号");

        // 模型管理权限
        Permission modelCreate = createPermission(PermissionCodes.MODEL_CREATE, "创建模型", "Model", "CREATE", "创建新模型");
        Permission modelRead = createPermission(PermissionCodes.MODEL_READ, "查看模型", "Model", "READ", "查看模型信息");
        Permission modelUpdate = createPermission(PermissionCodes.MODEL_UPDATE, "更新模型", "Model", "UPDATE", "更新模型信息");
        Permission modelDelete = createPermission(PermissionCodes.MODEL_DELETE, "删除模型", "Model", "DELETE", "删除模型");
        Permission modelExecute = createPermission(PermissionCodes.MODEL_EXECUTE, "执行模型", "Model", "EXECUTE", "执行模型计算");

        // 工作流权限
        Permission workflowCreate = createPermission(PermissionCodes.WORKFLOW_CREATE, "创建工作流", "Workflow", "CREATE", "创建新工作流");
        Permission workflowRead = createPermission(PermissionCodes.WORKFLOW_READ, "查看工作流", "Workflow", "READ", "查看工作流");
        Permission workflowUpdate = createPermission(PermissionCodes.WORKFLOW_UPDATE, "更新工作流", "Workflow", "UPDATE", "更新工作流");
        Permission workflowDelete = createPermission(PermissionCodes.WORKFLOW_DELETE, "删除工作流", "Workflow", "DELETE", "删除工作流");
        Permission workflowExecute = createPermission(PermissionCodes.WORKFLOW_EXECUTE, "执行工作流", "Workflow", "EXECUTE", "执行工作流");

        // 任务权限
        Permission taskRead = createPermission(PermissionCodes.TASK_READ, "查看任务", "Task", "READ", "查看任务状态");
        Permission taskCancel = createPermission(PermissionCodes.TASK_CANCEL, "取消任务", "Task", "EXECUTE", "取消正在执行的任务");
        Permission taskRetry = createPermission(PermissionCodes.TASK_RETRY, "重试任务", "Task", "EXECUTE", "重试失败的任务");

        // 数据集权限
        Permission datasetCreate = createPermission(PermissionCodes.DATASET_CREATE, "创建数据集", "Dataset", "CREATE", "上传新数据集");
        Permission datasetRead = createPermission(PermissionCodes.DATASET_READ, "查看数据集", "Dataset", "READ", "查看数据集");
        Permission datasetUpdate = createPermission(PermissionCodes.DATASET_UPDATE, "更新数据集", "Dataset", "UPDATE", "更新数据集");
        Permission datasetDelete = createPermission(PermissionCodes.DATASET_DELETE, "删除数据集", "Dataset", "DELETE", "删除数据集");

        // 系统管理权限
        Permission systemAdmin = createPermission(PermissionCodes.SYSTEM_ADMIN, "系统管理", "System", "ADMIN", "系统管理权限");

        // 为 admin 角色分配所有权限
        List<Permission> allPermissions = Arrays.asList(
                userCreate, userRead, userUpdate, userDelete,
                modelCreate, modelRead, modelUpdate, modelDelete, modelExecute,
                workflowCreate, workflowRead, workflowUpdate, workflowDelete, workflowExecute,
                taskRead, taskCancel, taskRetry,
                datasetCreate, datasetRead, datasetUpdate, datasetDelete,
                systemAdmin
        );

        for (Permission permission : allPermissions) {
            assignPermissionToRole("admin", permission.getId());
        }

        // 为 expert 角色分配大部分权限（除了用户和系统管理）
        List<Permission> expertPermissions = Arrays.asList(
                modelCreate, modelRead, modelUpdate, modelDelete, modelExecute,
                workflowCreate, workflowRead, workflowUpdate, workflowDelete, workflowExecute,
                taskRead, taskCancel, taskRetry,
                datasetCreate, datasetRead, datasetUpdate, datasetDelete
        );

        for (Permission permission : expertPermissions) {
            assignPermissionToRole("expert", permission.getId());
        }

        // 为 user 角色分配基本权限
        List<Permission> userPermissions = Arrays.asList(
                modelRead, modelExecute,
                workflowRead, workflowExecute,
                taskRead,
                datasetRead
        );

        for (Permission permission : userPermissions) {
            assignPermissionToRole("user", permission.getId());
        }

        log.info("系统默认权限初始化完成");
    }
}
