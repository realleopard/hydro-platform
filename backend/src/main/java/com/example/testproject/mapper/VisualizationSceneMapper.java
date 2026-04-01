package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.VisualizationScene;
import org.apache.ibatis.annotations.Mapper;

/**
 * 可视化场景数据访问层
 */
@Mapper
public interface VisualizationSceneMapper extends BaseMapper<VisualizationScene> {
}
