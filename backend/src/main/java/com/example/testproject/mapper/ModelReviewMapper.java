package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.ModelReview;
import org.apache.ibatis.annotations.Mapper;

/**
 * 模型评价数据访问层
 */
@Mapper
public interface ModelReviewMapper extends BaseMapper<ModelReview> {
}
