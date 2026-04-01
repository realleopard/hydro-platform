package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.AuditLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 审计日志 Mapper
 */
@Mapper
public interface AuditLogMapper extends BaseMapper<AuditLog> {

    /**
     * 根据用户ID查询日志
     */
    @Select("SELECT * FROM audit_logs WHERE user_id = #{userId} ORDER BY created_at DESC LIMIT #{limit}")
    List<AuditLog> selectByUserId(@Param("userId") UUID userId, @Param("limit") int limit);

    /**
     * 根据资源查询日志
     */
    @Select("SELECT * FROM audit_logs WHERE resource_type = #{resourceType} AND resource_id = #{resourceId} ORDER BY created_at DESC")
    List<AuditLog> selectByResource(@Param("resourceType") String resourceType, @Param("resourceId") UUID resourceId);

    /**
     * 查询时间范围内的日志
     */
    @Select("SELECT * FROM audit_logs WHERE created_at BETWEEN #{start} AND #{end} ORDER BY created_at DESC")
    List<AuditLog> selectByTimeRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 统计操作次数
     */
    @Select("SELECT action, COUNT(*) as count FROM audit_logs WHERE created_at BETWEEN #{start} AND #{end} GROUP BY action")
    List<Map<String, Object>> countByAction(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
