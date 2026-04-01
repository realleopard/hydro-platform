package com.example.testproject.controller;

import com.example.testproject.common.Result;
import com.example.testproject.entity.ModelValidation;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.ModelValidationService;
import com.example.testproject.validation.ValidationMetrics;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 模型验证控制器
 * 提供模型验证指标计算和验证记录管理功能
 */
@RestController
@RequestMapping("/api/v1/validations")
@RequiredArgsConstructor
@Tag(name = "模型验证", description = "模型验证指标计算、验证记录管理")
public class ModelValidationController {

    private final ModelValidationService modelValidationService;

    /**
     * 创建验证记录
     */
    @PostMapping("")
    @Operation(summary = "创建模型验证记录")
    public Result<ModelValidation> createValidation(
            @Valid @RequestBody CreateValidationRequest request,
            @CurrentUser UUID userId) {
        ModelValidation validation = modelValidationService.createValidation(
                request.getModelId(),
                request.getVersionId(),
                request.getReferenceDatasetId(),
                userId
        );
        return Result.success(validation);
    }

    /**
     * 执行验证计算
     */
    @PostMapping("/{validationId}/perform")
    @Operation(summary = "执行模型验证计算")
    public Result<ValidationMetrics> performValidation(
            @PathVariable UUID validationId,
            @Valid @RequestBody PerformValidationRequest request) {
        ValidationMetrics metrics = modelValidationService.performValidation(
                validationId,
                request.getObserved(),
                request.getSimulated()
        );
        return Result.success(metrics);
    }

    /**
     * 获取验证记录的指标
     */
    @GetMapping("/{validationId}/metrics")
    @Operation(summary = "获取验证指标")
    public Result<ValidationMetrics> getValidationMetrics(
            @PathVariable UUID validationId) {
        ValidationMetrics metrics = modelValidationService.getValidationMetrics(validationId);
        if (metrics == null) {
            return Result.error("验证记录不存在或尚未完成");
        }
        return Result.success(metrics);
    }

    /**
     * 获取模型的所有验证记录
     */
    @GetMapping("/model/{modelId}")
    @Operation(summary = "获取模型的验证记录列表")
    public Result<List<ModelValidation>> getModelValidations(
            @PathVariable UUID modelId) {
        List<ModelValidation> validations = modelValidationService.getModelValidations(modelId);
        return Result.success(validations);
    }

    /**
     * 获取模型最新的验证指标
     */
    @GetMapping("/model/{modelId}/latest")
    @Operation(summary = "获取模型最新的验证指标")
    public Result<ValidationMetrics> getLatestValidationMetrics(
            @PathVariable UUID modelId) {
        ValidationMetrics metrics = modelValidationService.getLatestValidationMetrics(modelId);
        if (metrics == null) {
            return Result.error("该模型暂无验证记录");
        }
        return Result.success(metrics);
    }

    /**
     * 批量验证多个模型
     */
    @PostMapping("/batch")
    @Operation(summary = "批量验证多个模型")
    public Result<Map<UUID, ValidationMetrics>> batchValidate(
            @Valid @RequestBody Map<UUID, ModelValidationService.ValidationData> validationDataMap) {
        Map<UUID, ValidationMetrics> results = modelValidationService.batchValidate(validationDataMap);
        return Result.success(results);
    }

    /**
     * 直接计算验证指标（不保存记录）
     */
    @PostMapping("/calculate")
    @Operation(summary = "直接计算验证指标")
    public Result<ValidationMetrics> calculateMetrics(
            @Valid @RequestBody CalculateMetricsRequest request) {
        ValidationMetrics metrics = modelValidationService.calculateMetricsDirectly(
                request.getObserved(),
                request.getSimulated()
        );
        return Result.success(metrics);
    }

    // ==================== 请求DTO ====================

    /**
     * 创建验证记录请求
     */
    @lombok.Data
    public static class CreateValidationRequest {
        @Parameter(description = "模型ID", required = true)
        private UUID modelId;

        @Parameter(description = "版本ID", required = true)
        private UUID versionId;

        @Parameter(description = "参考数据集ID", required = true)
        private UUID referenceDatasetId;
    }

    /**
     * 执行验证请求
     */
    @lombok.Data
    public static class PerformValidationRequest {
        @Parameter(description = "观测值数组", required = true)
        private List<Double> observed;

        @Parameter(description = "模拟值数组", required = true)
        private List<Double> simulated;
    }

    /**
     * 直接计算指标请求
     */
    @lombok.Data
    public static class CalculateMetricsRequest {
        @Parameter(description = "观测值数组", required = true)
        private List<Double> observed;

        @Parameter(description = "模拟值数组", required = true)
        private List<Double> simulated;
    }
}
