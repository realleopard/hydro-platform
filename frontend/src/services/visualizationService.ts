import api from './api';

// Spatial data endpoints

/** Fetch rivers GeoJSON */
export const getRivers = () => api.get('/spatial/rivers');

/** Fetch stations GeoJSON */
export const getStations = () => api.get('/spatial/stations');

/** Fetch basins GeoJSON */
export const getBasins = () => api.get('/spatial/basins');

/** Fetch lakes GeoJSON */
export const getLakes = () => api.get('/spatial/lakes');

/** Fetch all spatial data for a region */
export const getRegionData = (regionId: string) =>
  api.get(`/spatial/regions/${regionId}`);

// Scene management endpoints

/** List visualization scenes */
export const getScenes = (params?: Record<string, unknown>) =>
  api.get('/scenes', params);

/** Get a single scene by ID */
export const getScene = (id: string) => api.get(`/scenes/${id}`);

/** Create a new scene */
export const createScene = (data: unknown) => api.post('/scenes', data);

/** Update an existing scene */
export const updateScene = (id: string, data: unknown) =>
  api.put(`/scenes/${id}`, data);

/** Delete a scene */
export const deleteScene = (id: string) => api.delete(`/scenes/${id}`);
