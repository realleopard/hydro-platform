package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.ModelCategory;
import org.apache.ibatis.annotations.Mapper;

/**
 * 模型分类数据访问层
 */
@Mapper
public interface ModelCategoryMapper extends BaseMapper<ModelCategory> {
}
