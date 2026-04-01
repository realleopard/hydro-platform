package com.example.testproject.service.impl;

import com.example.testproject.entity.Permission;
import com.example.testproject.entity.RolePermission;
import com.example.testproject.mapper.PermissionMapper;
import com.example.testproject.mapper.RolePermissionMapper;
import com.example.testproject.service.PermissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 权限服务测试
 */
class PermissionServiceImplTest {

    @Mock
    private PermissionMapper permissionMapper;

    @Mock
    private RolePermissionMapper rolePermissionMapper;

    @InjectMocks
    private PermissionServiceImpl permissionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCreatePermission() {
        when(permissionMapper.selectByCode("test:code")).thenReturn(null);
        when(permissionMapper.insert(any(Permission.class))).thenReturn(1);

        Permission permission = permissionService.createPermission(
                "test:code", "测试权限", "Test", "READ", "测试用");

        assertNotNull(permission);
        assertEquals("test:code", permission.getCode());
        assertEquals("测试权限", permission.getName());

        verify(permissionMapper).insert(any(Permission.class));
    }

    @Test
    void testCreatePermission_AlreadyExists() {
        Permission existing = new Permission();
        existing.setCode("test:code");

        when(permissionMapper.selectByCode("test:code")).thenReturn(existing);

        Permission result = permissionService.createPermission(
                "test:code", "测试权限", "Test", "READ", "测试用");

        assertEquals(existing, result);
        verify(permissionMapper, never()).insert(any(Permission.class));
    }

    @Test
    void testAssignPermissionToRole() {
        UUID permissionId = UUID.randomUUID();

        when(rolePermissionMapper.selectCount(any())).thenReturn(0L);
        when(rolePermissionMapper.insert(any(RolePermission.class))).thenReturn(1);

        permissionService.assignPermissionToRole("admin", permissionId);

        ArgumentCaptor<RolePermission> captor = ArgumentCaptor.forClass(RolePermission.class);
        verify(rolePermissionMapper).insert(captor.capture());

        assertEquals("admin", captor.getValue().getRole());
        assertEquals(permissionId, captor.getValue().getPermissionId());
    }

    @Test
    void testHasPermission_Admin() {
        // 超级管理员拥有所有权限
        assertTrue(permissionService.hasPermission("admin", "any:permission"));
    }

    @Test
    void testHasPermission_WithPermission() {
        when(permissionMapper.hasPermission("user", "model:read")).thenReturn(1);

        assertTrue(permissionService.hasPermission("user", "model:read"));
    }

    @Test
    void testHasPermission_WithoutPermission() {
        when(permissionMapper.hasPermission("user", "model:delete")).thenReturn(0);

        assertFalse(permissionService.hasPermission("user", "model:delete"));
    }

    @Test
    void testGetRolePermissions() {
        Permission p1 = new Permission();
        p1.setCode("model:read");
        Permission p2 = new Permission();
        p2.setCode("model:execute");

        when(permissionMapper.selectByRole("user")).thenReturn(Arrays.asList(p1, p2));

        List<Permission> permissions = permissionService.getRolePermissions("user");

        assertEquals(2, permissions.size());
    }

    @Test
    void testInitDefaultPermissions() {
        when(permissionMapper.selectByCode(any())).thenReturn(null);
        when(permissionMapper.insert(any(Permission.class))).thenReturn(1);
        when(rolePermissionMapper.selectCount(any())).thenReturn(0L);

        permissionService.initDefaultPermissions();

        // 验证插入了权限
        verify(permissionMapper, atLeast(20)).insert(any(Permission.class));
        // 验证分配了权限
        verify(rolePermissionMapper, atLeast(20)).insert(any(RolePermission.class));
    }
}
