package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.dto.DatasetCreateRequest;
import com.example.testproject.entity.Dataset;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
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

    /**
     * 上传数据集文件并创建记录
     */
    Dataset uploadDataset(DatasetCreateRequest request, MultipartFile file, UUID userId);

    /**
     * 下载数据集文件
     */
    Resource downloadDataset(UUID datasetId);

    /**
     * 预览数据集内容（CSV）
     */
    Map<String, Object> previewDataset(UUID datasetId);

    /**
     * 删除数据集（含物理文件）
     */
    void deleteDataset(UUID datasetId);
}
