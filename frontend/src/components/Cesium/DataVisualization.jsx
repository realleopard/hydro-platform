import React, { useEffect, useRef, useCallback } from 'react';
import * as Cesium from 'cesium';

/**
 * 数据可视化组件 - 用于渲染1D/2D水文数据结果
 */
const DataVisualization = ({ viewer, type, data, options = {} }) => {
  const dataSourcesRef = useRef([]);
  const primitivesRef = useRef([]);

  // 渲染1D河流数据（线图）
  const render1DRiverData = useCallback((riverData, opts = {}) => {
    if (!viewer || !riverData?.points?.length) return;

    const { color = '#0066cc', width = 3, property = 'flow' } = opts;

    // 创建沿线段
    const points = riverData.points.map(p =>
      Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.height || 0)
    );

    const polyline = viewer.scene.primitives.add(new Cesium.PolylineCollection());
    polyline.add({
      positions: points,
      width: width,
      material: Cesium.Material.fromType('Color', {
        color: Cesium.Color.fromCssColorString(color)
      })
    });

    primitivesRef.current.push(polyline);

    // 添加数据点标记
    riverData.points.forEach((point, index) => {
      if (point.value !== undefined) {
        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            point.longitude,
            point.latitude,
            (point.height || 0) + 10
          ),
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString(getColorByValue(point.value, riverData.min, riverData.max)),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1
          },
          label: {
            text: `${point.value.toFixed(2)}`,
            font: '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            show: options.showLabels !== false
          }
        });
        dataSourcesRef.current.push(entity);
      }
    });
  }, [viewer, options.showLabels]);

  // 渲染2D栅格数据（热力图样式）
  const render2DGridData = useCallback((gridData, opts = {}) => {
    if (!viewer || !gridData?.grid?.length) return;

    const { colormap = 'jet', opacity = 0.7 } = opts;

    gridData.grid.forEach(cell => {
      const { longitude, latitude, value, size = 100 } = cell;
      const color = getColorFromColormap(value, gridData.min, gridData.max, colormap);

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(
            longitude - size / 2,
            latitude - size / 2,
            longitude + size / 2,
            latitude + size / 2
          ),
          material: Cesium.Color.fromCssColorString(color).withAlpha(opacity),
          outline: true,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      dataSourcesRef.current.push(entity);
    });
  }, [viewer]);

  // 渲染降雨分布
  const renderRainfallData = useCallback((rainfallData, opts = {}) => {
    if (!viewer || !rainfallData?.stations?.length) return;

    const { minRadius = 1000, maxRadius = 10000 } = opts;

    rainfallData.stations.forEach(station => {
      const { longitude, latitude, rainfall } = station;
      const normalizedValue = (rainfall - rainfallData.min) / (rainfallData.max - rainfallData.min);
      const radius = minRadius + normalizedValue * (maxRadius - minRadius);
      const color = getRainfallColor(rainfall, rainfallData.max);

      const entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
        ellipse: {
          semiMinorAxis: radius,
          semiMajorAxis: radius,
          material: Cesium.Color.fromCssColorString(color).withAlpha(0.5),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
          text: `${rainfall.toFixed(1)}mm`,
          font: '11px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          show: options.showLabels !== false
        }
      });
      dataSourcesRef.current.push(entity);
    });
  }, [viewer, options.showLabels]);

  // 渲染水位等值面
  const renderWaterLevelContours = useCallback((contourData, opts = {}) => {
    if (!viewer || !contourData?.contours?.length) return;

    const { opacity = 0.6 } = opts;

    contourData.contours.forEach(contour => {
      const { level, polygons } = contour;
      const color = getWaterLevelColor(level, contourData.minLevel, contourData.maxLevel);

      polygons.forEach(polygon => {
        const hierarchy = polygon.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude));

        const entity = viewer.entities.add({
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(hierarchy),
            material: Cesium.Color.fromCssColorString(color).withAlpha(opacity),
            outline: true,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.5),
            outlineWidth: 1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          }
        });
        dataSourcesRef.current.push(entity);
      });
    });
  }, [viewer]);

  // 渲染流向矢量
  const renderFlowVectors = useCallback((flowData, opts = {}) => {
    if (!viewer || !flowData?.vectors?.length) return;

    const { scale = 1000, color = '#00aaff' } = opts;

    flowData.vectors.forEach(vector => {
      const { longitude, latitude, direction, magnitude } = vector;

      // 计算终点
      const rad = Cesium.Math.toRadians(direction);
      const endLon = longitude + Math.sin(rad) * magnitude * scale / 111000;
      const endLat = latitude + Math.cos(rad) * magnitude * scale / 111000;

      const entity = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            longitude, latitude,
            endLon, endLat
          ]),
          width: 2 + magnitude * 2,
          material: new Cesium.PolylineArrowMaterialProperty(
            Cesium.Color.fromCssColorString(color)
          ),
          clampToGround: true
        }
      });
      dataSourcesRef.current.push(entity);
    });
  }, [viewer]);

  // 辅助函数：根据值获取颜色
  const getColorByValue = (value, min, max) => {
    const ratio = (value - min) / (max - min);
    const colors = ['#0066cc', '#00aaff', '#66ccff', '#ffcc00', '#ff6600', '#cc0000'];
    const index = Math.min(Math.floor(ratio * colors.length), colors.length - 1);
    return colors[index];
  };

  // 辅助函数：从色带获取颜色
  const getColorFromColormap = (value, min, max, colormap) => {
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

    switch (colormap) {
      case 'jet':
        return getJetColor(ratio);
      case 'hot':
        return getHotColor(ratio);
      case 'cool':
        return getCoolColor(ratio);
      default:
        return getJetColor(ratio);
    }
  };

  const getJetColor = (ratio) => {
    const r = Math.max(0, Math.min(255, ratio < 0.5 ? 0 : (ratio - 0.5) * 2 * 255));
    const g = Math.max(0, Math.min(255, ratio < 0.25 ? ratio * 4 * 255 :
      ratio < 0.75 ? 255 : (1 - ratio) * 4 * 255));
    const b = Math.max(0, Math.min(255, ratio < 0.5 ? (0.5 - ratio) * 2 * 255 : 0));
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  };

  const getHotColor = (ratio) => {
    const r = Math.round(ratio * 255);
    const g = 0;
    const b = Math.round((1 - ratio) * 255);
    return `rgb(${r},${g},${b})`;
  };

  const getCoolColor = (ratio) => {
    const r = Math.round((1 - ratio) * 128);
    const g = Math.round(ratio * 255);
    const b = Math.round((1 - ratio) * 255 + ratio * 128);
    return `rgb(${r},${g},${b})`;
  };

  const getRainfallColor = (rainfall, max) => {
    const ratio = rainfall / max;
    if (ratio < 0.2) return '#66ccff';
    if (ratio < 0.4) return '#00aaff';
    if (ratio < 0.6) return '#0066cc';
    if (ratio < 0.8) return '#ffcc00';
    return '#ff6600';
  };

  const getWaterLevelColor = (level, min, max) => {
    const ratio = (level - min) / (max - min);
    if (ratio < 0.25) return '#2d5016';
    if (ratio < 0.5) return '#8b7355';
    if (ratio < 0.75) return '#c4a35a';
    return '#8b0000';
  };

  // 清除所有可视化
  const clearVisualization = useCallback(() => {
    dataSourcesRef.current.forEach(entity => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.entities.remove(entity);
      }
    });
    dataSourcesRef.current = [];

    primitivesRef.current.forEach(primitive => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.scene.primitives.remove(primitive);
      }
    });
    primitivesRef.current = [];
  }, [viewer]);

  useEffect(() => {
    if (!viewer || !data) return;

    // 清除现有可视化
    clearVisualization();

    // 根据类型渲染数据
    switch (type) {
      case 'river1d':
        render1DRiverData(data, options);
        break;
      case 'grid2d':
        render2DGridData(data, options);
        break;
      case 'rainfall':
        renderRainfallData(data, options);
        break;
      case 'waterLevel':
        renderWaterLevelContours(data, options);
        break;
      case 'flowVector':
        renderFlowVectors(data, options);
        break;
      default:
        break;
    }

    return () => {
      clearVisualization();
    };
  }, [viewer, type, data, options, render1DRiverData, render2DGridData,
      renderRainfallData, renderWaterLevelContours, renderFlowVectors, clearVisualization]);

  return null;
};

export default DataVisualization;
