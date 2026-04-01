package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.RolePermission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

/**
 * 角色权限关联 Mapper
 */
@Mapper
public interface RolePermissionMapper extends BaseMapper<RolePermission> {

    /**
     * 根据角色查询所有权限关联
     */
    @Select("SELECT * FROM role_permissions WHERE role = #{role}")
    List<RolePermission> selectByRole(@Param("role") String role);

    /**
     * 根据权限ID查询所有角色关联
     */
    @Select("SELECT * FROM role_permissions WHERE permission_id = #{permissionId}")
    List<RolePermission> selectByPermissionId(@Param("permissionId") UUID permissionId);

    /**
     * 删除角色的所有权限
     */
    @Select("DELETE FROM role_permissions WHERE role = #{role}")
    void deleteByRole(@Param("role") String role);
}
