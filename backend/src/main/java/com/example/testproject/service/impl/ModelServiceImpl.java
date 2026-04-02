package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.Model;
import com.example.testproject.mapper.ModelMapper;
import com.example.testproject.service.ModelService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 模型服务实现
 */
@Service
@RequiredArgsConstructor
public class ModelServiceImpl extends ServiceImpl<ModelMapper, Model> implements ModelService {
    
    @Override
    @Transactional
    public Model createModel(Model model, UUID ownerId) {
        if (model.getId() == null) {
            model.setId(UUID.randomUUID());
        }
        model.setOwnerId(ownerId);
        model.setStatus("draft");
        model.setVersionCount(1);
        model.setDownloadCount(0);
        model.setRunCount(0);
        model.setRatingAvg(0.0);
        model.setRatingCount(0);
        model.setCurrentVersion("0.1.0");
        save(model);
        return model;
    }
    
    @Override
    public List<Model> getUserModels(UUID userId) {
        LambdaQueryWrapper<Model> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Model::getOwnerId, userId)
               .orderByDesc(Model::getCreatedAt);
        return list(wrapper);
    }
    
    @Override
    @Transactional
    public void publishModel(UUID modelId) {
        Model model = getById(modelId);
        if (model != null) {
            model.setStatus("published");
            model.setPublishedAt(LocalDateTime.now());
            updateById(model);
        }
    }
    
    @Override
    @Transactional
    public void incrementDownloadCount(UUID modelId) {
        Model model = getById(modelId);
        if (model != null) {
            model.setDownloadCount(model.getDownloadCount() + 1);
            updateById(model);
        }
    }
    
    @Override
    @Transactional
    public void incrementRunCount(UUID modelId) {
        Model model = getById(modelId);
        if (model != null) {
            model.setRunCount(model.getRunCount() + 1);
            updateById(model);
        }
    }
}
