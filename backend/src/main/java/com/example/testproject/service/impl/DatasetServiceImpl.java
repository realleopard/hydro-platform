package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.common.BusinessException;
import com.example.testproject.dto.DatasetCreateRequest;
import com.example.testproject.entity.Dataset;
import com.example.testproject.mapper.DatasetMapper;
import com.example.testproject.service.DatasetService;
import com.example.testproject.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 数据集服务实现
 */
@Service
@RequiredArgsConstructor
public class DatasetServiceImpl extends ServiceImpl<DatasetMapper, Dataset> implements DatasetService {

    private final FileStorageService fileStorageService;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

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

    @Override
    public Dataset uploadDataset(DatasetCreateRequest request, MultipartFile file, UUID userId) {
        Dataset dataset = new Dataset();
        dataset.setId(UUID.randomUUID());
        dataset.setName(request.getName());
        dataset.setDescription(request.getDescription());
        dataset.setOwnerId(userId);
        dataset.setDataType(request.getDataType());
        dataset.setVisibility(request.getVisibility() != null ? request.getVisibility() : "private");
        dataset.setStorageType("local");
        dataset.setDownloadCount(0);

        if (request.getTemporalStart() != null && !request.getTemporalStart().isBlank()) {
            dataset.setTemporalStart(LocalDateTime.parse(request.getTemporalStart(), DT_FMT));
        }
        if (request.getTemporalEnd() != null && !request.getTemporalEnd().isBlank()) {
            dataset.setTemporalEnd(LocalDateTime.parse(request.getTemporalEnd(), DT_FMT));
        }

        if (request.getSpatialBounds() != null) {
            dataset.setSpatialBounds(request.getSpatialBounds());
        }
        if (request.getMetadata() != null) {
            dataset.setMetadata(request.getMetadata());
        }

        String storagePath = fileStorageService.storeFile(file, dataset.getId());
        dataset.setStoragePath(storagePath);
        dataset.setFileSize(file.getSize());
        dataset.setChecksum(fileStorageService.calculateChecksum(file));

        save(dataset);
        return dataset;
    }

    @Override
    public Resource downloadDataset(UUID datasetId) {
        Dataset dataset = getById(datasetId);
        if (dataset == null) {
            throw new BusinessException("数据集不存在");
        }
        incrementDownloadCount(datasetId);
        return fileStorageService.loadFileAsResource(dataset.getStoragePath());
    }

    @Override
    public Map<String, Object> previewDataset(UUID datasetId) {
        Dataset dataset = getById(datasetId);
        if (dataset == null) {
            throw new BusinessException("数据集不存在");
        }
        if (!"csv".equals(dataset.getDataType())) {
            throw new BusinessException("仅支持 CSV 格式的数据预览");
        }
        return fileStorageService.previewCsv(dataset.getStoragePath(), 20);
    }

    @Override
    public void deleteDataset(UUID datasetId) {
        Dataset dataset = getById(datasetId);
        if (dataset != null) {
            fileStorageService.deleteFile(dataset.getStoragePath());
            removeById(datasetId);
        }
    }
}
