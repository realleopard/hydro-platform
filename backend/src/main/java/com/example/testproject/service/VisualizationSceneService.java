package com.example.testproject.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.testproject.entity.VisualizationScene;

import java.util.UUID;

/**
 * 可视化场景服务接口
 */
public interface VisualizationSceneService extends IService<VisualizationScene> {

    /**
     * 创建可视化场景
     */
    VisualizationScene createScene(VisualizationScene scene, UUID ownerId);

    /**
     * 发布场景
     */
    VisualizationScene publishScene(UUID sceneId);
}
