package com.example.testproject.service;

import com.example.testproject.entity.ModelValidation;
import com.example.testproject.mapper.ModelValidationMapper;
import com.example.testproject.validation.MetricsCalculator;
import com.example.testproject.validation.ValidationMetrics;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 模型验证服务
 */
@Slf4j
@Service
public class ModelValidationService {

    private final ModelValidationMapper modelValidationMapper;
    private final MetricsCalculator metricsCalculator;
    private final ObjectMapper objectMapper;

    public ModelValidationService(ModelValidationMapper modelValidationMapper,
                                   MetricsCalculator metricsCalculator,
                                   ObjectMapper objectMapper) {
        this.modelValidationMapper = modelValidationMapper;
        this.metricsCalculator = metricsCalculator;
        this.objectMapper = objectMapper;
    }

    /**
     * 创建验证记录
     */
    @Transactional
    public ModelValidation createValidation(UUID modelId, UUID versionId,
                                            UUID referenceDatasetId, UUID validatorId) {
        ModelValidation validation = new ModelValidation();
        validation.setId(UUID.randomUUID());
        validation.setModelId(modelId);
        validation.setVersionId(versionId);
        validation.setReferenceDatasetId(referenceDatasetId);
        validation.setValidatorId(validatorId);
        validation.setStatus("pending");
        validation.setCreatedAt(LocalDateTime.now());

        modelValidationMapper.insert(validation);

        log.info("创建模型验证记录: validationId={}, modelId={}", validation.getId(), modelId);
        return validation;
    }

    /**
     * 执行验证计算
     */
    @Transactional
    public ValidationMetrics performValidation(UUID validationId,
                                                List<Double> observed,
                                                List<Double> simulated) {
        ModelValidation validation = modelValidationMapper.selectById(validationId);
        if (validation == null) {
            throw new IllegalArgumentException("验证记录不存在: " + validationId);
        }

        log.info("开始模型验证: validationId={}, samples={}", validationId, observed.size());

        // 更新状态为运行中
        validation.setStatus("running");
        modelValidationMapper.updateById(validation);

        try {
            // 计算指标
            ValidationMetrics metrics = metricsCalculator.calculateAllMetrics(observed, simulated);
            metrics.setValidationId(validationId);
            metrics.setModelId(validation.getModelId());
            metrics.setVersionId(validation.getVersionId());
            metrics.setReferenceDatasetId(validation.getReferenceDatasetId());
            metrics.setSampleCount(observed.size());
            metrics.setValidatedAt(LocalDateTime.now());

            // 保存指标到 JSON
            String metricsJson = objectMapper.writeValueAsString(metrics);
            validation.setMetrics(metricsJson);
            validation.setStatus("completed");
            validation.setCompletedAt(LocalDateTime.now());

            modelValidationMapper.updateById(validation);

            log.info("模型验证完成: validationId={}, NSE={}", validationId, metrics.getNse());

            return metrics;

        } catch (Exception e) {
            log.error("模型验证失败: validationId={}, error={}", validationId, e.getMessage(), e);
            validation.setStatus("failed");
            modelValidationMapper.updateById(validation);
            throw new RuntimeException("验证计算失败", e);
        }
    }

    /**
     * 获取验证记录的指标
     */
    public ValidationMetrics getValidationMetrics(UUID validationId) {
        ModelValidation validation = modelValidationMapper.selectById(validationId);
        if (validation == null || validation.getMetrics() == null) {
            return null;
        }

        try {
            return objectMapper.readValue(validation.getMetrics(), ValidationMetrics.class);
        } catch (Exception e) {
            log.error("解析验证指标失败: validationId={}, error={}", validationId, e.getMessage());
            return null;
        }
    }

    /**
     * 获取模型的所有验证记录
     */
    public List<ModelValidation> getModelValidations(UUID modelId) {
        return modelValidationMapper.selectByModelId(modelId);
    }

    /**
     * 获取模型最新的验证指标
     */
    public ValidationMetrics getLatestValidationMetrics(UUID modelId) {
        List<ModelValidation> validations = modelValidationMapper.selectByModelId(modelId);

        return validations.stream()
                .filter(v -> "completed".equals(v.getStatus()))
                .max((v1, v2) -> v1.getCompletedAt().compareTo(v2.getCompletedAt()))
                .map(v -> {
                    try {
                        return objectMapper.readValue(v.getMetrics(), ValidationMetrics.class);
                    } catch (Exception e) {
                        log.error("解析验证指标失败: validationId={}, error={}", v.getId(), e.getMessage());
                        return null;
                    }
                })
                .orElse(null);
    }

    /**
     * 直接计算验证指标（不保存记录）
     */
    public ValidationMetrics calculateMetricsDirectly(List<Double> observed, List<Double> simulated) {
        return metricsCalculator.calculateAllMetrics(observed, simulated);
    }

    /**
     * 直接计算验证指标（不保存记录）- double[] 版本
     */
    public ValidationMetrics calculateMetricsDirectly(double[] observed, double[] simulated) {
        List<Double> observedList = java.util.Arrays.stream(observed).boxed().toList();
        List<Double> simulatedList = java.util.Arrays.stream(simulated).boxed().toList();
        return metricsCalculator.calculateAllMetrics(observedList, simulatedList);
    }
    public Map<UUID, ValidationMetrics> batchValidate(Map<UUID, ValidationData> validationDataMap) {
        Map<UUID, ValidationMetrics> results = new java.util.HashMap<>();

        for (Map.Entry<UUID, ValidationData> entry : validationDataMap.entrySet()) {
            UUID modelId = entry.getKey();
            ValidationData data = entry.getValue();

            try {
                ModelValidation validation = createValidation(
                        modelId, data.getVersionId(),
                        data.getReferenceDatasetId(), data.getValidatorId());

                ValidationMetrics metrics = performValidation(
                        validation.getId(), data.getObserved(), data.getSimulated());

                results.put(modelId, metrics);

            } catch (Exception e) {
                log.error("批量验证失败: modelId={}, error={}", modelId, e.getMessage());
            }
        }

        return results;
    }

    /**
     * 验证数据
     */
    @lombok.Data
    public static class ValidationData {
        private UUID versionId;
        private UUID referenceDatasetId;
        private UUID validatorId;
        private List<Double> observed;
        private List<Double> simulated;
    }
}
