package com.example.testproject.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.entity.Dataset;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.DatasetService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
     * 获取数据集列表
     */
    @GetMapping("")
    public Result<Page<Dataset>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Page<Dataset> pageParam = new Page<>(page, size);
        Page<Dataset> result = datasetService.page(pageParam);
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
     * 创建数据集
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
     * 更新数据集
     */
    @PutMapping("/{id}")
    public Result<Dataset> update(@PathVariable UUID id, @RequestBody Dataset dataset) {
        dataset.setId(id);
        datasetService.updateById(dataset);
        return Result.success(datasetService.getById(id));
    }
    
    /**
     * 删除数据集
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable UUID id) {
        datasetService.removeById(id);
        return Result.success(null);
    }
}
