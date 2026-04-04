package com.example.testproject.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.entity.Model;
import com.example.testproject.entity.ModelReview;
import com.example.testproject.entity.ModelVersion;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.ModelService;
import com.example.testproject.service.ModelVersionService;
import com.example.testproject.service.ModelReviewService;
import com.example.testproject.service.ModelValidationService;
import com.example.testproject.service.DockerRegistryService;
import com.example.testproject.validation.ValidationMetrics;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 模型控制器
 */
@RestController
@RequestMapping("/api/v1/models")
@RequiredArgsConstructor
public class ModelController {
    
    private final ModelService modelService;
    private final ModelVersionService modelVersionService;
    private final ModelReviewService modelReviewService;
    private final ModelValidationService modelValidationService;
    private final DockerRegistryService dockerRegistryService;
    
    /**
     * 获取模型列表
     */
    @GetMapping("")
    public Result<Page<Model>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @CurrentUser UUID userId) {
        Page<Model> pageParam = new Page<>(page, size);
        Page<Model> result = modelService.page(pageParam);
        return Result.success(result);
    }
    
    /**
     * 获取用户模型列表
     */
    @GetMapping("/my")
    public Result<List<Model>> getMyModels(@CurrentUser UUID userId) {
        List<Model> models = modelService.getUserModels(userId);
        return Result.success(models);
    }
    
    /**
     * 创建模型
     */
    @PostMapping("")
    public Result<Model> create(@RequestBody Model model, @CurrentUser UUID userId) {
        Model created = modelService.createModel(model, userId);
        return Result.success(created);
    }
    
    /**
     * 获取模型详情（含最新验证指标）
     */
    @GetMapping("/{id}")
    public Result<Map<String, Object>> get(@PathVariable UUID id) {
        Model model = modelService.getById(id);
        if (model == null) {
            return Result.error("模型不存在");
        }

        // 用 Jackson 将 model 转为 Map，再附加验证指标
        Map<String, Object> result = new com.fasterxml.jackson.databind.ObjectMapper()
                .convertValue(model, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});

        // 附加最新验证指标
        try {
            ValidationMetrics metrics = modelValidationService.getLatestValidationMetrics(id);
            result.put("validationMetrics", metrics);
        } catch (Exception ignored) {}

        return Result.success(result);
    }
    
    /**
     * 更新模型
     */
    @PutMapping("/{id}")
    public Result<Model> update(@PathVariable UUID id, @RequestBody Model model) {
        model.setId(id);
        modelService.updateById(model);
        return Result.success(modelService.getById(id));
    }
    
    /**
     * 删除模型
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable UUID id) {
        modelService.removeById(id);
        return Result.success(null);
    }
    
    /**
     * 发布模型
     */
    @PostMapping("/{id}/publish")
    public Result<Void> publish(@PathVariable UUID id) {
        modelService.publishModel(id);
        return Result.success(null);
    }
    
    /**
     * 验证模型
     */
    @PostMapping("/{id}/validate")
    public Result<String> validate(@PathVariable UUID id) {
        // TODO: 实现模型验证逻辑
        return Result.success("验证通过");
    }
    
    // ==================== 版本管理 ====================
    
    /**
     * 获取模型版本列表
     */
    @GetMapping("/{id}/versions")
    public Result<List<ModelVersion>> getVersions(@PathVariable UUID id) {
        List<ModelVersion> versions = modelVersionService.getVersionsByModelId(id);
        return Result.success(versions);
    }
    
    /**
     * 创建模型版本
     */
    @PostMapping("/{id}/versions")
    public Result<ModelVersion> createVersion(
            @PathVariable UUID id, 
            @RequestBody ModelVersion version,
            @CurrentUser UUID userId) {
        version.setModelId(id);
        version.setCreatedBy(userId);
        if (version.getId() == null) {
            version.setId(UUID.randomUUID());
        }
        modelVersionService.save(version);
        return Result.success(version);
    }
    
    /**
     * 获取指定版本
     */
    @GetMapping("/{id}/versions/{versionId}")
    public Result<ModelVersion> getVersion(@PathVariable UUID id, @PathVariable UUID versionId) {
        ModelVersion version = modelVersionService.getById(versionId);
        if (version == null || !version.getModelId().equals(id)) {
            return Result.error("版本不存在");
        }
        return Result.success(version);
    }
    
    /**
     * 删除模型版本
     */
    @DeleteMapping("/{id}/versions/{versionId}")
    public Result<Void> deleteVersion(@PathVariable UUID id, @PathVariable UUID versionId) {
        ModelVersion version = modelVersionService.getById(versionId);
        if (version != null && version.getModelId().equals(id)) {
            modelVersionService.removeById(versionId);
        }
        return Result.success(null);
    }
    
    // ==================== 镜像验证 ====================

    /**
     * 验证模型的 Docker 镜像是否存在于 Registry
     */
    @GetMapping("/{id}/validate-image")
    public Result<Map<String, Object>> validateImage(@PathVariable UUID id) {
        Model model = modelService.getById(id);
        if (model == null) {
            return Result.error("模型不存在");
        }

        Map<String, Object> validationResult = new HashMap<>();
        String dockerImage = model.getDockerImage();
        validationResult.put("modelId", id);
        validationResult.put("dockerImage", dockerImage);

        if (dockerImage == null || dockerImage.isEmpty()) {
            validationResult.put("valid", false);
            validationResult.put("message", "模型未配置 Docker 镜像");
            return Result.success(validationResult);
        }

        // 解析镜像名和标签，例如 "hydro-model:v1.0" -> name="hydro-model", tag="v1.0"
        String imageName;
        String tag;
        int colonIndex = dockerImage.lastIndexOf(':');
        if (colonIndex > 0) {
            imageName = dockerImage.substring(0, colonIndex);
            tag = dockerImage.substring(colonIndex + 1);
        } else {
            imageName = dockerImage;
            tag = "latest";
        }
        validationResult.put("imageName", imageName);
        validationResult.put("tag", tag);

        boolean exists = dockerRegistryService.imageExists(imageName, tag);
        validationResult.put("exists", exists);

        if (exists) {
            String digest = dockerRegistryService.getImageDigest(imageName, tag);
            validationResult.put("digest", digest);
            validationResult.put("valid", true);
            validationResult.put("message", "镜像验证通过");
        } else {
            validationResult.put("valid", false);
            validationResult.put("message", "镜像在 Registry 中不存在");
        }

        return Result.success(validationResult);
    }

    // ==================== 评价管理 ====================
    
    /**
     * 获取模型评价列表
     */
    @GetMapping("/{id}/reviews")
    public Result<List<ModelReview>> getReviews(@PathVariable UUID id) {
        List<ModelReview> reviews = modelReviewService.getReviewsByModelId(id);
        return Result.success(reviews);
    }
    
    /**
     * 创建模型评价
     */
    @PostMapping("/{id}/reviews")
    public Result<ModelReview> createReview(
            @PathVariable UUID id,
            @RequestBody ModelReview review,
            @CurrentUser UUID userId) {
        review.setModelId(id);
        review.setUserId(userId);
        review.setHelpfulCount(0);
        if (review.getId() == null) {
            review.setId(UUID.randomUUID());
        }
        modelReviewService.save(review);
        return Result.success(review);
    }
}
