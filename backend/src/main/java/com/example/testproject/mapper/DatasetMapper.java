package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.Dataset;
import org.apache.ibatis.annotations.Mapper;

/**
 * 数据集数据访问层
 */
@Mapper
public interface DatasetMapper extends BaseMapper<Dataset> {
}
