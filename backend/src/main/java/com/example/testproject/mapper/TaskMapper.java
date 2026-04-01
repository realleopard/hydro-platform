package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.Task;
import org.apache.ibatis.annotations.Mapper;

/**
 * 任务数据访问层
 */
@Mapper
public interface TaskMapper extends BaseMapper<Task> {
}
