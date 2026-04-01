// 模型分类选项
export const MODEL_CATEGORY_OPTIONS = [
  { label: '水文模型', value: 'hydrological' },
  { label: '水力学模型', value: 'hydraulic' },
  { label: '水质模型', value: 'water_quality' },
  { label: '生态模型', value: 'ecological' },
  { label: '其他', value: 'other' },
];

// 模型状态选项
export const MODEL_STATUS_OPTIONS = [
  { label: '草稿', value: 'draft', color: 'default' },
  { label: '已发布', value: 'published', color: 'success' },
  { label: '已归档', value: 'archived', color: 'warning' },
  { label: '已弃用', value: 'deprecated', color: 'error' },
];

// 数据类型选项
export const DATA_TYPE_OPTIONS = [
  { label: '栅格数据', value: 'raster' },
  { label: '矢量数据', value: 'vector' },
  { label: '表格数据', value: 'tabular' },
  { label: 'NetCDF', value: 'netcdf' },
  { label: 'GeoTIFF', value: 'geotiff' },
  { label: 'JSON', value: 'json' },
];
