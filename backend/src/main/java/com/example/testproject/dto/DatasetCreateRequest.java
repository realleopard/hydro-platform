package com.example.testproject.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 数据集上传请求 DTO
 */
@Data
public class DatasetCreateRequest {

    @NotBlank(message = "数据集名称不能为空")
    private String name;

    private String description;

    @NotBlank(message = "数据类型不能为空")
    private String dataType;

    private String visibility = "private";

    private String spatialBounds;

    private String temporalStart;

    private String temporalEnd;

    private String metadata;
}
