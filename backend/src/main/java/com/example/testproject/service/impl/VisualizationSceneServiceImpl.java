package com.example.testproject.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.testproject.entity.VisualizationScene;
import com.example.testproject.mapper.VisualizationSceneMapper;
import com.example.testproject.service.VisualizationSceneService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * 可视化场景服务实现
 */
@Service
public class VisualizationSceneServiceImpl extends ServiceImpl<VisualizationSceneMapper, VisualizationScene> implements VisualizationSceneService {

    @Override
    @Transactional
    public VisualizationScene createScene(VisualizationScene scene, UUID ownerId) {
        scene.setOwnerId(ownerId);
        scene.setStatus("draft");
        save(scene);
        return scene;
    }

    @Override
    @Transactional
    public VisualizationScene publishScene(UUID sceneId) {
        VisualizationScene scene = getById(sceneId);
        if (scene == null) {
            throw new IllegalArgumentException("可视化场景不存在: " + sceneId);
        }
        scene.setStatus("published");
        updateById(scene);
        return scene;
    }
}
