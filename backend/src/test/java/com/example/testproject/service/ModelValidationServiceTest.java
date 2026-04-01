package com.example.testproject.service;

import com.example.testproject.entity.ModelValidation;
import com.example.testproject.mapper.ModelValidationMapper;
import com.example.testproject.validation.MetricsCalculator;
import com.example.testproject.validation.ValidationMetrics;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 模型验证服务测试
 */
@ExtendWith(MockitoExtension.class)
class ModelValidationServiceTest {

    @Mock
    private ModelValidationMapper modelValidationMapper;

    @Mock
    private MetricsCalculator metricsCalculator;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ModelValidationService modelValidationService;

    private UUID modelId;
    private UUID versionId;
    private UUID datasetId;
    private UUID validatorId;
    private UUID validationId;

    @BeforeEach
    void setUp() {
        modelId = UUID.randomUUID();
        versionId = UUID.randomUUID();
        datasetId = UUID.randomUUID();
        validatorId = UUID.randomUUID();
        validationId = UUID.randomUUID();
    }

    @Test
    void testCreateValidation() {
        // Given
        when(modelValidationMapper.insert(any(ModelValidation.class))).thenReturn(1);

        // When
        ModelValidation result = modelValidationService.createValidation(
                modelId, versionId, datasetId, validatorId);

        // Then
        assertNotNull(result);
        assertEquals(modelId, result.getModelId());
        assertEquals(versionId, result.getVersionId());
        assertEquals(datasetId, result.getReferenceDatasetId());
        assertEquals(validatorId, result.getValidatorId());
        assertEquals("pending", result.getStatus());
        assertNotNull(result.getCreatedAt());

        verify(modelValidationMapper, times(1)).insert(any(ModelValidation.class));
    }

    @Test
    void testPerformValidation_Success() throws Exception {
        // Given
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);

        ModelValidation validation = new ModelValidation();
        validation.setId(validationId);
        validation.setModelId(modelId);
        validation.setVersionId(versionId);
        validation.setReferenceDatasetId(datasetId);
        validation.setStatus("pending");

        ValidationMetrics metrics = new ValidationMetrics();
        metrics.setNse(1.0);
        metrics.setRmse(0.0);
        metrics.setMae(0.0);
        metrics.setR2(1.0);
        metrics.setPbias(0.0);

        when(modelValidationMapper.selectById(validationId)).thenReturn(validation);
        when(metricsCalculator.calculateAllMetrics(observed, simulated)).thenReturn(metrics);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(modelValidationMapper.updateById(any(ModelValidation.class))).thenReturn(1);

        // When
        ValidationMetrics result = modelValidationService.performValidation(validationId, observed, simulated);

        // Then
        assertNotNull(result);
        assertEquals(1.0, result.getNse(), 0.0001);
        assertEquals(validationId, result.getValidationId());
        assertEquals(modelId, result.getModelId());
        assertEquals(5, result.getSampleCount());

        verify(modelValidationMapper, times(2)).updateById(any(ModelValidation.class));
    }

    @Test
    void testPerformValidation_ValidationNotFound() {
        // Given
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0);
        List<Double> simulated = Arrays.asList(1.0, 2.0, 3.0);

        when(modelValidationMapper.selectById(validationId)).thenReturn(null);

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            modelValidationService.performValidation(validationId, observed, simulated);
        });

        assertTrue(exception.getMessage().contains("验证记录不存在"));
    }

    @Test
    void testCalculateMetricsDirectly() {
        // Given
        List<Double> observed = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> simulated = Arrays.asList(1.0, 2.0, 3.0, 4.0, 5.0);

        ValidationMetrics expectedMetrics = new ValidationMetrics();
        expectedMetrics.setNse(1.0);
        expectedMetrics.setRmse(0.0);

        when(metricsCalculator.calculateAllMetrics(observed, simulated)).thenReturn(expectedMetrics);

        // When
        ValidationMetrics result = modelValidationService.calculateMetricsDirectly(observed, simulated);

        // Then
        assertNotNull(result);
        assertEquals(1.0, result.getNse(), 0.0001);
        assertEquals(0.0, result.getRmse(), 0.0001);
    }

    @Test
    void testCalculateMetricsDirectly_WithDoubleArray() {
        // Given
        double[] observed = {1.0, 2.0, 3.0, 4.0, 5.0};
        double[] simulated = {1.0, 2.0, 3.0, 4.0, 5.0};

        ValidationMetrics expectedMetrics = new ValidationMetrics();
        expectedMetrics.setNse(1.0);
        expectedMetrics.setRmse(0.0);

        when(metricsCalculator.calculateAllMetrics(any(), any())).thenReturn(expectedMetrics);

        // When
        ValidationMetrics result = modelValidationService.calculateMetricsDirectly(observed, simulated);

        // Then
        assertNotNull(result);
        assertEquals(1.0, result.getNse(), 0.0001);
    }

    @Test
    void testGetValidationMetrics() throws Exception {
        // Given
        ModelValidation validation = new ModelValidation();
        validation.setId(validationId);
        validation.setMetrics("{\"nse\": 0.95}");

        ValidationMetrics metrics = new ValidationMetrics();
        metrics.setNse(0.95);

        when(modelValidationMapper.selectById(validationId)).thenReturn(validation);
        when(objectMapper.readValue("{\"nse\": 0.95}", ValidationMetrics.class)).thenReturn(metrics);

        // When
        ValidationMetrics result = modelValidationService.getValidationMetrics(validationId);

        // Then
        assertNotNull(result);
        assertEquals(0.95, result.getNse(), 0.0001);
    }

    @Test
    void testGetValidationMetrics_NotFound() {
        // Given
        when(modelValidationMapper.selectById(validationId)).thenReturn(null);

        // When
        ValidationMetrics result = modelValidationService.getValidationMetrics(validationId);

        // Then
        assertNull(result);
    }

    @Test
    void testGetModelValidations() {
        // Given
        ModelValidation validation1 = new ModelValidation();
        validation1.setId(UUID.randomUUID());
        validation1.setModelId(modelId);

        ModelValidation validation2 = new ModelValidation();
        validation2.setId(UUID.randomUUID());
        validation2.setModelId(modelId);

        List<ModelValidation> validations = Arrays.asList(validation1, validation2);

        when(modelValidationMapper.selectByModelId(modelId)).thenReturn(validations);

        // When
        List<ModelValidation> result = modelValidationService.getModelValidations(modelId);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    void testGetLatestValidationMetrics() throws Exception {
        // Given
        UUID validationId1 = UUID.randomUUID();
        UUID validationId2 = UUID.randomUUID();

        ModelValidation validation1 = new ModelValidation();
        validation1.setId(validationId1);
        validation1.setModelId(modelId);
        validation1.setStatus("completed");
        validation1.setCompletedAt(LocalDateTime.now().minusDays(1));
        validation1.setMetrics("{\"nse\": 0.85}");

        ModelValidation validation2 = new ModelValidation();
        validation2.setId(validationId2);
        validation2.setModelId(modelId);
        validation2.setStatus("completed");
        validation2.setCompletedAt(LocalDateTime.now());
        validation2.setMetrics("{\"nse\": 0.95}");

        when(modelValidationMapper.selectByModelId(modelId)).thenReturn(Arrays.asList(validation1, validation2));
        when(objectMapper.readValue("{\"nse\": 0.95}", ValidationMetrics.class)).thenAnswer(inv -> {
            ValidationMetrics m = new ValidationMetrics();
            m.setNse(0.95);
            return m;
        });

        // When
        ValidationMetrics result = modelValidationService.getLatestValidationMetrics(modelId);

        // Then
        assertNotNull(result);
        assertEquals(0.95, result.getNse(), 0.0001);
    }

    @Test
    void testGetLatestValidationMetrics_NoCompletedValidations() {
        // Given
        ModelValidation validation = new ModelValidation();
        validation.setId(UUID.randomUUID());
        validation.setModelId(modelId);
        validation.setStatus("pending");

        when(modelValidationMapper.selectByModelId(modelId)).thenReturn(Collections.singletonList(validation));

        // When
        ValidationMetrics result = modelValidationService.getLatestValidationMetrics(modelId);

        // Then
        assertNull(result);
    }

    @Test
    void testValidationData() {
        // Test ValidationData inner class
        ModelValidationService.ValidationData data = new ModelValidationService.ValidationData();
        data.setVersionId(versionId);
        data.setReferenceDatasetId(datasetId);
        data.setValidatorId(validatorId);
        data.setObserved(Arrays.asList(1.0, 2.0, 3.0));
        data.setSimulated(Arrays.asList(1.0, 2.0, 3.0));

        assertEquals(versionId, data.getVersionId());
        assertEquals(datasetId, data.getReferenceDatasetId());
        assertEquals(validatorId, data.getValidatorId());
        assertEquals(3, data.getObserved().size());
        assertEquals(3, data.getSimulated().size());
    }
}
