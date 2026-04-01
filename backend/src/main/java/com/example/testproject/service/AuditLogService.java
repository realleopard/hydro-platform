package com.example.testproject.service;

import com.example.testproject.entity.AuditLog;
import com.example.testproject.mapper.AuditLogMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 审计日志服务
 */
@Slf4j
@Service
public class AuditLogService {

    private final AuditLogMapper auditLogMapper;

    public AuditLogService(AuditLogMapper auditLogMapper) {
        this.auditLogMapper = auditLogMapper;
    }

    /**
     * 查询用户的审计日志
     */
    public List<AuditLog> getUserLogs(UUID userId, int limit) {
        return auditLogMapper.selectByUserId(userId, limit);
    }

    /**
     * 查询资源的审计日志
     */
    public List<AuditLog> getResourceLogs(String resourceType, UUID resourceId) {
        return auditLogMapper.selectByResource(resourceType, resourceId);
    }

    /**
     * 查询时间范围内的日志
     */
    public List<AuditLog> getLogsByTimeRange(LocalDateTime start, LocalDateTime end) {
        return auditLogMapper.selectByTimeRange(start, end);
    }

    /**
     * 获取操作统计
     */
    public List<Map<String, Object>> getActionStatistics(LocalDateTime start, LocalDateTime end) {
        return auditLogMapper.countByAction(start, end);
    }
}
