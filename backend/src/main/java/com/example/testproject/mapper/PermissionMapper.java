package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.Permission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

/**
 * 权限 Mapper
 */
@Mapper
public interface PermissionMapper extends BaseMapper<Permission> {

    /**
     * 根据角色查询权限
     */
    @Select("SELECT p.* FROM permissions p " +
            "INNER JOIN role_permissions rp ON p.id = rp.permission_id " +
            "WHERE rp.role = #{role}")
    List<Permission> selectByRole(@Param("role") String role);

    /**
     * 根据资源类型查询权限
     */
    @Select("SELECT * FROM permissions WHERE resource_type = #{resourceType}")
    List<Permission> selectByResourceType(@Param("resourceType") String resourceType);

    /**
     * 根据权限编码查询
     */
    @Select("SELECT * FROM permissions WHERE code = #{code}")
    Permission selectByCode(@Param("code") String code);

    /**
     * 检查角色是否有指定权限
     */
    @Select("SELECT COUNT(*) FROM role_permissions rp " +
            "INNER JOIN permissions p ON rp.permission_id = p.id " +
            "WHERE rp.role = #{role} AND p.code = #{permissionCode}")
    int hasPermission(@Param("role") String role, @Param("permissionCode") String permissionCode);
}
