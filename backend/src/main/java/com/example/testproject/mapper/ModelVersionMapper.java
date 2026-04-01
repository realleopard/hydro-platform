package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.ModelVersion;
import org.apache.ibatis.annotations.Mapper;

/**
 * 模型版本数据访问层
 */
@Mapper
public interface ModelVersionMapper extends BaseMapper<ModelVersion> {
}
