package com.example.testproject.aspect;

import com.example.testproject.annotation.RequirePermission;
import com.example.testproject.entity.User;
import com.example.testproject.mapper.PermissionMapper;
import com.example.testproject.security.CurrentUser;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 权限检查切面
 * 检查用户是否有权限访问标记了 @RequirePermission 的方法
 */
@Slf4j
@Aspect
@Component
public class PermissionAspect {

    private final PermissionMapper permissionMapper;

    public PermissionAspect(PermissionMapper permissionMapper) {
        this.permissionMapper = permissionMapper;
    }

    @Before("@annotation(requirePermission)")
    public void checkPermission(JoinPoint point, RequirePermission requirePermission) {
        String permissionCode = requirePermission.value();

        // 获取当前用户
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            throw new SecurityException("未登录，无权访问");
        }

        // 超级管理员拥有所有权限
        if ("admin".equals(currentUser.getRole())) {
            log.debug("超级管理员访问: user={}, permission={}", currentUser.getUsername(), permissionCode);
            return;
        }

        // 检查权限
        int hasPermission = permissionMapper.hasPermission(currentUser.getRole(), permissionCode);
        if (hasPermission == 0) {
            log.warn("权限不足: user={}, role={}, permission={}",
                    currentUser.getUsername(), currentUser.getRole(), permissionCode);
            throw new SecurityException("权限不足: " + permissionCode);
        }

        log.debug("权限检查通过: user={}, permission={}", currentUser.getUsername(), permissionCode);
    }

    private User getCurrentUser() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                Object user = request.getAttribute("currentUser");
                if (user instanceof User) {
                    return (User) user;
                }
            }
        } catch (Exception e) {
            log.warn("获取当前用户失败: {}", e.getMessage());
        }
        return null;
    }
}
