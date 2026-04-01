import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { CESIUM_CONFIG } from '../../config/cesium';
import './CesiumViewer.css';

// 设置 Cesium ion token
Cesium.Ion.defaultAccessToken = CESIUM_CONFIG.ionToken;

const CesiumViewer = ({
  terrainUrl,
  onViewerReady,
  onClick,
  onCameraChange,
  children
}) => {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    // 初始化 Viewer
    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      // 基础配置
      animation: false,           // 隐藏动画控件
      baseLayerPicker: true,      // 显示图层选择器
      fullscreenButton: true,     // 显示全屏按钮
      geocoder: true,             // 显示地理编码器
      homeButton: true,           // 显示主页按钮
      infoBox: true,              // 显示信息框
      sceneModePicker: true,      // 显示场景模式选择器
      selectionIndicator: true,   // 显示选择指示器
      timeline: false,            // 隐藏时间轴（我们将使用自定义的）
      navigationHelpButton: true, // 显示导航帮助按钮

      // 地形 - 使用 Cesium World Terrain
      terrainProvider: new Cesium.CesiumTerrainProvider({
        url: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
        requestWaterMask: true,
        requestVertexNormals: true
      }),

      // 默认影像图层
      imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),

      // 性能配置
      targetFrameRate: 60,
      useDefaultRenderLoop: true,
    });

    viewerRef.current = viewer;

    // 设置默认视角
    const { longitude, latitude, height, heading, pitch, roll } = CESIUM_CONFIG.defaultView;
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: Cesium.Math.toRadians(roll)
      }
    });

    // 启用光照
    viewer.scene.globe.enableLighting = true;

    // 启用深度测试
    viewer.scene.globe.depthTestAgainstTerrain = true;

    // 点击事件
    if (onClick) {
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
      handler.setInputAction((click) => {
        const cartesian = viewer.camera.pickEllipsoid(click.position);
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const lon = Cesium.Math.toDegrees(cartographic.longitude);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          onClick({ longitude: lon, latitude: lat, cartesian });
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    // 相机变化事件
    if (onCameraChange) {
      viewer.camera.changed.addEventListener(() => {
        const position = viewer.camera.positionCartographic;
        onCameraChange({
          longitude: Cesium.Math.toDegrees(position.longitude),
          latitude: Cesium.Math.toDegrees(position.latitude),
          height: position.height,
          heading: Cesium.Math.toDegrees(viewer.camera.heading),
          pitch: Cesium.Math.toDegrees(viewer.camera.pitch)
        });
      });
    }

    // 设置完成状态
    setIsReady(true);
    onViewerReady?.(viewer);

    // 清理函数
    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, []);

  // 切换地形
  useEffect(() => {
    if (!viewerRef.current || !terrainUrl) return;

    viewerRef.current.terrainProvider = new Cesium.CesiumTerrainProvider({
      url: terrainUrl,
      requestWaterMask: true,
      requestVertexNormals: true
    });
  }, [terrainUrl]);

  return (
    <div className="cesium-viewer-container">
      <div ref={cesiumContainer} className="cesium-viewer" />
      {isReady && children && (
        <div className="cesium-overlay">
          {children}
        </div>
      )}
    </div>
  );
};

export default CesiumViewer;
