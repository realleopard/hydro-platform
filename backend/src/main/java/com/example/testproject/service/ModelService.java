package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.Model;

import java.util.List;
import java.util.UUID;

/**
 * 模型服务接口
 */
public interface ModelService extends IService<Model> {
    
    /**
     * 创建模型
     */
    Model createModel(Model model, UUID ownerId);
    
    /**
     * 获取用户的模型列表
     */
    List<Model> getUserModels(UUID userId);
    
    /**
     * 发布模型
     */
    void publishModel(UUID modelId);
    
    /**
     * 增加下载计数
     */
    void incrementDownloadCount(UUID modelId);
    
    /**
     * 增加运行计数
     */
    void incrementRunCount(UUID modelId);
}
