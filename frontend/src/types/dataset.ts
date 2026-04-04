export type DataType = 'timeseries' | 'raster' | 'vector' | 'netcdf' | 'csv' | 'geotiff' | 'shapefile';
export type StorageType = 's3' | 'local' | 'nfs';
export type DatasetVisibility = 'private' | 'public' | 'group';

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  dataType: DataType;
  storageType: StorageType;
  storagePath: string;
  fileSize?: number;
  checksum?: string;
  metadata?: string;
  spatialBounds?: string;
  temporalStart?: string;
  temporalEnd?: string;
  downloadCount: number;
  visibility: DatasetVisibility;
  createdAt: string;
  updatedAt: string;
}

export const DATASET_DATA_TYPE_OPTIONS: { value: DataType; label: string; color: string }[] = [
  { value: 'timeseries', label: '时间序列', color: 'blue' },
  { value: 'raster', label: '栅格数据', color: 'green' },
  { value: 'vector', label: '矢量数据', color: 'orange' },
  { value: 'netcdf', label: 'NetCDF', color: 'purple' },
  { value: 'csv', label: 'CSV', color: 'cyan' },
  { value: 'geotiff', label: 'GeoTIFF', color: 'geekblue' },
  { value: 'shapefile', label: 'Shapefile', color: 'magenta' },
];

export const DATASET_DATA_TYPE_MAP: Record<DataType, { label: string; color: string }> = {
  timeseries: { label: '时间序列', color: 'blue' },
  raster: { label: '栅格数据', color: 'green' },
  vector: { label: '矢量数据', color: 'orange' },
  netcdf: { label: 'NetCDF', color: 'purple' },
  csv: { label: 'CSV', color: 'cyan' },
  geotiff: { label: 'GeoTIFF', color: 'geekblue' },
  shapefile: { label: 'Shapefile', color: 'magenta' },
};

export const DATASET_VISIBILITY_OPTIONS: { value: DatasetVisibility; label: string; color: string }[] = [
  { value: 'private', label: '私有', color: 'default' },
  { value: 'public', label: '公开', color: 'success' },
  { value: 'group', label: '组内', color: 'warning' },
];

export const DATASET_VISIBILITY_MAP: Record<DatasetVisibility, { label: string; color: string }> = {
  private: { label: '私有', color: 'default' },
  public: { label: '公开', color: 'success' },
  group: { label: '组内', color: 'warning' },
};

export interface DatasetPreviewResponse {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  previewRows: number;
}

// 文件扩展名到数据类型的映射
export const FILE_EXTENSION_DATA_TYPE_MAP: Record<string, DataType> = {
  '.csv': 'csv',
  '.nc': 'netcdf',
  '.nc4': 'netcdf',
  '.tif': 'geotiff',
  '.tiff': 'geotiff',
  '.shp': 'shapefile',
  '.ts': 'timeseries',
  '.asc': 'raster',
};
