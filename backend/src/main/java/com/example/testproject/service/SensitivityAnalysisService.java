package com.example.testproject.service;

import com.example.testproject.dto.analysis.SensitivityAnalysisRequest;
import com.example.testproject.dto.analysis.SensitivityAnalysisResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * 敏感性分析服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SensitivityAnalysisService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ExecutorService executorService = Executors.newFixedThreadPool(4);

    private static final String ANALYSIS_KEY_PREFIX = "sensitivity:analysis:";

    /**
     * 运行敏感性分析
     */
    public SensitivityAnalysisResponse runAnalysis(SensitivityAnalysisRequest request, UUID userId) {
        String analysisId = UUID.randomUUID().toString();

        SensitivityAnalysisResponse response = new SensitivityAnalysisResponse();
        response.setAnalysisId(analysisId);
        response.setModelId(request.getModelId());
        response.setOutputVariable(request.getOutputVariable());
        response.setSampleSize(request.getSampleSize());
        response.setStatus("PENDING");
        response.setCreatedAt(java.time.LocalDateTime.now());

        // 保存到Redis
        saveAnalysis(response);

        // 异步执行分析
        executorService.submit(() -> executeAnalysis(analysisId, request));

        return response;
    }

    /**
     * 执行分析（异步）
     */
    private void executeAnalysis(String analysisId, SensitivityAnalysisRequest request) {
        try {
            updateStatus(analysisId, "RUNNING");

            // 1. 生成样本 (拉丁超立方采样)
            List<Map<String, Object>> samples = generateLHSamples(
                    request.getParameters(),
                    request.getSampleSize()
            );

            // 2. 运行模型获取输出 (这里简化处理，实际应调用模型服务)
            List<Double> outputs = runModelSimulations(request.getModelId(), samples, request.getOutputVariable());

            // 3. 添加输出到样本
            for (int i = 0; i < samples.size(); i++) {
                samples.get(i).put(request.getOutputVariable(), outputs.get(i));
            }

            // 4. 计算敏感性指标
            List<SensitivityAnalysisResponse.SensitivityMetric> metrics = calculateMetrics(
                    samples,
                    request.getParameters(),
                    request.getOutputVariable()
            );

            // 5. 生成散点图数据
            Map<String, List<SensitivityAnalysisResponse.ScatterPoint>> scatterData = generateScatterData(
                    samples,
                    request.getParameters(),
                    request.getOutputVariable()
            );

            // 6. 更新结果
            SensitivityAnalysisResponse response = getResult(analysisId, null);
            response.setStatus("COMPLETED");
            response.setMetrics(metrics);
            response.setScatterData(scatterData);
            response.setSamples(samples);
            response.setCompletedAt(java.time.LocalDateTime.now());
            saveAnalysis(response);

            log.info("敏感性分析完成: {}", analysisId);

        } catch (Exception e) {
            log.error("敏感性分析失败: {}", analysisId, e);
            updateStatus(analysisId, "FAILED");
            updateError(analysisId, e.getMessage());
        }
    }

    /**
     * 拉丁超立方采样
     */
    private List<Map<String, Object>> generateLHSamples(
            List<SensitivityAnalysisRequest.ParameterConfig> parameters,
            int sampleSize) {

        List<Map<String, Object>> samples = new ArrayList<>();
        Random random = new Random();

        // 为每个参数生成分层样本
        Map<String, List<Double>> stratifiedSamples = new HashMap<>();

        for (SensitivityAnalysisRequest.ParameterConfig param : parameters) {
            List<Double> values = new ArrayList<>();
            double binSize = (param.getMax() - param.getMin()) / sampleSize;

            for (int i = 0; i < sampleSize; i++) {
                double binStart = param.getMin() + i * binSize;
                double binEnd = binStart + binSize;
                double value = binStart + random.nextDouble() * (binEnd - binStart);
                values.add(value);
            }

            // 随机打乱
            Collections.shuffle(values, random);
            stratifiedSamples.put(param.getName(), values);
        }

        // 组合成样本
        for (int i = 0; i < sampleSize; i++) {
            Map<String, Object> sample = new HashMap<>();
            for (SensitivityAnalysisRequest.ParameterConfig param : parameters) {
                sample.put(param.getName(), stratifiedSamples.get(param.getName()).get(i));
            }
            samples.add(sample);
        }

        return samples;
    }

    /**
     * 运行模型模拟（简化版）
     */
    private List<Double> runModelSimulations(Long modelId, List<Map<String, Object>> samples, String outputVariable) {
        // 实际应调用模型执行服务
        // 这里使用简化的线性模型作为示例
        Random random = new Random();
        return samples.stream()
                .map(sample -> {
                    // 简化的线性响应: y = 2*x1 + 3*x2 + noise
                    double result = 0;
                    int i = 1;
                    for (Object value : sample.values()) {
                        result += i * ((Number) value).doubleValue();
                        i++;
                    }
                    // 添加随机噪声
                    result += random.nextGaussian() * 0.1 * result;
                    return result;
                })
                .collect(Collectors.toList());
    }

    /**
     * 计算敏感性指标
     */
    private List<SensitivityAnalysisResponse.SensitivityMetric> calculateMetrics(
            List<Map<String, Object>> samples,
            List<SensitivityAnalysisRequest.ParameterConfig> parameters,
            String outputVariable) {

        List<SensitivityAnalysisResponse.SensitivityMetric> metrics = new ArrayList<>();

        // 提取输出值
        double[] outputs = samples.stream()
                .mapToDouble(s -> ((Number) s.get(outputVariable)).doubleValue())
                .toArray();

        double outputMean = Arrays.stream(outputs).average().orElse(0);
        double outputStd = Math.sqrt(Arrays.stream(outputs)
                .map(v -> Math.pow(v - outputMean, 2))
                .average().orElse(0));

        for (SensitivityAnalysisRequest.ParameterConfig param : parameters) {
            String paramName = param.getName();

            // 提取参数值
            double[] paramValues = samples.stream()
                    .mapToDouble(s -> ((Number) s.get(paramName)).doubleValue())
                    .toArray();

            double paramMean = Arrays.stream(paramValues).average().orElse(0);
            double paramStd = Math.sqrt(Arrays.stream(paramValues)
                    .map(v -> Math.pow(v - paramMean, 2))
                    .average().orElse(0));

            // 计算Pearson相关系数
            double correlation = calculatePearsonCorrelation(paramValues, outputs);

            // 计算标准化回归系数 (SRC)
            double src = correlation * outputStd / (paramStd + 1e-10);

            SensitivityAnalysisResponse.SensitivityMetric metric =
                    new SensitivityAnalysisResponse.SensitivityMetric();
            metric.setParameter(paramName);
            metric.setCorrelation(Math.abs(correlation));
            metric.setSrc(Math.abs(src));
            metric.setSobolFirstOrder(0); // 需要更复杂的计算
            metric.setSobolTotal(0);

            metrics.add(metric);
        }

        // 排序并设置排名
        metrics.sort((a, b) -> Double.compare(b.getSrc(), a.getSrc()));
        for (int i = 0; i < metrics.size(); i++) {
            metrics.get(i).setRank(i + 1);
        }

        return metrics;
    }

    /**
     * 计算Pearson相关系数
     */
    private double calculatePearsonCorrelation(double[] x, double[] y) {
        int n = x.length;
        double sumX = Arrays.stream(x).sum();
        double sumY = Arrays.stream(y).sum();
        double sumXY = IntStream.range(0, n)
                .mapToDouble(i -> x[i] * y[i])
                .sum();
        double sumX2 = Arrays.stream(x).map(v -> v * v).sum();
        double sumY2 = Arrays.stream(y).map(v -> v * v).sum();

        double numerator = n * sumXY - sumX * sumY;
        double denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator == 0 ? 0 : numerator / denominator;
    }

    /**
     * 生成散点图数据
     */
    private Map<String, List<SensitivityAnalysisResponse.ScatterPoint>> generateScatterData(
            List<Map<String, Object>> samples,
            List<SensitivityAnalysisRequest.ParameterConfig> parameters,
            String outputVariable) {

        Map<String, List<SensitivityAnalysisResponse.ScatterPoint>> scatterData = new HashMap<>();

        for (SensitivityAnalysisRequest.ParameterConfig param : parameters) {
            String paramName = param.getName();
            List<SensitivityAnalysisResponse.ScatterPoint> points = new ArrayList<>();

            for (Map<String, Object> sample : samples) {
                SensitivityAnalysisResponse.ScatterPoint point =
                        new SensitivityAnalysisResponse.ScatterPoint();
                point.setX(((Number) sample.get(paramName)).doubleValue());
                point.setY(((Number) sample.get(outputVariable)).doubleValue());
                points.add(point);
            }

            scatterData.put(paramName, points);
        }

        return scatterData;
    }

    /**
     * 获取分析结果
     */
    public SensitivityAnalysisResponse getResult(String analysisId, UUID userId) {
        String key = ANALYSIS_KEY_PREFIX + analysisId;
        Object result = redisTemplate.opsForValue().get(key);

        if (result == null) {
            throw new RuntimeException("分析结果不存在: " + analysisId);
        }

        return (SensitivityAnalysisResponse) result;
    }

    /**
     * 获取模型的分析历史
     */
    public List<SensitivityAnalysisResponse> getModelHistory(Long modelId, UUID userId, int page, int pageSize) {
        // 实际应从数据库查询
        return new ArrayList<>();
    }

    /**
     * 删除分析结果
     */
    public void deleteAnalysis(String analysisId, UUID userId) {
        String key = ANALYSIS_KEY_PREFIX + analysisId;
        redisTemplate.delete(key);
    }

    // 辅助方法
    private void saveAnalysis(SensitivityAnalysisResponse response) {
        String key = ANALYSIS_KEY_PREFIX + response.getAnalysisId();
        redisTemplate.opsForValue().set(key, response);
    }

    private void updateStatus(String analysisId, String status) {
        SensitivityAnalysisResponse response = getResult(analysisId, null);
        response.setStatus(status);
        saveAnalysis(response);
    }

    private void updateError(String analysisId, String error) {
        SensitivityAnalysisResponse response = getResult(analysisId, null);
        response.setErrorMessage(error);
        saveAnalysis(response);
    }
}
