package com.example.testproject.validation;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 模型验证指标
 */
@Data
public class ValidationMetrics {

    /** 验证记录ID */
    private UUID validationId;

    /** 模型ID */
    private UUID modelId;

    /** 版本ID */
    private UUID versionId;

    /** 参考数据集ID */
    private UUID referenceDatasetId;

    // 核心指标

    /** Nash-Sutcliffe Efficiency */
    private Double nse;

    /** Root Mean Square Error */
    private Double rmse;

    /** Normalized RMSE */
    private Double nrmse;

    /** Mean Absolute Error */
    private Double mae;

    /** Coefficient of Determination */
    private Double r2;

    /** Percent Bias */
    private Double pbias;

    /** Kling-Gupta Efficiency */
    private Double kge;

    // 指标等级

    private MetricsCalculator.ValidationGrade nseGrade;

    private MetricsCalculator.ValidationGrade rmseGrade;

    // 元数据

    /** 样本数量 */
    private Integer sampleCount;

    /** 验证时间范围开始 */
    private LocalDateTime validationPeriodStart;

    /** 验证时间范围结束 */
    private LocalDateTime validationPeriodEnd;

    /** 验证时间 */
    private LocalDateTime validatedAt;

    /**
     * 获取综合评级
     */
    public MetricsCalculator.ValidationGrade getOverallGrade() {
        if (nseGrade == null) {
            return MetricsCalculator.ValidationGrade.UNSATISFACTORY;
        }

        // 以 NSE 等级为主要参考
        switch (nseGrade) {
            case EXCELLENT:
            case GOOD:
                return nseGrade;
            case FAIR:
                // 检查 RMSE 等级
                if (rmseGrade == MetricsCalculator.ValidationGrade.EXCELLENT ||
                        rmseGrade == MetricsCalculator.ValidationGrade.GOOD) {
                    return MetricsCalculator.ValidationGrade.FAIR;
                }
                return MetricsCalculator.ValidationGrade.POOR;
            case POOR:
            case UNSATISFACTORY:
            default:
                return nseGrade;
        }
    }

    /**
     * 检查指标是否有效
     */
    public boolean isValid() {
        return nse != null && !Double.isNaN(nse) &&
                rmse != null && !Double.isNaN(rmse);
    }

    /**
     * 生成验证报告摘要
     */
    public String generateSummary() {
        StringBuilder sb = new StringBuilder();
        sb.append("模型验证报告\n");
        sb.append("============\n");
        sb.append(String.format("NSE: %.4f (%s)\n", nse, nseGrade != null ? nseGrade.getLabel() : "未知"));
        sb.append(String.format("RMSE: %.4f\n", rmse));
        sb.append(String.format("NRMSE: %.4f (%s)\n", nrmse, rmseGrade != null ? rmseGrade.getLabel() : "未知"));
        sb.append(String.format("MAE: %.4f\n", mae));
        sb.append(String.format("R²: %.4f\n", r2));
        sb.append(String.format("PBIAS: %.2f%%\n", pbias));
        sb.append(String.format("KGE: %.4f\n", kge));
        sb.append(String.format("样本数: %d\n", sampleCount));
        sb.append(String.format("综合评级: %s\n", getOverallGrade().getLabel()));

        return sb.toString();
    }
}
