package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.Organization;
import org.apache.ibatis.annotations.Mapper;

/**
 * 组织数据访问层
 */
@Mapper
public interface OrganizationMapper extends BaseMapper<Organization> {
}
