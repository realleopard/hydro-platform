package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.Model;
import org.apache.ibatis.annotations.Mapper;

/**
 * 模型数据访问层
 */
@Mapper
public interface ModelMapper extends BaseMapper<Model> {
}
