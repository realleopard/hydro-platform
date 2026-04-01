package com.example.testproject.validation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 验证指标计算器测试
 */
class MetricsCalculatorTest {

    private MetricsCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new MetricsCalculator();
    }

    @Test
    void testCalculateNSE_PerfectFit() {
        // 完美拟合的情况
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);

        double nse = calculator.calculateNSE(observed, simulated);

        assertEquals(1.0, nse, 0.0001, "完美拟合时 NSE 应为 1");
    }

    @Test
    void testCalculateNSE_WithDeviation() {
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.1, 2.1, 2.9, 4.0, 5.1);

        double nse = calculator.calculateNSE(observed, simulated);

        assertTrue(nse < 1.0, "有偏差时 NSE 应小于 1");
        assertTrue(nse > 0.0, "拟合较好时 NSE 应大于 0");
    }

    @Test
    void testCalculateRMSE_PerfectFit() {
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);

        double rmse = calculator.calculateRMSE(observed, simulated);

        assertEquals(0.0, rmse, 0.0001, "完美拟合时 RMSE 应为 0");
    }

    @Test
    void testCalculateRMSE_WithError() {
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.5, 2.5, 3.5, 4.5, 5.5);

        double rmse = calculator.calculateRMSE(observed, simulated);

        assertTrue(rmse > 0, "有误差时 RMSE 应大于 0");
    }

    @Test
    void testCalculateMAE() {
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.5, 2.0, 3.5, 4.0, 5.5);

        double mae = calculator.calculateMAE(observed, simulated);

        assertEquals(0.3, mae, 0.0001);
    }

    @Test
    void testCalculateR2_PerfectFit() {
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);

        double r2 = calculator.calculateR2(observed, simulated);

        assertEquals(1.0, r2, 0.0001, "完美拟合时 R² 应为 1");
    }

    @Test
    void testCalculatePBIAS() {
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.1, 2.1, 3.1, 4.1, 5.1);

        double pbias = calculator.calculatePBIAS(observed, simulated);

        assertTrue(pbias > 0, "模拟值偏高时 PBIAS 应为正值");
    }

    @Test
    void testCalculateKGE() {
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);

        double kge = calculator.calculateKGE(observed, simulated);

        assertTrue(kge > 0.9, "完美拟合时 KGE 应接近 1");
    }

    @Test
    void testCalculateAllMetrics() {
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);

        ValidationMetrics metrics = calculator.calculateAllMetrics(observed, simulated);

        assertNotNull(metrics);
        assertEquals(1.0, metrics.getNse(), 0.0001);
        assertEquals(0.0, metrics.getRmse(), 0.0001);
        assertEquals(1.0, metrics.getR2(), 0.0001);
        assertEquals(0.0, metrics.getPbias(), 0.0001);
        assertEquals(MetricsCalculator.ValidationGrade.EXCELLENT, metrics.getNseGrade());
    }

    @Test
    void testGetNSEGrade() {
        assertEquals(MetricsCalculator.ValidationGrade.EXCELLENT, calculator.getNSEGrade(0.95));
        assertEquals(MetricsCalculator.ValidationGrade.GOOD, calculator.getNSEGrade(0.8));
        assertEquals(MetricsCalculator.ValidationGrade.FAIR, calculator.getNSEGrade(0.6));
        assertEquals(MetricsCalculator.ValidationGrade.POOR, calculator.getNSEGrade(0.3));
        assertEquals(MetricsCalculator.ValidationGrade.UNSATISFACTORY, calculator.getNSEGrade(-0.5));
    }

    @Test
    void testInvalidInput() {
        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculateNSE(null, Arrays.asList(1.0, 2.0)));

        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculateNSE(Arrays.asList(1.0), Arrays.asList(1.0, 2.0)));

        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculateNSE(Arrays.asList(), Arrays.asList()));
    }
}
