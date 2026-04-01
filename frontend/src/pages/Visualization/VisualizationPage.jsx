import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  CesiumViewer,
  LayerManager,
  ParticleSystem,
  TimeSlider,
  DataVisualization,
  MeasurementTool,
  HydrologyEntities,
  TerrainLayer,
  ImageryLayer,
  EntityInfoPanel
} from '../../components/Cesium';
import {
  getRivers,
  getStations,
  getBasins,
  getLakes
} from '../../services/visualizationService';
import './VisualizationPage.css';

/**
 * Transform a GeoJSON FeatureCollection into the hydrology data format
 * expected by HydrologyEntities and other Cesium components.
 *
 * GeoJSON coordinates are [longitude, latitude, (height)] arrays.
 * The components expect objects with { longitude, latitude, height? }.
 */
function transformCoordinates(coords) {
  if (!coords || !Array.isArray(coords)) return [];
  // coords may be a single [lon, lat, height] or an array of them
  if (typeof coords[0] === 'number') {
    return {
      longitude: coords[0],
      latitude: coords[1],
      height: coords[2] || 0
    };
  }
  return coords.map((c) => ({
    longitude: c[0],
    latitude: c[1],
    height: c[2] || 0
  }));
}

function geoJsonToHydrologyData(rivers, lakes, stations, basins) {
  return {
    rivers: (rivers?.features || []).map((f, i) => {
      const p = f.properties || {};
      const isLineString = f.geometry?.type === 'LineString';
      const coords = isLineString
        ? f.geometry.coordinates
        : f.geometry?.coordinates?.[0] || [];
      return {
        id: p.id || `river-${i}`,
        name: p.name || `River ${i + 1}`,
        coordinates: transformCoordinates(coords),
        length: p.length || 0,
        basinArea: p.basinArea || 0,
        color: p.color || '#0066cc',
        width: p.width || 3
      };
    }),
    lakes: (lakes?.features || []).map((f, i) => {
      const p = f.properties || {};
      const ring =
        f.geometry?.type === 'Polygon'
          ? f.geometry.coordinates[0]
          : f.geometry?.coordinates || [];
      return {
        id: p.id || `lake-${i}`,
        name: p.name || `Lake ${i + 1}`,
        coordinates: transformCoordinates(ring),
        area: p.area || 0,
        capacity: p.capacity || 0,
        waterLevel: p.waterLevel || 0,
        color: p.color || '#00aaff'
      };
    }),
    stations: (stations?.features || []).map((f, i) => {
      const p = f.properties || {};
      const c = f.geometry?.coordinates || [0, 0, 0];
      return {
        id: p.id || `station-${i}`,
        name: p.name || `Station ${i + 1}`,
        longitude: c[0],
        latitude: c[1],
        height: c[2] || 0,
        type: p.type || 'flow',
        value: p.value || 0,
        establishedDate: p.establishedDate || '',
        color: p.color
      };
    }),
    basins: (basins?.features || []).map((f, i) => {
      const p = f.properties || {};
      const ring =
        f.geometry?.type === 'Polygon'
          ? f.geometry.coordinates[0]
          : f.geometry?.coordinates || [];
      return {
        id: p.id || `basin-${i}`,
        name: p.name || `Basin ${i + 1}`,
        coordinates: transformCoordinates(ring),
        area: p.area || 0,
        outlet: p.outlet || '',
        avgElevation: p.avgElevation || 0,
        runoff: p.runoff || 0,
        color: p.color || '#2d5016'
      };
    })
  };
}

/**
 * 3D可视化页面 - 集成所有Cesium组件
 */
const VisualizationPage = () => {
  const [viewer, setViewer] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date('2024-01-01'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeDataType, setActiveDataType] = useState(null);
  const [particleType, setParticleType] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showHydrology, setShowHydrology] = useState(true);

  // Dynamic data state
  const [hydrologyData, setHydrologyData] = useState({
    rivers: [],
    lakes: [],
    stations: [],
    basins: []
  });
  const [rainfallData, setRainfallData] = useState({ stations: [], min: 0, max: 150 });
  const [riverData, setRiverData] = useState({ points: [], min: 0, max: 0 });
  const [particlePositions, setParticlePositions] = useState([]);
  const [spatialLoading, setSpatialLoading] = useState(true);
  const [spatialError, setSpatialError] = useState(null);

  // 示例数据 - 时间范围
  const startTime = new Date('2024-01-01');
  const endTime = new Date('2024-01-31');

  // Fetch all spatial data on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchSpatialData() {
      setSpatialLoading(true);
      setSpatialError(null);

      try {
        const [riversRes, lakesRes, stationsRes, basinsRes] = await Promise.allSettled([
          getRivers(),
          getLakes(),
          getStations(),
          getBasins()
        ]);

        if (cancelled) return;

        // Extract fulfilled values (or null for rejected)
        const rivers = riversRes.status === 'fulfilled' ? riversRes.value : null;
        const lakes = lakesRes.status === 'fulfilled' ? lakesRes.value : null;
        const stations = stationsRes.status === 'fulfilled' ? stationsRes.value : null;
        const basins = basinsRes.status === 'fulfilled' ? basinsRes.value : null;

        // Log any failures but continue with partial data
        if (riversRes.status === 'rejected') {
          console.warn('Failed to load rivers:', riversRes.reason?.message);
        }
        if (lakesRes.status === 'rejected') {
          console.warn('Failed to load lakes:', lakesRes.reason?.message);
        }
        if (stationsRes.status === 'rejected') {
          console.warn('Failed to load stations:', stationsRes.reason?.message);
        }
        if (basinsRes.status === 'rejected') {
          console.warn('Failed to load basins:', basinsRes.reason?.message);
        }

        // Transform GeoJSON to component format
        const hydrology = geoJsonToHydrologyData(rivers, lakes, stations, basins);
        setHydrologyData(hydrology);

        // Derive rainfall visualization data from stations that carry rainfall info
        const rainfallStations = hydrology.stations
          .filter((s) => s.type === 'rainfall' && s.value !== undefined)
          .map((s) => ({
            longitude: s.longitude,
            latitude: s.latitude,
            rainfall: s.value
          }));
        if (rainfallStations.length > 0) {
          const values = rainfallStations.map((s) => s.rainfall);
          setRainfallData({
            stations: rainfallStations,
            min: Math.min(...values),
            max: Math.max(...values)
          });
        }

        // Derive 1D river visualization data from rivers
        const allPoints = [];
        hydrology.rivers.forEach((r) => {
          r.coordinates.forEach((c) => {
            allPoints.push({
              longitude: c.longitude,
              latitude: c.latitude,
              height: c.height,
              value: r.length || 0
            });
          });
        });
        if (allPoints.length > 0) {
          const vals = allPoints.map((p) => p.value);
          setRiverData({ points: allPoints, min: Math.min(...vals), max: Math.max(...vals) });
        }

        // Particle positions derived from stations (for rainfall particles)
        if (hydrology.stations.length > 0) {
          setParticlePositions(
            hydrology.stations.slice(0, 3).map((s) => ({
              longitude: s.longitude,
              latitude: s.latitude,
              height: 5000
            }))
          );
        }

        // Set error state only if ALL requests failed
        const allFailed =
          riversRes.status === 'rejected' &&
          lakesRes.status === 'rejected' &&
          stationsRes.status === 'rejected' &&
          basinsRes.status === 'rejected';
        if (allFailed) {
          setSpatialError('Unable to load spatial data from server.');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Unexpected error loading spatial data:', err);
          setSpatialError('Unexpected error loading spatial data.');
        }
      } finally {
        if (!cancelled) {
          setSpatialLoading(false);
        }
      }
    }

    fetchSpatialData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewerReady = useCallback((v) => {
    setViewer(v);
    console.log('Cesium Viewer 已就绪');
  }, []);

  const handleTimeChange = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  const handlePlayStateChange = useCallback((playing) => {
    setIsPlaying(playing);
  }, []);

  const handleMeasurementComplete = useCallback((measurement) => {
    console.log('测量完成:', measurement);
  }, []);

  const handleEntityClick = useCallback((entity) => {
    setSelectedEntity(entity);
    console.log('选中实体:', entity);
  }, []);

  const toggleRainfall = () => {
    if (activeDataType === 'rainfall') {
      setActiveDataType(null);
      setParticleType(null);
    } else {
      setActiveDataType('rainfall');
      setParticleType('rainfall');
    }
  };

  const toggleRiverData = () => {
    setActiveDataType(activeDataType === 'river1d' ? null : 'river1d');
  };

  const toggleHydrology = () => {
    setShowHydrology(!showHydrology);
  };

  return (
    <div className="visualization-page">
      <div className="cesium-container">
        <CesiumViewer
          onViewerReady={handleViewerReady}
          onClick={(pos) => console.log('点击位置:', pos)}
          onCameraChange={(cam) => console.log('相机位置:', cam)}
        >
          {/* 地形图层 */}
          {viewer && <TerrainLayer viewer={viewer} />}

          {/* 影像图层选择器 */}
          {viewer && <ImageryLayer viewer={viewer} defaultLayer="bing" />}

          {/* 图层管理器 */}
          {viewer && <LayerManager viewer={viewer} />}

          {/* 测量工具 */}
          {viewer && <MeasurementTool viewer={viewer} onMeasurementComplete={handleMeasurementComplete} />}

          {/* 水文实体 */}
          {viewer && showHydrology && !spatialLoading && (
            <HydrologyEntities
              viewer={viewer}
              data={hydrologyData}
              onEntityClick={handleEntityClick}
            />
          )}

          {/* 粒子特效 */}
          {viewer && particleType && particlePositions.length > 0 && (
            <ParticleSystem
              viewer={viewer}
              type={particleType}
              data={particlePositions}
              options={{ intensity: 1.0 }}
            />
          )}

          {/* 数据可视化 */}
          {viewer && activeDataType && !spatialLoading && (
            <DataVisualization
              viewer={viewer}
              type={activeDataType}
              data={activeDataType === 'rainfall' ? rainfallData : riverData}
              options={{ showLabels: true }}
            />
          )}

          {/* 实体详情面板 */}
          {selectedEntity && (
            <EntityInfoPanel
              entity={selectedEntity}
              onClose={() => setSelectedEntity(null)}
            />
          )}
        </CesiumViewer>

        {/* 时间轴控制 */}
        {viewer && (
          <TimeSlider
            viewer={viewer}
            startTime={startTime}
            endTime={endTime}
            currentTime={currentTime}
            onTimeChange={handleTimeChange}
            onPlayStateChange={handlePlayStateChange}
          />
        )}
      </div>

      {/* 侧边控制面板 */}
      <div className="visualization-sidebar">
        {/* Loading indicator */}
        {spatialLoading && (
          <div className="sidebar-section">
            <div className="status-info" style={{ textAlign: 'center' }}>
              <p>Loading spatial data...</p>
            </div>
          </div>
        )}

        {/* Error notice */}
        {spatialError && (
          <div className="sidebar-section">
            <div className="status-info" style={{ color: '#ff6b6b' }}>
              <p>{spatialError}</p>
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <h3>🗺️ 图层控制</h3>
          <button
            className={`viz-btn ${showHydrology ? 'active' : ''}`}
            onClick={toggleHydrology}
          >
            {showHydrology ? '隐藏水文要素' : '显示水文要素'}
          </button>
        </div>

        <div className="sidebar-section">
          <h3>🌧️ 气象数据</h3>
          <button
            className={`viz-btn ${activeDataType === 'rainfall' ? 'active' : ''}`}
            onClick={toggleRainfall}
            disabled={spatialLoading}
          >
            {activeDataType === 'rainfall' ? '隐藏降雨' : '显示降雨'}
          </button>
        </div>

        <div className="sidebar-section">
          <h3>🌊 水文数据</h3>
          <button
            className={`viz-btn ${activeDataType === 'river1d' ? 'active' : ''}`}
            onClick={toggleRiverData}
            disabled={spatialLoading}
          >
            {activeDataType === 'river1d' ? '隐藏河网' : '显示河网'}
          </button>
        </div>

        <div className="sidebar-section">
          <h3>📊 当前状态</h3>
          <div className="status-info">
            <p><strong>模拟时间:</strong> {currentTime.toLocaleString('zh-CN')}</p>
            <p><strong>播放状态:</strong> {isPlaying ? '▶ 播放中' : '⏸ 已暂停'}</p>
            <p><strong>数据图层:</strong> {activeDataType || '无'}</p>
            <p><strong>空间数据:</strong> {spatialLoading ? '加载中...' : `${hydrologyData.rivers.length} 河流, ${hydrologyData.stations.length} 测站`}</p>
            {selectedEntity && (
              <p><strong>选中实体:</strong> {selectedEntity.name}</p>
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <h3>💡 操作提示</h3>
          <ul className="tips-list">
            <li>鼠标左键拖动旋转视角</li>
            <li>鼠标右键拖动平移</li>
            <li>滚轮缩放</li>
            <li>点击水文要素查看详情</li>
            <li>使用测量工具进行距离/面积测量</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VisualizationPage;
