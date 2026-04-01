package com.example.testproject.controller;

import com.example.testproject.common.Result;
import com.example.testproject.service.SpatialDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 空间数据控制器 - 提供预构建的空间数据（非用户管理）
 */
@RestController
@RequestMapping("/api/v1/spatial")
@RequiredArgsConstructor
public class SpatialDataController {

    private final SpatialDataService spatialDataService;

    /**
     * 获取河流GeoJSON数据
     */
    @GetMapping("/rivers")
    public Result<Map<String, Object>> getRivers() {
        return Result.success(spatialDataService.getRivers());
    }

    /**
     * 获取水文站点GeoJSON数据
     */
    @GetMapping("/stations")
    public Result<Map<String, Object>> getStations() {
        return Result.success(spatialDataService.getStations());
    }

    /**
     * 获取流域边界GeoJSON数据
     */
    @GetMapping("/basins")
    public Result<Map<String, Object>> getBasins() {
        return Result.success(spatialDataService.getBasins());
    }

    /**
     * 获取湖泊/水库GeoJSON数据
     */
    @GetMapping("/lakes")
    public Result<Map<String, Object>> getLakes() {
        return Result.success(spatialDataService.getLakes());
    }

    /**
     * 获取指定区域的所有空间数据（合并GeoJSON）
     */
    @GetMapping("/regions/{regionId}")
    public Result<Map<String, Object>> getRegionData(@PathVariable String regionId) {
        return Result.success(spatialDataService.getRegionData(regionId));
    }
}
