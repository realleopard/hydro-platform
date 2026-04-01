package com.example.testproject.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.testproject.common.Result;
import com.example.testproject.entity.VisualizationScene;
import com.example.testproject.security.CurrentUser;
import com.example.testproject.service.VisualizationSceneService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * 可视化场景控制器
 */
@RestController
@RequestMapping("/api/v1/scenes")
@RequiredArgsConstructor
public class VisualizationSceneController {

    private final VisualizationSceneService visualizationSceneService;

    /**
     * 获取场景列表（分页，支持按类型和状态筛选）
     */
    @GetMapping("")
    public Result<Page<VisualizationScene>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String sceneType,
            @RequestParam(required = false) String status) {
        Page<VisualizationScene> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<VisualizationScene> wrapper = new LambdaQueryWrapper<>();
        if (sceneType != null && !sceneType.isEmpty()) {
            wrapper.eq(VisualizationScene::getSceneType, sceneType);
        }
        if (status != null && !status.isEmpty()) {
            wrapper.eq(VisualizationScene::getStatus, status);
        }
        wrapper.orderByDesc(VisualizationScene::getCreatedAt);
        Page<VisualizationScene> result = visualizationSceneService.page(pageParam, wrapper);
        return Result.success(result);
    }

    /**
     * 获取场景详情
     */
    @GetMapping("/{id}")
    public Result<VisualizationScene> get(@PathVariable UUID id) {
        VisualizationScene scene = visualizationSceneService.getById(id);
        if (scene == null) {
            return Result.error("可视化场景不存在");
        }
        return Result.success(scene);
    }

    /**
     * 创建场景
     */
    @PostMapping("")
    public Result<VisualizationScene> create(@RequestBody VisualizationScene scene, @CurrentUser UUID userId) {
        VisualizationScene created = visualizationSceneService.createScene(scene, userId);
        return Result.success(created);
    }

    /**
     * 更新场景
     */
    @PutMapping("/{id}")
    public Result<VisualizationScene> update(@PathVariable UUID id, @RequestBody VisualizationScene scene) {
        scene.setId(id);
        visualizationSceneService.updateById(scene);
        return Result.success(visualizationSceneService.getById(id));
    }

    /**
     * 删除场景
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable UUID id) {
        visualizationSceneService.removeById(id);
        return Result.success(null);
    }

    /**
     * 发布场景
     */
    @PostMapping("/{id}/publish")
    public Result<VisualizationScene> publish(@PathVariable UUID id) {
        VisualizationScene scene = visualizationSceneService.publishScene(id);
        return Result.success(scene);
    }
}
