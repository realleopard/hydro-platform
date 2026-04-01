import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

/**
 * 水文实体组件 - 用于渲染河流、湖泊、水库、测站等水文要素
 */
const HydrologyEntities = ({ viewer, data, onEntityClick }) => {
  const entitiesRef = useRef([]);

  useEffect(() => {
    if (!viewer || !data) return;

    // 清除现有实体
    clearEntities();

    // 渲染河流
    if (data.rivers) {
      renderRivers(data.rivers);
    }

    // 渲染湖泊/水库
    if (data.lakes) {
      renderLakes(data.lakes);
    }

    // 渲染测站
    if (data.stations) {
      renderStations(data.stations);
    }

    // 渲染流域边界
    if (data.basins) {
      renderBasins(data.basins);
    }

    // 点击事件处理
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((click) => {
      const pickedObject = viewer.scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entity = pickedObject.id;
        if (entity.hydroType && onEntityClick) {
          onEntityClick({
            type: entity.hydroType,
            id: entity.hydroId,
            name: entity.name,
            properties: entity.properties?.getValue(Cesium.JulianDate.now())
          });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      clearEntities();
      handler.destroy();
    };
  }, [viewer, data]);

  // 渲染河流
  const renderRivers = (rivers) => {
    rivers.forEach(river => {
      const positions = river.coordinates.map(coord =>
        Cesium.Cartesian3.fromDegrees(coord.longitude, coord.latitude, coord.height || 0)
      );

      const entity = viewer.entities.add({
        name: river.name,
        hydroType: 'river',
        hydroId: river.id,
        properties: {
          ...river.properties,
          length: river.length,
          basinArea: river.basinArea
        },
        polyline: {
          positions: positions,
          width: river.width || 3,
          material: new Cesium.ColorMaterialProperty(
            Cesium.Color.fromCssColorString(river.color || '#0066cc')
          ),
          clampToGround: true
        }
      });

      entitiesRef.current.push(entity);
    });
  };

  // 渲染湖泊/水库
  const renderLakes = (lakes) => {
    lakes.forEach(lake => {
      const hierarchy = lake.coordinates.map(coord =>
        Cesium.Cartesian3.fromDegrees(coord.longitude, coord.latitude)
      );

      const entity = viewer.entities.add({
        name: lake.name,
        hydroType: 'lake',
        hydroId: lake.id,
        properties: {
          ...lake.properties,
          area: lake.area,
          capacity: lake.capacity,
          waterLevel: lake.waterLevel
        },
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(hierarchy),
          material: Cesium.Color.fromCssColorString(lake.color || '#00aaff').withAlpha(0.6),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });

      entitiesRef.current.push(entity);
    });
  };

  // 渲染测站
  const renderStations = (stations) => {
    stations.forEach(station => {
      let entity;

      if (station.type === 'rainfall') {
        // 降雨测站 - 使用圆柱体
        entity = viewer.entities.add({
          name: station.name,
          hydroType: 'station',
          hydroId: station.id,
          properties: {
            ...station.properties,
            type: station.type,
            value: station.value
          },
          position: Cesium.Cartesian3.fromDegrees(
            station.longitude,
            station.latitude,
            station.height || 100
          ),
          cylinder: {
            length: 200,
            topRadius: 500,
            bottomRadius: 500,
            material: Cesium.Color.fromCssColorString(getRainfallColor(station.value)),
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          },
          label: {
            text: `${station.value?.toFixed(1) || '--'}mm`,
            font: '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            show: true
          }
        });
      } else if (station.type === 'flow') {
        // 流量测站 - 使用圆锥体
        entity = viewer.entities.add({
          name: station.name,
          hydroType: 'station',
          hydroId: station.id,
          properties: {
            ...station.properties,
            type: station.type,
            value: station.value
          },
          position: Cesium.Cartesian3.fromDegrees(
            station.longitude,
            station.latitude,
            station.height || 100
          ),
          cone: {
            length: 300,
            topRadius: 0,
            bottomRadius: 400,
            material: Cesium.Color.fromCssColorString(getFlowColor(station.value)),
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          },
          label: {
            text: `${station.value?.toFixed(1) || '--'}m³/s`,
            font: '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            show: true
          }
        });
      } else {
        // 普通测站 - 使用点
        entity = viewer.entities.add({
          name: station.name,
          hydroType: 'station',
          hydroId: station.id,
          properties: station.properties,
          position: Cesium.Cartesian3.fromDegrees(
            station.longitude,
            station.latitude,
            station.height || 0
          ),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString(station.color || '#ff6600'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
          },
          label: {
            text: station.name,
            font: '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            show: true
          }
        });
      }

      entitiesRef.current.push(entity);
    });
  };

  // 渲染流域边界
  const renderBasins = (basins) => {
    basins.forEach(basin => {
      const hierarchy = basin.coordinates.map(coord =>
        Cesium.Cartesian3.fromDegrees(coord.longitude, coord.latitude)
      );

      const entity = viewer.entities.add({
        name: basin.name,
        hydroType: 'basin',
        hydroId: basin.id,
        properties: {
          ...basin.properties,
          area: basin.area,
          outlet: basin.outlet
        },
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(hierarchy),
          material: Cesium.Color.fromCssColorString(basin.color || '#2d5016').withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(basin.color || '#2d5016'),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });

      entitiesRef.current.push(entity);
    });
  };

  // 清除所有实体
  const clearEntities = () => {
    entitiesRef.current.forEach(entity => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.entities.remove(entity);
      }
    });
    entitiesRef.current = [];
  };

  // 辅助函数：根据降雨量获取颜色
  const getRainfallColor = (value) => {
    if (!value) return '#66ccff';
    if (value < 10) return '#66ccff';
    if (value < 25) return '#00aaff';
    if (value < 50) return '#0066cc';
    if (value < 100) return '#ffcc00';
    return '#ff6600';
  };

  // 辅助函数：根据流量获取颜色
  const getFlowColor = (value) => {
    if (!value) return '#00cc66';
    if (value < 100) return '#00cc66';
    if (value < 500) return '#66cc00';
    if (value < 1000) return '#cccc00';
    if (value < 5000) return '#cc6600';
    return '#cc0000';
  };

  return null;
};

export default HydrologyEntities;
