package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.Workflow;
import org.apache.ibatis.annotations.Mapper;

/**
 * 工作流数据访问层
 */
@Mapper
public interface WorkflowMapper extends BaseMapper<Workflow> {
}
