package com.example.testproject.aspect;

import com.example.testproject.annotation.AuditLog;
import com.example.testproject.entity.User;
import com.example.testproject.mapper.AuditLogMapper;
import com.example.testproject.security.CurrentUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 审计日志切面
 * 自动记录标记了 @AuditLog 注解的方法调用
 */
@Slf4j
@Aspect
@Component
public class AuditLogAspect {

    private final AuditLogMapper auditLogMapper;
    private final ObjectMapper objectMapper;
    private final SpelExpressionParser parser;

    public AuditLogAspect(AuditLogMapper auditLogMapper, ObjectMapper objectMapper) {
        this.auditLogMapper = auditLogMapper;
        this.objectMapper = objectMapper;
        this.parser = new SpelExpressionParser();
    }

    @Around("@annotation(auditLog)")
    public Object around(ProceedingJoinPoint point, AuditLog auditLog) throws Throwable {
        // 获取方法信息
        MethodSignature signature = (MethodSignature) point.getSignature();
        Method method = signature.getMethod();

        // 获取当前用户
        User currentUser = getCurrentUser();

        // 获取请求信息
        HttpServletRequest request = getRequest();

        // 准备 SpEL 上下文
        StandardEvaluationContext context = new StandardEvaluationContext();
        context.setVariable("args", point.getArgs());

        // 获取参数名和值
        String[] paramNames = signature.getParameterNames();
        Object[] args = point.getArgs();
        for (int i = 0; i < paramNames.length; i++) {
            context.setVariable(paramNames[i], args[i]);
        }

        // 创建审计日志
        com.example.testproject.entity.AuditLog logEntry = new com.example.testproject.entity.AuditLog();
        logEntry.setId(UUID.randomUUID());

        if (currentUser != null) {
            logEntry.setUserId(currentUser.getId());
            logEntry.setUsername(currentUser.getUsername());
        }

        logEntry.setAction(auditLog.action());
        logEntry.setResourceType(auditLog.resourceType());
        logEntry.setDescription(auditLog.description());
        logEntry.setCreatedAt(LocalDateTime.now());

        // 解析资源ID和名称
        if (!auditLog.resourceId().isEmpty()) {
            try {
                Object resourceId = parser.parseExpression(auditLog.resourceId()).getValue(context);
                if (resourceId instanceof UUID) {
                    logEntry.setResourceId((UUID) resourceId);
                }
            } catch (Exception e) {
                log.warn("解析资源ID失败: {}", e.getMessage());
            }
        }

        if (!auditLog.resourceName().isEmpty()) {
            try {
                Object resourceName = parser.parseExpression(auditLog.resourceName()).getValue(context);
                if (resourceName != null) {
                    logEntry.setResourceName(resourceName.toString());
                }
            } catch (Exception e) {
                log.warn("解析资源名称失败: {}", e.getMessage());
            }
        }

        // 记录请求信息
        if (request != null) {
            logEntry.setIpAddress(getClientIp(request));
            logEntry.setUserAgent(request.getHeader("User-Agent"));
            logEntry.setRequestId(request.getHeader("X-Request-Id"));
        }

        // 记录变更前数据
        if (auditLog.recordParams()) {
            try {
                logEntry.setOldValues(objectMapper.writeValueAsString(args));
            } catch (Exception e) {
                log.warn("序列化参数失败: {}", e.getMessage());
            }
        }

        // 执行方法
        Object result = null;
        try {
            result = point.proceed();
            logEntry.setResult("SUCCESS");

            // 记录返回值
            if (auditLog.recordResult() && result != null) {
                try {
                    context.setVariable("result", result);
                    logEntry.setNewValues(objectMapper.writeValueAsString(result));

                    // 如果资源ID为空，尝试从结果解析
                    if (logEntry.getResourceId() == null && !auditLog.resourceId().isEmpty()) {
                        try {
                            Object resourceId = parser.parseExpression(auditLog.resourceId()).getValue(context);
                            if (resourceId instanceof UUID) {
                                logEntry.setResourceId((UUID) resourceId);
                            }
                        } catch (Exception e) {
                            log.warn("从结果解析资源ID失败: {}", e.getMessage());
                        }
                    }
                } catch (Exception e) {
                    log.warn("序列化结果失败: {}", e.getMessage());
                }
            }

        } catch (Exception e) {
            logEntry.setResult("FAILED");
            logEntry.setErrorMessage(e.getMessage());
            throw e;
        } finally {
            // 保存审计日志
            try {
                auditLogMapper.insert(logEntry);
            } catch (Exception e) {
                log.error("保存审计日志失败: {}", e.getMessage());
            }
        }

        return result;
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

    private HttpServletRequest getRequest() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                return attributes.getRequest();
            }
        } catch (Exception e) {
            log.warn("获取请求失败: {}", e.getMessage());
        }
        return null;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 多个代理时取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}