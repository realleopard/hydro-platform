package com.example.testproject.controller;

import com.example.testproject.common.Result;
import com.example.testproject.service.DataTransformationService;
import com.example.testproject.service.DataTransformationService.DataFormat;
import com.example.testproject.service.DataTransformationService.ValidationRule;
import com.example.testproject.entity.User;
import com.example.testproject.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * 数据转换控制器
 */
@RestController
@RequestMapping("/api/v1/data")
@RequiredArgsConstructor
@Tag(name = "数据转换", description = "数据格式转换、验证和清洗")
public class DataTransformController {

    private final DataTransformationService transformService;

    @PostMapping("/convert")
    @Operation(summary = "转换数据格式")
    public Result<String> convertFormat(
            @RequestParam("file") MultipartFile file,
            @RequestParam DataFormat sourceFormat,
            @RequestParam DataFormat targetFormat,
            @RequestParam(required = false) Map<String, String> options,
            @CurrentUser User user) {

        DataTransformationService.TransformationResult result =
                transformService.convertFormat(file, sourceFormat, targetFormat, options);

        if (result.success()) {
            return Result.success(result.output());
        } else {
            return Result.error(400, String.join("; ", result.errors()));
        }
    }

    @PostMapping("/validate")
    @Operation(summary = "验证数据")
    public Result<Map<String, Object>> validateData(
            @RequestParam("file") MultipartFile file,
            @RequestParam DataFormat format,
            @RequestBody(required = false) List<ValidationRule> rules,
            @CurrentUser User user) {

        DataTransformationService.TransformationResult result =
                transformService.validateData(file, format, rules);

        return Result.success(Map.of(
                "valid", result.success(),
                "errors", result.errors(),
                "warnings", result.warnings(),
                "metadata", result.metadata()
        ));
    }

    @PostMapping("/clean")
    @Operation(summary = "清洗数据")
    public Result<String> cleanData(
            @RequestParam("file") MultipartFile file,
            @RequestParam DataFormat format,
            @RequestParam(required = false) Map<String, Object> cleaningOptions,
            @CurrentUser User user) {

        DataTransformationService.TransformationResult result =
                transformService.cleanData(file, format, cleaningOptions);

        if (result.success()) {
            return Result.success(result.output());
        } else {
            return Result.error(400, String.join("; ", result.errors()));
        }
    }

    @GetMapping("/formats")
    @Operation(summary = "获取支持的数据格式")
    public Result<DataFormat[]> getSupportedFormats() {
        return Result.success(DataFormat.values());
    }
}
