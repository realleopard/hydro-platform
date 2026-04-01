package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.ModelVersion;
import com.example.testproject.mapper.ModelVersionMapper;
import com.example.testproject.service.ModelVersionService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * 模型版本服务实现
 */
@Service
public class ModelVersionServiceImpl extends ServiceImpl<ModelVersionMapper, ModelVersion> implements ModelVersionService {
    
    @Override
    public List<ModelVersion> getVersionsByModelId(UUID modelId) {
        LambdaQueryWrapper<ModelVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ModelVersion::getModelId, modelId)
               .orderByDesc(ModelVersion::getCreatedAt);
        return list(wrapper);
    }
}
