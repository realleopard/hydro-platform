import React, { useState, useCallback, useRef } from 'react';
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
import './VisualizationPage.css';

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

  // 示例数据 - 时间范围
  const startTime = new Date('2024-01-01');
  const endTime = new Date('2024-01-31');

  // 示例降雨数据
  const rainfallData = {
    stations: [
      { longitude: 111.5, latitude: 30.5, rainfall: 50 },
      { longitude: 112.0, latitude: 30.8, rainfall: 80 },
      { longitude: 111.8, latitude: 30.2, rainfall: 30 },
      { longitude: 111.2, latitude: 30.6, rainfall: 120 },
      { longitude: 112.2, latitude: 30.4, rainfall: 65 }
    ],
    min: 0,
    max: 150
  };

  // 示例河流数据
  const riverData = {
    points: [
      { longitude: 111.0, latitude: 30.0, height: 100, value: 100 },
      { longitude: 111.2, latitude: 30.1, height: 95, value: 150 },
      { longitude: 111.4, latitude: 30.2, height: 90, value: 200 },
      { longitude: 111.6, latitude: 30.3, height: 85, value: 180 },
      { longitude: 111.8, latitude: 30.4, height: 80, value: 220 }
    ],
    min: 100,
    max: 220
  };

  // 粒子位置数据
  const particlePositions = [
    { longitude: 111.5, latitude: 30.5, height: 5000 },
    { longitude: 111.8, latitude: 30.8, height: 5000 },
    { longitude: 112.0, latitude: 30.3, height: 5000 }
  ];

  // 水文实体数据
  const hydrologyData = {
    rivers: [
      {
        id: 'river-001',
        name: '长江中游段',
        coordinates: [
          { longitude: 111.0, latitude: 30.0, height: 50 },
          { longitude: 111.5, latitude: 30.2, height: 45 },
          { longitude: 112.0, latitude: 30.4, height: 40 },
          { longitude: 112.5, latitude: 30.5, height: 35 },
          { longitude: 113.0, latitude: 30.6, height: 30 }
        ],
        length: 245.5,
        basinArea: 1250.8,
        color: '#0066cc',
        width: 4
      },
      {
        id: 'river-002',
        name: '汉江',
        coordinates: [
          { longitude: 110.5, latitude: 30.8, height: 80 },
          { longitude: 111.0, latitude: 30.6, height: 60 },
          { longitude: 111.5, latitude: 30.5, height: 45 }
        ],
        length: 157.2,
        basinArea: 890.5,
        color: '#00aaff',
        width: 3
      }
    ],
    lakes: [
      {
        id: 'lake-001',
        name: '洞庭湖',
        coordinates: [
          { longitude: 112.5, latitude: 29.2 },
          { longitude: 113.0, latitude: 29.2 },
          { longitude: 113.0, latitude: 29.5 },
          { longitude: 112.8, latitude: 29.6 },
          { longitude: 112.5, latitude: 29.5 }
        ],
        area: 2625.0,
        capacity: 220.5,
        waterLevel: 32.5,
        color: '#00aaff'
      }
    ],
    stations: [
      {
        id: 'station-001',
        name: '宜昌站',
        longitude: 111.3,
        latitude: 30.7,
        height: 50,
        type: 'flow',
        value: 12500,
        establishedDate: '1950-01-01'
      },
      {
        id: 'station-002',
        name: '汉口站',
        longitude: 114.3,
        latitude: 30.6,
        height: 25,
        type: 'flow',
        value: 18500,
        establishedDate: '1952-06-15'
      },
      {
        id: 'station-003',
        name: '武汉雨量站',
        longitude: 114.3,
        latitude: 30.5,
        height: 30,
        type: 'rainfall',
        value: 45.5,
        establishedDate: '1960-03-20'
      },
      {
        id: 'station-004',
        name: '荆州站',
        longitude: 112.2,
        latitude: 30.3,
        height: 35,
        type: 'waterLevel',
        value: 38.2,
        establishedDate: '1955-08-10'
      }
    ],
    basins: [
      {
        id: 'basin-001',
        name: '长江流域',
        coordinates: [
          { longitude: 110.0, latitude: 29.0 },
          { longitude: 115.0, latitude: 29.0 },
          { longitude: 115.0, latitude: 31.0 },
          { longitude: 113.0, latitude: 31.5 },
          { longitude: 110.0, latitude: 31.0 }
        ],
        area: 1800000,
        outlet: '上海',
        avgElevation: 450,
        runoff: 9600,
        color: '#2d5016'
      }
    ]
  };

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
          {viewer && showHydrology && (
            <HydrologyEntities
              viewer={viewer}
              data={hydrologyData}
              onEntityClick={handleEntityClick}
            />
          )}

          {/* 粒子特效 */}
          {viewer && particleType && (
            <ParticleSystem
              viewer={viewer}
              type={particleType}
              data={particlePositions}
              options={{ intensity: 1.0 }}
            />
          )}

          {/* 数据可视化 */}
          {viewer && activeDataType && (
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
          >
            {activeDataType === 'rainfall' ? '隐藏降雨' : '显示降雨'}
          </button>
        </div>

        <div className="sidebar-section">
          <h3>🌊 水文数据</h3>
          <button
            className={`viz-btn ${activeDataType === 'river1d' ? 'active' : ''}`}
            onClick={toggleRiverData}
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
