package com.example.testproject.controller;

import com.example.testproject.common.Result;
import com.example.testproject.dto.analysis.SensitivityAnalysisRequest;
import com.example.testproject.dto.analysis.SensitivityAnalysisResponse;
import com.example.testproject.entity.User;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.SensitivityAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 分析控制器
 * 提供参数敏感性分析等高级分析功能
 */
@RestController
@RequestMapping("/api/v1/analysis")
@RequiredArgsConstructor
@Tag(name = "分析管理", description = "敏感性分析、不确定性分析等")
public class AnalysisController {

    private final SensitivityAnalysisService analysisService;

    @PostMapping("/sensitivity")
    @Operation(summary = "运行敏感性分析")
    public Result<SensitivityAnalysisResponse> runSensitivityAnalysis(
            @Valid @RequestBody SensitivityAnalysisRequest request,
            @CurrentUser User user) {
        SensitivityAnalysisResponse response = analysisService.runAnalysis(request, user.getId());
        return Result.success(response);
    }

    @GetMapping("/{analysisId}")
    @Operation(summary = "获取分析结果")
    public Result<SensitivityAnalysisResponse> getAnalysisResult(
            @PathVariable String analysisId,
            @CurrentUser User user) {
        SensitivityAnalysisResponse response = analysisService.getResult(analysisId, user.getId());
        return Result.success(response);
    }

    @GetMapping("/model/{modelId}")
    @Operation(summary = "获取模型的分析历史")
    public Result<List<SensitivityAnalysisResponse>> getModelAnalysisHistory(
            @PathVariable Long modelId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize,
            @CurrentUser User user) {
        List<SensitivityAnalysisResponse> list = analysisService.getModelHistory(
                modelId, user.getId(), page, pageSize);
        return Result.success(list);
    }

    @DeleteMapping("/{analysisId}")
    @Operation(summary = "删除分析结果")
    public Result<Void> deleteAnalysis(
            @PathVariable String analysisId,
            @CurrentUser User user) {
        analysisService.deleteAnalysis(analysisId, user.getId());
        return Result.success();
    }
}
