package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.Dataset;

import java.util.List;
import java.util.UUID;

/**
 * 数据集服务接口
 */
public interface DatasetService extends IService<Dataset> {
    
    /**
     * 获取用户的数据集列表
     */
    List<Dataset> getUserDatasets(UUID userId);
    
    /**
     * 增加下载计数
     */
    void incrementDownloadCount(UUID datasetId);
}
