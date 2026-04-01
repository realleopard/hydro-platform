package com.example.testproject.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.testproject.entity.ModelValidation;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

/**
 * 模型验证 Mapper
 */
@Mapper
public interface ModelValidationMapper extends BaseMapper<ModelValidation> {

    /**
     * 根据模型ID查询验证记录
     */
    @Select("SELECT * FROM model_validations WHERE model_id = #{modelId} ORDER BY created_at DESC")
    List<ModelValidation> selectByModelId(UUID modelId);
}
