package com.example.testproject.dto.analysis;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 敏感性分析响应DTO
 */
@Data
public class SensitivityAnalysisResponse {

    private String analysisId;
    private Long modelId;
    private String modelName;
    private String status; // PENDING, RUNNING, COMPLETED, FAILED
    private String outputVariable;
    private int sampleSize;

    // 敏感性指标
    private List<SensitivityMetric> metrics;

    // 散点图数据
    private Map<String, List<ScatterPoint>> scatterData;

    // 采样数据
    private List<Map<String, Object>> samples;

    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private String errorMessage;

    @Data
    public static class SensitivityMetric {
        private String parameter;
        private double correlation;
        private double src; // Standardized Regression Coefficient
        private double sobolFirstOrder;
        private double sobolTotal;
        private int rank;
    }

    @Data
    public static class ScatterPoint {
        private double x; // 参数值
        private double y; // 输出值
    }
}
