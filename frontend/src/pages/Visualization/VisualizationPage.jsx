import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal, Form, Input, Select, message } from 'antd';
import {
  SaveOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import * as Cesium from 'cesium';
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
  EntityInfoPanel,
  Legend,
} from '../../components/Cesium';
import {
  getRivers,
  getStations,
  getBasins,
  getLakes,
  getScene,
  createScene,
  updateScene,
} from '../../services/visualizationService';
import { getRainfallByDay, getFlowByDay as getFlowByDayData } from '../../services/mockTimeSeriesData';
import { SCENE_TYPE_OPTIONS } from '../../types';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewer, setViewer] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date('2024-01-01'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeDataType, setActiveDataType] = useState(null);
  const [particleType, setParticleType] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showHydrology, setShowHydrology] = useState(true);

  // Scene management state
  const [currentScene, setCurrentScene] = useState(null);
  const [pendingCameraConfig, setPendingCameraConfig] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveForm] = Form.useForm();

  // Dynamic data state
  const [hydrologyData, setHydrologyData] = useState({
    rivers: [],
    lakes: [],
    stations: [],
    basins: []
  });
  const [rainfallData, setRainfallData] = useState({ stations: [], min: 0, max: 150 });
  const [riverData, setRiverData] = useState({ points: [], min: 0, max: 0 });
  const [gridData, setGridData] = useState({ grid: [], min: 0, max: 0 });
  const [particlePositions, setParticlePositions] = useState([]);
  const [spatialLoading, setSpatialLoading] = useState(true);
  const [spatialError, setSpatialError] = useState(null);
  const [particleIntensity, setParticleIntensity] = useState(1.0);
  const [colormap, setColormap] = useState('jet');

  // 示例数据 - 时间范围
  const startTime = new Date('2024-01-01');
  const endTime = new Date('2024-01-31');

  // Fetch scene data from URL param
  useEffect(() => {
    const sceneId = searchParams.get('sceneId');
    if (!sceneId) return;
    let cancelled = false;
    getScene(sceneId).then((scene) => {
      if (cancelled) return;
      setCurrentScene(scene);
      if (scene.cameraConfig) {
        setPendingCameraConfig(scene.cameraConfig);
      }
      if (scene.name) message.info(`已加载场景: ${scene.name}`);
    }).catch((err) => {
      console.warn('Failed to load scene:', err);
    });
    return () => { cancelled = true; };
  }, [searchParams]);

  // Restore camera position once both viewer and scene config are available
  useEffect(() => {
    if (!viewer || !pendingCameraConfig) return;
    const cam = pendingCameraConfig;
    if (typeof cam.longitude === 'number') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(cam.longitude, cam.latitude, cam.height || 2000000),
        orientation: {
          heading: Cesium.Math.toRadians(cam.heading || 0),
          pitch: Cesium.Math.toRadians(cam.pitch || -90),
          roll: Cesium.Math.toRadians(cam.roll || 0),
        },
        duration: 2,
      });
    }
    setPendingCameraConfig(null);
  }, [viewer, pendingCameraConfig]);

  // Save scene handler
  const handleSaveScene = () => {
    if (currentScene) {
      // Update existing scene
      saveForm.setFieldsValue({
        name: currentScene.name,
        description: currentScene.description,
        sceneType: currentScene.sceneType,
      });
    } else {
      saveForm.resetFields();
    }
    setSaveModalVisible(true);
  };

  const handleSaveSubmit = async () => {
    try {
      const values = await saveForm.validateFields();
      // Capture current camera position
      let cameraConfig = null;
      if (viewer) {
        const pos = viewer.camera.positionCartographic;
        const hpr = viewer.camera.headingPitchRoll;
        cameraConfig = {
          longitude: Cesium.Math.toDegrees(pos.longitude),
          latitude: Cesium.Math.toDegrees(pos.latitude),
          height: pos.height,
          heading: Cesium.Math.toDegrees(hpr.heading),
          pitch: Cesium.Math.toDegrees(hpr.pitch),
          roll: Cesium.Math.toDegrees(hpr.roll),
        };
      }
      const sceneData = {
        ...values,
        cameraConfig,
        entityData: hydrologyData,
      };
      if (currentScene) {
        await updateScene(currentScene.id, { ...currentScene, ...sceneData });
        message.success('场景已更新');
      } else {
        const created = await createScene(sceneData);
        setCurrentScene(created);
        message.success('场景已保存');
      }
      setSaveModalVisible(false);
    } catch (err) {
      if (err.message) message.error('保存失败: ' + err.message);
    }
  };

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
    // 根据日期索引联动数据可视化
    const dayIndex = Math.floor((time - startTime) / (24 * 60 * 60 * 1000));
    const clampedIndex = Math.max(0, Math.min(30, dayIndex));

    if (activeDataType === 'rainfall') {
      const dayData = getRainfallByDay(clampedIndex);
      const stations = dayData.stations.map(s => ({
        longitude: s.longitude,
        latitude: s.latitude,
        rainfall: s.rainfall,
      }));
      const values = stations.map(s => s.rainfall);
      setRainfallData({
        stations,
        min: Math.min(...values),
        max: Math.max(...values),
      });
      // 粒子强度随降雨量联动
      setParticlePositions(stations.map(s => ({
        longitude: s.longitude,
        latitude: s.latitude,
        height: 5000,
      })));
    }

    if (activeDataType === 'river1d') {
      const dayData = getFlowByDayData(clampedIndex);
      const allPoints = [];
      hydrologyData.rivers.forEach(r => {
        r.coordinates.forEach(c => {
          allPoints.push({
            longitude: c.longitude,
            latitude: c.latitude,
            height: c.height,
            value: dayData.averageFlow * (0.8 + Math.random() * 0.4),
          });
        });
      });
      if (allPoints.length > 0) {
        const vals = allPoints.map(p => p.value);
        setRiverData({ points: allPoints, min: Math.min(...vals), max: Math.max(...vals) });
      }
    }

    if (activeDataType === 'grid2d') {
      const dayData = getRainfallByDay(clampedIndex);
      const avgRainfall = dayData.averageRainfall;
      // 生成 2D 网格: 经度 108-114, 纬度 29-33, 0.5 度间隔
      const grid = [];
      const step = 0.5;
      for (let lon = 108; lon <= 114; lon += step) {
        for (let lat = 29; lat <= 33; lat += step) {
          // 简单距离衰减 + 随机扰动
          const distFactor = Math.random() * 0.6 + 0.7;
          const value = avgRainfall * distFactor;
          grid.push({ longitude: lon, latitude: lat, value, size: step });
        }
      }
      const vals = grid.map(g => g.value);
      setGridData({ grid, min: Math.min(...vals), max: Math.max(...vals) });
    }
  }, [activeDataType, hydrologyData.rivers, startTime]);

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
              options={{ intensity: particleIntensity }}
            />
          )}

          {/* 数据可视化 */}
          {viewer && activeDataType && !spatialLoading && (
            <DataVisualization
              viewer={viewer}
              type={activeDataType}
              data={
                activeDataType === 'rainfall' ? rainfallData :
                activeDataType === 'grid2d' ? gridData :
                riverData
              }
              options={{ showLabels: true, colormap }}
            />
          )}

          {/* 图例 */}
          {activeDataType && (
            <Legend
              colormap={activeDataType === 'rainfall' ? 'rainfall' : colormap}
              min={activeDataType === 'rainfall' ? rainfallData.min : activeDataType === 'grid2d' ? gridData.min : riverData.min}
              max={activeDataType === 'rainfall' ? rainfallData.max : activeDataType === 'grid2d' ? gridData.max : riverData.max}
              unit={activeDataType === 'rainfall' ? 'mm' : activeDataType === 'grid2d' ? 'mm' : 'm³/s'}
              title={activeDataType === 'rainfall' ? '降雨量' : activeDataType === 'grid2d' ? '降雨分布' : '流量'}
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

        {/* Scene management */}
        <div className="sidebar-section">
          <h3><GlobalOutlined /> 场景管理</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="viz-btn" onClick={handleSaveScene}>
              <SaveOutlined /> {currentScene ? '更新场景' : '保存场景'}
            </button>
            <button className="viz-btn" onClick={() => navigate('/scenes')}>
              <FolderOpenOutlined /> 场景列表
            </button>
            {currentScene && (
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                当前: {currentScene.name}
              </div>
            )}
          </div>
        </div>

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
          {particleType && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, color: '#aaa' }}>粒子强度: {particleIntensity.toFixed(1)}</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={particleIntensity}
                onChange={(e) => setParticleIntensity(parseFloat(e.target.value))}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <h3>🌊 水文数据</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className={`viz-btn ${activeDataType === 'river1d' ? 'active' : ''}`}
              onClick={toggleRiverData}
              disabled={spatialLoading}
            >
              {activeDataType === 'river1d' ? '隐藏河网' : '显示河网'}
            </button>
            <button
              className={`viz-btn ${activeDataType === 'grid2d' ? 'active' : ''}`}
              onClick={() => setActiveDataType(activeDataType === 'grid2d' ? null : 'grid2d')}
              disabled={spatialLoading}
            >
              {activeDataType === 'grid2d' ? '隐藏网格' : '显示网格'}
            </button>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>🎨 色彩方案</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {['jet', 'hot', 'cool'].map((cm) => (
              <button
                key={cm}
                className={`viz-btn ${colormap === cm ? 'active' : ''}`}
                onClick={() => setColormap(cm)}
                style={{ flex: 1, fontSize: 11, padding: '4px 0' }}
              >
                {cm === 'jet' ? '彩虹' : cm === 'hot' ? '热力' : '冷色'}
              </button>
            ))}
          </div>
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

      {/* Save scene modal */}
      <Modal
        title={currentScene ? '更新场景' : '保存场景'}
        open={saveModalVisible}
        onOk={handleSaveSubmit}
        onCancel={() => setSaveModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={saveForm} layout="vertical">
          <Form.Item name="name" label="场景名称" rules={[{ required: true, message: '请输入场景名称' }]}>
            <Input placeholder="例如：长江中游流域模拟" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="场景描述（可选）" />
          </Form.Item>
          <Form.Item name="sceneType" label="场景类型" initialValue="custom">
            <Select>
              {SCENE_TYPE_OPTIONS.map(({ value, label }) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VisualizationPage;
