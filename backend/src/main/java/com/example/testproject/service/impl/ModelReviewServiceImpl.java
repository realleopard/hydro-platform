package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.ModelReview;
import com.example.testproject.mapper.ModelReviewMapper;
import com.example.testproject.service.ModelReviewService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * 模型评价服务实现
 */
@Service
public class ModelReviewServiceImpl extends ServiceImpl<ModelReviewMapper, ModelReview> implements ModelReviewService {
    
    @Override
    public List<ModelReview> getReviewsByModelId(UUID modelId) {
        LambdaQueryWrapper<ModelReview> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ModelReview::getModelId, modelId)
               .orderByDesc(ModelReview::getCreatedAt);
        return list(wrapper);
    }
    
    @Override
    public Double calculateAverageRating(UUID modelId) {
        LambdaQueryWrapper<ModelReview> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ModelReview::getModelId, modelId);
        List<ModelReview> reviews = list(wrapper);
        
        if (reviews.isEmpty()) {
            return 0.0;
        }
        
        double sum = reviews.stream()
                .mapToInt(ModelReview::getRating)
                .sum();
        return sum / reviews.size();
    }
}
