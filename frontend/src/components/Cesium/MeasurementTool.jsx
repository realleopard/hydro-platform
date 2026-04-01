import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import './MeasurementTool.css';

/**
 * 测量工具组件 - 用于距离、面积、高度测量
 */
const MeasurementTool = ({ viewer, onMeasurementComplete }) => {
  const [activeTool, setActiveTool] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [currentMeasurement, setCurrentMeasurement] = useState(null);
  const handlerRef = useRef(null);
  const entitiesRef = useRef([]);

  // 清除当前测量
  const clearCurrentMeasurement = useCallback(() => {
    entitiesRef.current.forEach(entity => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.entities.remove(entity);
      }
    });
    entitiesRef.current = [];
    setCurrentMeasurement(null);
  }, [viewer]);

  // 计算两点间距离
  const calculateDistance = useCallback((point1, point2) => {
    const cart1 = Cesium.Cartesian3.fromDegrees(point1.longitude, point1.latitude, point1.height || 0);
    const cart2 = Cesium.Cartesian3.fromDegrees(point2.longitude, point2.latitude, point2.height || 0);
    return Cesium.Cartesian3.distance(cart1, cart2);
  }, []);

  // 计算多边形面积
  const calculateArea = useCallback((points) => {
    if (points.length < 3) return 0;

    const cartesianPoints = points.map(p =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.height || 0)
    );

    // 使用海伦公式计算面积
    let area = 0;
    const center = Cesium.Cartesian3.ZERO;
    cartesianPoints.forEach(p => {
      Cesium.Cartesian3.add(p, center, center);
    });
    Cesium.Cartesian3.divideByScalar(center, cartesianPoints.length, center);

    for (let i = 0; i < cartesianPoints.length; i++) {
      const j = (i + 1) % cartesianPoints.length;
      const v1 = Cesium.Cartesian3.subtract(cartesianPoints[i], center, new Cesium.Cartesian3());
      const v2 = Cesium.Cartesian3.subtract(cartesianPoints[j], center, new Cesium.Cartesian3());
      const cross = Cesium.Cartesian3.cross(v1, v2, new Cesium.Cartesian3());
      area += Cesium.Cartesian3.magnitude(cross) / 2;
    }

    return area;
  }, []);

  // 开始距离测量
  const startDistanceMeasurement = useCallback(() => {
    if (!viewer) return;

    const points = [];
    let polylineEntity = null;
    let labels = [];

    handlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    // 左键点击添加点
    handlerRef.current.setInputAction((click) => {
      const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const point = {
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
      };
      points.push(point);

      // 添加点标记
      const pointEntity = viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 10,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2
        }
      });
      entitiesRef.current.push(pointEntity);

      // 更新线段
      if (points.length > 1) {
        if (polylineEntity) {
          viewer.entities.remove(polylineEntity);
        }

        const positions = points.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude));
        polylineEntity = viewer.entities.add({
          polyline: {
            positions: positions,
            width: 3,
            material: Cesium.Color.YELLOW,
            clampToGround: true
          }
        });
        entitiesRef.current.push(polylineEntity);

        // 计算总距离
        let totalDistance = 0;
        for (let i = 1; i < points.length; i++) {
          totalDistance += calculateDistance(points[i - 1], points[i]);
        }

        // 更新或添加总距离标签
        labels.forEach(label => viewer.entities.remove(label));
        labels = [];

        const midPoint = points[Math.floor(points.length / 2)];
        const labelEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(midPoint.longitude, midPoint.latitude, 100),
          label: {
            text: formatDistance(totalDistance),
            font: '14px sans-serif',
            fillColor: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM
          }
        });
        labels.push(labelEntity);
        entitiesRef.current.push(labelEntity);

        setCurrentMeasurement({
          type: 'distance',
          value: totalDistance,
          points: [...points]
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 右键完成测量
    handlerRef.current.setInputAction(() => {
      if (points.length >= 2) {
        const measurement = {
          id: Date.now(),
          type: 'distance',
          value: currentMeasurement?.value || 0,
          points: [...points],
          timestamp: new Date().toISOString()
        };
        setMeasurements(prev => [...prev, measurement]);
        onMeasurementComplete?.(measurement);
      }
      stopMeasurement();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }, [viewer, calculateDistance, currentMeasurement, onMeasurementComplete]);

  // 开始面积测量
  const startAreaMeasurement = useCallback(() => {
    if (!viewer) return;

    const points = [];
    let polygonEntity = null;

    handlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    handlerRef.current.setInputAction((click) => {
      const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const point = {
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height
      };
      points.push(point);

      // 添加点标记
      const pointEntity = viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 10,
          color: Cesium.Color.GREEN,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2
        }
      });
      entitiesRef.current.push(pointEntity);

      // 更新多边形
      if (points.length >= 3) {
        if (polygonEntity) {
          viewer.entities.remove(polygonEntity);
        }

        const hierarchy = points.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude));
        const area = calculateArea(points);

        polygonEntity = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(hierarchy),
            material: Cesium.Color.GREEN.withAlpha(0.3),
            outline: true,
            outlineColor: Cesium.Color.GREEN,
            outlineWidth: 2
          },
          label: {
            text: formatArea(area),
            font: '14px sans-serif',
            fillColor: Cesium.Color.GREEN,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.CENTER
          }
        });
        entitiesRef.current.push(polygonEntity);

        setCurrentMeasurement({
          type: 'area',
          value: area,
          points: [...points]
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handlerRef.current.setInputAction(() => {
      if (points.length >= 3) {
        const measurement = {
          id: Date.now(),
          type: 'area',
          value: currentMeasurement?.value || 0,
          points: [...points],
          timestamp: new Date().toISOString()
        };
        setMeasurements(prev => [...prev, measurement]);
        onMeasurementComplete?.(measurement);
      }
      stopMeasurement();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }, [viewer, calculateArea, currentMeasurement, onMeasurementComplete]);

  // 开始高度测量
  const startHeightMeasurement = useCallback(() => {
    if (!viewer) return;

    handlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    handlerRef.current.setInputAction((click) => {
      const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
      if (!cartesian) return;

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const terrainHeight = cartographic.height;

      // 添加标记点
      const pointEntity = viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 10,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2
        },
        label: {
          text: `海拔: ${terrainHeight.toFixed(2)}m`,
          font: '14px sans-serif',
          fillColor: Cesium.Color.RED,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -15)
        }
      });
      entitiesRef.current.push(pointEntity);

      const measurement = {
        id: Date.now(),
        type: 'height',
        value: terrainHeight,
        point: {
          longitude: Cesium.Math.toDegrees(cartographic.longitude),
          latitude: Cesium.Math.toDegrees(cartographic.latitude),
          height: terrainHeight
        },
        timestamp: new Date().toISOString()
      };

      setMeasurements(prev => [...prev, measurement]);
      onMeasurementComplete?.(measurement);

      // 高度测量一次完成
      stopMeasurement();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }, [viewer, onMeasurementComplete]);

  // 停止测量
  const stopMeasurement = useCallback(() => {
    if (handlerRef.current) {
      handlerRef.current.destroy();
      handlerRef.current = null;
    }
    setActiveTool(null);
    clearCurrentMeasurement();
  }, [clearCurrentMeasurement]);

  // 切换工具
  const toggleTool = useCallback((tool) => {
    if (activeTool === tool) {
      stopMeasurement();
    } else {
      stopMeasurement();
      setActiveTool(tool);

      switch (tool) {
        case 'distance':
          startDistanceMeasurement();
          break;
        case 'area':
          startAreaMeasurement();
          break;
        case 'height':
          startHeightMeasurement();
          break;
        default:
          break;
      }
    }
  }, [activeTool, stopMeasurement, startDistanceMeasurement, startAreaMeasurement, startHeightMeasurement]);

  // 清除所有测量
  const clearAllMeasurements = useCallback(() => {
    measurements.forEach(() => {
      // 这里可以根据需要清理已保存的测量实体
    });
    setMeasurements([]);
    clearCurrentMeasurement();
  }, [measurements, clearCurrentMeasurement]);

  // 格式化距离
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(2)} m`;
  };

  // 格式化面积
  const formatArea = (squareMeters) => {
    if (squareMeters >= 1000000) {
      return `${(squareMeters / 1000000).toFixed(2)} km²`;
    }
    if (squareMeters >= 10000) {
      return `${(squareMeters / 10000).toFixed(2)} 公顷`;
    }
    return `${squareMeters.toFixed(2)} m²`;
  };

  useEffect(() => {
    return () => {
      stopMeasurement();
    };
  }, [stopMeasurement]);

  return (
    <div className="measurement-tool">
      <div className="measurement-header">📏 测量工具</div>
      <div className="measurement-buttons">
        <button
          className={`measure-btn ${activeTool === 'distance' ? 'active' : ''}`}
          onClick={() => toggleTool('distance')}
          title="距离测量 (左键添加点，右键完成)"
        >
          📏 距离
        </button>
        <button
          className={`measure-btn ${activeTool === 'area' ? 'active' : ''}`}
          onClick={() => toggleTool('area')}
          title="面积测量 (左键添加点，右键完成)"
        >
          ⬡ 面积
        </button>
        <button
          className={`measure-btn ${activeTool === 'height' ? 'active' : ''}`}
          onClick={() => toggleTool('height')}
          title="高度测量"
        >
          ⛰️ 高度
        </button>
      </div>

      {measurements.length > 0 && (
        <div className="measurement-results">
          <div className="results-header">
            <span>测量结果</span>
            <button className="clear-btn" onClick={clearAllMeasurements}>
              清除全部
            </button>
          </div>
          <ul className="measurement-list">
            {measurements.map((m, index) => (
              <li key={m.id} className="measurement-item">
                <span className="measurement-index">#{index + 1}</span>
                <span className="measurement-type">
                  {m.type === 'distance' ? '📏' : m.type === 'area' ? '⬡' : '⛰️'}
                </span>
                <span className="measurement-value">
                  {m.type === 'distance'
                    ? formatDistance(m.value)
                    : m.type === 'area'
                    ? formatArea(m.value)
                    : `${m.value.toFixed(2)}m`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTool && (
        <div className="measurement-hint">
          {activeTool === 'distance' && '左键添加点，右键完成测量'}
          {activeTool === 'area' && '左键添加点（至少3个），右键完成测量'}
          {activeTool === 'height' && '左键点击测量海拔高度'}
        </div>
      )}
    </div>
  );
};

export default MeasurementTool;
