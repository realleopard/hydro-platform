-- 可视化场景表
CREATE TABLE IF NOT EXISTS visualization_scenes (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(36) REFERENCES users(id),
    scene_type VARCHAR(50),
    camera_config JSONB,
    terrain_config JSONB,
    layer_config JSONB,
    entity_data JSONB,
    data_bindings JSONB,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_visualization_scenes_owner_id ON visualization_scenes(owner_id);
CREATE INDEX IF NOT EXISTS idx_visualization_scenes_scene_type ON visualization_scenes(scene_type);
CREATE INDEX IF NOT EXISTS idx_visualization_scenes_status ON visualization_scenes(status);
CREATE INDEX IF NOT EXISTS idx_visualization_scenes_created_at ON visualization_scenes(created_at);

COMMENT ON TABLE visualization_scenes IS '可视化场景表';
COMMENT ON COLUMN visualization_scenes.id IS '场景ID';
COMMENT ON COLUMN visualization_scenes.name IS '场景名称';
COMMENT ON COLUMN visualization_scenes.description IS '描述';
COMMENT ON COLUMN visualization_scenes.owner_id IS '所有者ID';
COMMENT ON COLUMN visualization_scenes.scene_type IS '场景类型 (watershed/river/basin/flood/custom)';
COMMENT ON COLUMN visualization_scenes.camera_config IS '相机配置 (JSON: longitude, latitude, height, heading, pitch, roll)';
COMMENT ON COLUMN visualization_scenes.terrain_config IS '地形配置 (JSON: terrain provider config)';
COMMENT ON COLUMN visualization_scenes.layer_config IS '图层配置 (JSON: array of layer configs)';
COMMENT ON COLUMN visualization_scenes.entity_data IS '实体数据 (JSON: rivers, lakes, stations, basins)';
COMMENT ON COLUMN visualization_scenes.data_bindings IS '数据绑定 (JSON: bindings to datasets)';
COMMENT ON COLUMN visualization_scenes.status IS '状态 (draft/published)';
COMMENT ON COLUMN visualization_scenes.created_at IS '创建时间';
COMMENT ON COLUMN visualization_scenes.updated_at IS '更新时间';
COMMENT ON COLUMN visualization_scenes.deleted_at IS '删除时间（软删除）';
