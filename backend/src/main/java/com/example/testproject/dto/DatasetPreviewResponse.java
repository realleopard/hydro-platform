package com.example.testproject.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 数据集预览响应 DTO
 */
@Data
public class DatasetPreviewResponse {
    private List<String> headers;
    private List<Map<String, Object>> rows;
    private int totalRows;
    private int previewRows;
}
