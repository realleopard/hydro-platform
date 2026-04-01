package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.ModelReview;

import java.util.List;
import java.util.UUID;

/**
 * 模型评价服务接口
 */
public interface ModelReviewService extends IService<ModelReview> {
    
    /**
     * 获取模型的评价列表
     */
    List<ModelReview> getReviewsByModelId(UUID modelId);
    
    /**
     * 计算模型平均评分
     */
    Double calculateAverageRating(UUID modelId);
}
