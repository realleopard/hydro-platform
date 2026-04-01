package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.ModelVersion;

import java.util.List;
import java.util.UUID;

/**
 * 模型版本服务接口
 */
public interface ModelVersionService extends IService<ModelVersion> {
    
    /**
     * 获取模型的版本列表
     */
    List<ModelVersion> getVersionsByModelId(UUID modelId);
}
