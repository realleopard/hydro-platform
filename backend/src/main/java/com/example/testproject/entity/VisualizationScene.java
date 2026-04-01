package com.example.testproject.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 可视化场景实体 - 对应 visualization_scenes 表
 */
@Data
@TableName("visualization_scenes")
public class VisualizationScene implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 场景ID */
    @TableId(type = IdType.ASSIGN_UUID)
    private UUID id;

    /** 场景名称 */
    private String name;

    /** 描述 */
    private String description;

    /** 所有者ID */
    private UUID ownerId;

    /** 场景类型 (watershed/river/basin/flood/custom) */
    private String sceneType;

    /** 相机配置 (JSON: {longitude, latitude, height, heading, pitch, roll}) */
    private String cameraConfig;

    /** 地形配置 (JSON: terrain provider config) */
    private String terrainConfig;

    /** 图层配置 (JSON: array of layer configs) */
    private String layerConfig;

    /** 实体数据 (JSON: rivers, lakes, stations, basins data) */
    private String entityData;

    /** 数据绑定 (JSON: bindings to datasets) */
    private String dataBindings;

    /** 状态 (draft/published) */
    private String status;

    /** 创建时间 */
    @TableField(fill = FieldFill.INSERT)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    /** 更新时间 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    /** 删除时间 */
    @TableLogic(value = "NULL", delval = "NOW()")
    private LocalDateTime deletedAt;
}
