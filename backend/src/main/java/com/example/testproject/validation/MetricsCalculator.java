package com.example.testproject.validation;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 模型验证指标计算器
 * 实现 NSE、RMSE、MAE、R² 等常用水文模型验证指标
 */
@Slf4j
@Component
public class MetricsCalculator {

    /**
     * 计算 Nash-Sutcliffe Efficiency (NSE)
     * NSE = 1 - Σ(observed - simulated)² / Σ(observed - mean(observed))²
     *
     * @param observed 观测值数组
     * @param simulated 模拟值数组
     * @return NSE 值，范围 (-∞, 1]，1 表示完美拟合
     */
    public double calculateNSE(List<Double> observed, List<Double> simulated) {
        validateInput(observed, simulated);

        double meanObserved = calculateMean(observed);
        double sumSquaredError = 0.0;
        double sumSquaredDeviation = 0.0;

        for (int i = 0; i < observed.size(); i++) {
            double obs = observed.get(i);
            double sim = simulated.get(i);

            sumSquaredError += Math.pow(obs - sim, 2);
            sumSquaredDeviation += Math.pow(obs - meanObserved, 2);
        }

        if (sumSquaredDeviation == 0) {
            log.warn("观测值方差为0，无法计算NSE");
            return Double.NaN;
        }

        double nse = 1 - (sumSquaredError / sumSquaredDeviation);
        log.debug("NSE计算: value={}, samples={}", nse, observed.size());
        return nse;
    }

    /**
     * 计算 Root Mean Square Error (RMSE)
     * RMSE = √(Σ(observed - simulated)² / n)
     *
     * @param observed 观测值数组
     * @param simulated 模拟值数组
     * @return RMSE 值，单位与观测值相同，越小越好
     */
    public double calculateRMSE(List<Double> observed, List<Double> simulated) {
        validateInput(observed, simulated);

        double sumSquaredError = 0.0;
        int validCount = 0;

        for (int i = 0; i < observed.size(); i++) {
            Double obs = observed.get(i);
            Double sim = simulated.get(i);

            if (obs != null && sim != null && !Double.isNaN(obs) && !Double.isNaN(sim)) {
                sumSquaredError += Math.pow(obs - sim, 2);
                validCount++;
            }
        }

        if (validCount == 0) {
            return Double.NaN;
        }

        double rmse = Math.sqrt(sumSquaredError / validCount);
        log.debug("RMSE计算: value={}, samples={}", rmse, validCount);
        return rmse;
    }

    /**
     * 计算 Normalized RMSE (NRMSE)
     * NRMSE = RMSE / (max(observed) - min(observed))
     *
     * @param observed 观测值数组
     * @param simulated 模拟值数组
     * @return NRMSE 值，范围 [0, ∞)，越小越好
     */
    public double calculateNRMSE(List<Double> observed, List<Double> simulated) {
        double rmse = calculateRMSE(observed, simulated);

        if (Double.isNaN(rmse)) {
            return Double.NaN;
        }

        double minObs = observed.stream()
                .filter(o -> o != null && !Double.isNaN(o))
                .min(Double::compare)
                .orElse(Double.NaN);

        double maxObs = observed.stream()
                .filter(o -> o != null && !Double.isNaN(o))
                .max(Double::compare)
                .orElse(Double.NaN);

        if (Double.isNaN(minObs) || Double.isNaN(maxObs) || maxObs == minObs) {
            return Double.NaN;
        }

        return rmse / (maxObs - minObs);
    }

    /**
     * 计算 Mean Absolute Error (MAE)
     * MAE = Σ|observed - simulated| / n
     *
     * @param observed 观测值数组
     * @param simulated 模拟值数组
     * @return MAE 值，单位与观测值相同，越小越好
     */
    public double calculateMAE(List<Double> observed, List<Double> simulated) {
        validateInput(observed, simulated);

        double sumAbsoluteError = 0.0;
        int validCount = 0;

        for (int i = 0; i < observed.size(); i++) {
            Double obs = observed.get(i);
            Double sim = simulated.get(i);

            if (obs != null && sim != null && !Double.isNaN(obs) && !Double.isNaN(sim)) {
                sumAbsoluteError += Math.abs(obs - sim);
                validCount++;
            }
        }

        if (validCount == 0) {
            return Double.NaN;
        }

        double mae = sumAbsoluteError / validCount;
        log.debug("MAE计算: value={}, samples={}", mae, validCount);
        return mae;
    }

    /**
     * 计算 Coefficient of Determination (R²)
     * R² = [Σ((observed - mean(observed)) * (simulated - mean(simulated)))]² /
     *      [Σ(observed - mean(observed))² * Σ(simulated - mean(simulated))²]
     *
     * @param observed 观测值数组
     * @param simulated 模拟值数组
     * @return R² 值，范围 [0, 1]，越接近1越好
     */
    public double calculateR2(List<Double> observed, List<Double> simulated) {
        validateInput(observed, simulated);

        double meanObserved = calculateMean(observed);
        double meanSimulated = calculateMean(simulated);

        double sumCrossProduct = 0.0;
        double sumObservedSquared = 0.0;
        double sumSimulatedSquared = 0.0;

        for (int i = 0; i < observed.size(); i++) {
            double obs = observed.get(i);
            double sim = simulated.get(i);

            double obsDev = obs - meanObserved;
            double simDev = sim - meanSimulated;

            sumCrossProduct += obsDev * simDev;
            sumObservedSquared += obsDev * obsDev;
            sumSimulatedSquared += simDev * simDev;
        }

        double denominator = Math.sqrt(sumObservedSquared * sumSimulatedSquared);
        if (denominator == 0) {
            log.warn("分母为0，无法计算R²");
            return Double.NaN;
        }

        double r = sumCrossProduct / denominator;
        return r * r;
    }

    /**
     * 计算 Relative Bias (PBIAS)
     * PBIAS = Σ(simulated - observed) / Σ(observed) * 100%
     *
     * @param observed 观测值数组
     * @param simulated 模拟值数组
     * @return PBIAS 百分比，正值表示模拟值偏高，负值表示偏低
     */
    public double calculatePBIAS(List<Double> observed, List<Double> simulated) {
        validateInput(observed, simulated);

        double sumSimulated = 0.0;
        double sumObserved = 0.0;

        for (int i = 0; i < observed.size(); i++) {
            sumSimulated += simulated.get(i);
            sumObserved += observed.get(i);
        }

        if (sumObserved == 0) {
            log.warn("观测值总和为0，无法计算PBIAS");
            return Double.NaN;
        }

        return ((sumSimulated - sumObserved) / sumObserved) * 100.0;
    }

    /**
     * 计算 Kling-Gupta Efficiency (KGE)
     * KGE = 1 - √[(r-1)² + (α-1)² + (β-1)²]
     * 其中 r 是相关系数，α 是变异系数比，β 是均值比
     *
     * @param observed 观测值数组
     * @param simulated 模拟值数组
     * @return KGE 值，范围 (-∞, 1]，越接近1越好
     */
    public double calculateKGE(List<Double> observed, List<Double> simulated) {
        validateInput(observed, simulated);

        double meanObserved = calculateMean(observed);
        double meanSimulated = calculateMean(simulated);

        double stdObserved = calculateStd(observed);
        double stdSimulated = calculateStd(simulated);

        // 计算相关系数 r
        double r = calculateCorrelation(observed, simulated);

        // 变异系数比 α
        double alpha = stdSimulated / stdObserved;

        // 均值比 β
        double beta = meanSimulated / meanObserved;

        double kge = 1 - Math.sqrt(Math.pow(r - 1, 2) + Math.pow(alpha - 1, 2) + Math.pow(beta - 1, 2));

        log.debug("KGE计算: value={}, r={}, alpha={}, beta={}", kge, r, alpha, beta);
        return kge;
    }

    /**
     * 计算验证指标等级
     */
    public ValidationGrade getNSEGrade(double nse) {
        if (nse > 0.9) return ValidationGrade.EXCELLENT;
        if (nse > 0.75) return ValidationGrade.GOOD;
        if (nse > 0.5) return ValidationGrade.FAIR;
        if (nse > 0.0) return ValidationGrade.POOR;
        return ValidationGrade.UNSATISFACTORY;
    }

    public ValidationGrade getRMSEGrade(double nrmse) {
        if (nrmse < 0.1) return ValidationGrade.EXCELLENT;
        if (nrmse < 0.2) return ValidationGrade.GOOD;
        if (nrmse < 0.3) return ValidationGrade.FAIR;
        if (nrmse < 0.5) return ValidationGrade.POOR;
        return ValidationGrade.UNSATISFACTORY;
    }

    /**
     * 批量计算所有指标
     */
    public ValidationMetrics calculateAllMetrics(List<Double> observed, List<Double> simulated) {
        ValidationMetrics metrics = new ValidationMetrics();
        metrics.setNse(calculateNSE(observed, simulated));
        metrics.setRmse(calculateRMSE(observed, simulated));
        metrics.setNrmse(calculateNRMSE(observed, simulated));
        metrics.setMae(calculateMAE(observed, simulated));
        metrics.setR2(calculateR2(observed, simulated));
        metrics.setPbias(calculatePBIAS(observed, simulated));
        metrics.setKge(calculateKGE(observed, simulated));

        // 计算等级
        metrics.setNseGrade(getNSEGrade(metrics.getNse()));
        metrics.setRmseGrade(getRMSEGrade(metrics.getNrmse()));

        return metrics;
    }

    /**
     * 验证等级枚举
     */
    public enum ValidationGrade {
        EXCELLENT("优秀", "模型表现非常出色"),
        GOOD("良好", "模型表现良好，可用于实际应用"),
        FAIR("一般", "模型表现尚可，需要进一步优化"),
        POOR("较差", "模型表现不佳，需要重新校准"),
        UNSATISFACTORY("不合格", "模型不可用，需要重新开发");

        private final String label;
        private final String description;

        ValidationGrade(String label, String description) {
            this.label = label;
            this.description = description;
        }

        public String getLabel() {
            return label;
        }

        public String getDescription() {
            return description;
        }
    }

    // 辅助方法

    private void validateInput(List<Double> observed, List<Double> simulated) {
        if (observed == null || simulated == null) {
            throw new IllegalArgumentException("观测值和模拟值不能为空");
        }
        if (observed.size() != simulated.size()) {
            throw new IllegalArgumentException("观测值和模拟值数组长度必须相同");
        }
        if (observed.isEmpty()) {
            throw new IllegalArgumentException("数据不能为空");
        }
    }

    private double calculateMean(List<Double> values) {
        return values.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    private double calculateStd(List<Double> values) {
        double mean = calculateMean(values);
        double variance = values.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2))
                .average()
                .orElse(0.0);
        return Math.sqrt(variance);
    }

    private double calculateCorrelation(List<Double> x, List<Double> y) {
        double meanX = calculateMean(x);
        double meanY = calculateMean(y);

        double sumXY = 0.0;
        double sumX2 = 0.0;
        double sumY2 = 0.0;

        for (int i = 0; i < x.size(); i++) {
            double diffX = x.get(i) - meanX;
            double diffY = y.get(i) - meanY;
            sumXY += diffX * diffY;
            sumX2 += diffX * diffX;
            sumY2 += diffY * diffY;
        }

        double denominator = Math.sqrt(sumX2 * sumY2);
        if (denominator == 0) {
            return 0;
        }

        return sumXY / denominator;
    }
}
