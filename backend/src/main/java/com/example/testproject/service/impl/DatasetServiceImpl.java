package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.Dataset;
import com.example.testproject.mapper.DatasetMapper;
import com.example.testproject.service.DatasetService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * 数据集服务实现
 */
@Service
public class DatasetServiceImpl extends ServiceImpl<DatasetMapper, Dataset> implements DatasetService {
    
    @Override
    public List<Dataset> getUserDatasets(UUID userId) {
        LambdaQueryWrapper<Dataset> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Dataset::getOwnerId, userId)
               .orderByDesc(Dataset::getCreatedAt);
        return list(wrapper);
    }
    
    @Override
    public void incrementDownloadCount(UUID datasetId) {
        Dataset dataset = getById(datasetId);
        if (dataset != null) {
            dataset.setDownloadCount(dataset.getDownloadCount() + 1);
            updateById(dataset);
        }
    }
}
