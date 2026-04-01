package com.example.testproject.dto.analysis;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 敏感性分析请求DTO
 */
@Data
public class SensitivityAnalysisRequest {

    @NotNull(message = "模型ID不能为空")
    private Long modelId;

    @NotEmpty(message = "参数列表不能为空")
    @Valid
    private List<ParameterConfig> parameters;

    @NotBlank(message = "输出变量不能为空")
    private String outputVariable;

    @Min(value = 10, message = "样本数量至少为10")
    private int sampleSize = 100;

    private String method = "lhs"; // latin hypercube sampling

    private Map<String, Object> additionalConfig;

    @Data
    public static class ParameterConfig {
        @NotBlank(message = "参数名不能为空")
        private String name;

        private double min;
        private double max;
        private String distribution = "uniform"; // uniform, normal, lognormal
        private double baseline;
    }
}
