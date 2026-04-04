package com.example.testproject.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.dto.DatasetCreateRequest;
import com.example.testproject.entity.Dataset;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.DatasetService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 数据集控制器
 */
@RestController
@RequestMapping("/api/v1/datasets")
@RequiredArgsConstructor
public class DatasetController {

    private final DatasetService datasetService;

    /**
     * 获取数据集列表（支持服务端筛选）
     */
    @GetMapping("")
    public Result<Page<Dataset>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String dataType,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) String keyword) {

        Page<Dataset> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Dataset> wrapper = new LambdaQueryWrapper<>();

        if (dataType != null && !dataType.isEmpty()) {
            wrapper.eq(Dataset::getDataType, dataType);
        }
        if (visibility != null && !visibility.isEmpty()) {
            wrapper.eq(Dataset::getVisibility, visibility);
        }
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.and(w -> w.like(Dataset::getName, keyword)
                    .or()
                    .like(Dataset::getDescription, keyword));
        }
        wrapper.orderByDesc(Dataset::getCreatedAt);

        Page<Dataset> result = datasetService.page(pageParam, wrapper);
        return Result.success(result);
    }

    /**
     * 获取用户数据集列表
     */
    @GetMapping("/my")
    public Result<List<Dataset>> getMyDatasets(@CurrentUser UUID userId) {
        List<Dataset> datasets = datasetService.getUserDatasets(userId);
        return Result.success(datasets);
    }

    /**
     * 上传数据集文件
     */
    @PostMapping("/upload")
    public Result<Dataset> upload(
            @RequestPart("file") MultipartFile file,
            @RequestPart("metadata") DatasetCreateRequest metadata,
            @CurrentUser UUID userId) {
        Dataset dataset = datasetService.uploadDataset(metadata, file, userId);
        return Result.success(dataset);
    }

    /**
     * 创建数据集（仅元数据，无文件）
     */
    @PostMapping("")
    public Result<Dataset> create(@RequestBody Dataset dataset, @CurrentUser UUID userId) {
        if (dataset.getId() == null) {
            dataset.setId(UUID.randomUUID());
        }
        dataset.setOwnerId(userId);
        dataset.setDownloadCount(0);
        datasetService.save(dataset);
        return Result.success(dataset);
    }

    /**
     * 获取数据集详情
     */
    @GetMapping("/{id}")
    public Result<Dataset> get(@PathVariable UUID id) {
        Dataset dataset = datasetService.getById(id);
        if (dataset == null) {
            return Result.error("数据集不存在");
        }
        return Result.success(dataset);
    }

    /**
     * 下载数数据集文件
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        Resource resource = datasetService.downloadDataset(id);
        Dataset dataset = datasetService.getById(id);

        String filename = dataset.getStoragePath() != null
                ? java.nio.file.Paths.get(dataset.getStoragePath()).getFileName().toString()
                : dataset.getName();
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");

        long contentLength = dataset.getFileSize() != null ? dataset.getFileSize() : -1;

        var response = ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + encodedFilename + "\"; filename*=UTF-8''" + encodedFilename)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE);
        if (contentLength > 0) {
            response.contentLength(contentLength);
        }
        return response.body(resource);
    }

    /**
     * 预览数据集内容
     */
    @GetMapping("/{id}/preview")
    public Result<Map<String, Object>> preview(@PathVariable UUID id) {
        Map<String, Object> preview = datasetService.previewDataset(id);
        return Result.success(preview);
    }

    /**
     * 更新数据集
     */
    @PutMapping("/{id}")
    public Result<Dataset> update(@PathVariable UUID id, @RequestBody Dataset dataset) {
        dataset.setId(id);
        datasetService.updateById(dataset);
        return Result.success(datasetService.getById(id));
    }

    /**
     * 删除数据集（含物理文件）
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable UUID id) {
        datasetService.deleteDataset(id);
        return Result.success(null);
    }
}
