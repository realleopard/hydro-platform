// 可视化场景相关类型定义

export type SceneType = 'watershed' | 'river' | 'basin' | 'flood' | 'custom';
export type SceneStatus = 'draft' | 'published';

export const SCENE_TYPE_OPTIONS: { value: SceneType; label: string; color: string }[] = [
  { value: 'watershed', label: '流域', color: 'green' },
  { value: 'river', label: '河流', color: 'blue' },
  { value: 'basin', label: '盆地', color: 'orange' },
  { value: 'flood', label: '洪水', color: 'red' },
  { value: 'custom', label: '自定义', color: 'purple' },
];

export const SCENE_STATUS_OPTIONS: { value: SceneStatus; label: string; color: string }[] = [
  { value: 'draft', label: '草稿', color: 'default' },
  { value: 'published', label: '已发布', color: 'success' },
];

export const SCENE_TYPE_MAP: Record<SceneType, { label: string; color: string }> = {
  watershed: { label: '流域', color: 'green' },
  river: { label: '河流', color: 'blue' },
  basin: { label: '盆地', color: 'orange' },
  flood: { label: '洪水', color: 'red' },
  custom: { label: '自定义', color: 'purple' },
};

export const SCENE_STATUS_MAP: Record<SceneStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
};

export interface CameraConfig {
  longitude: number;
  latitude: number;
  height: number;
  heading?: number;
  pitch?: number;
  roll?: number;
}

export interface TerrainConfig {
  enabled: boolean;
  url?: string;
  depthTestAgainstTerrain?: boolean;
}

export interface LayerConfig {
  id: string;
  name: string;
  type: 'imagery' | 'terrain' | 'geojson' | '3dtiles' | 'heatmap';
  visible: boolean;
  opacity?: number;
  url?: string;
  options?: Record<string, unknown>;
}

export interface HydrologyEntity {
  id: string;
  name: string;
  type: 'river' | 'lake' | 'station' | 'basin';
  coordinates: number[][] | number[][][];
  properties?: Record<string, unknown>;
}

export interface EntityData {
  rivers?: HydrologyEntity[];
  lakes?: HydrologyEntity[];
  stations?: HydrologyEntity[];
  basins?: HydrologyEntity[];
}

export interface DataBinding {
  datasetId: string;
  variableName: string;
  entityType: string;
  entityId: string;
}

export interface VisualizationScene {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  sceneType: SceneType;
  cameraConfig?: CameraConfig;
  terrainConfig?: TerrainConfig;
  layerConfig?: LayerConfig[];
  entityData?: EntityData;
  dataBindings?: DataBinding[];
  status: SceneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SceneListParams {
  page?: number;
  pageSize?: number;
  sceneType?: SceneType;
  status?: SceneStatus;
}

export interface SpatialDataset {
  type: 'FeatureCollection';
  features: SpatialFeature[];
}

export interface SpatialFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[][] | number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
}
