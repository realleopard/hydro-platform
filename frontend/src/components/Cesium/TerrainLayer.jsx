import React, { useEffect, useState } from 'react';
import * as Cesium from 'cesium';

/**
 * 地形图层组件 - 管理地形数据加载
 */
const TerrainLayer = ({ viewer, terrainUrl, options = {} }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!viewer) return;

    const loadTerrain = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (terrainUrl) {
          // 加载自定义地形
          const terrainProvider = new Cesium.CesiumTerrainProvider({
            url: terrainUrl,
            requestWaterMask: options.requestWaterMask ?? true,
            requestVertexNormals: options.requestVertexNormals ?? true,
            ...options
          });

          await terrainProvider.readyPromise;
          viewer.terrainProvider = terrainProvider;
        } else {
          // 使用默认世界地形
          viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
            url: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
            requestWaterMask: options.requestWaterMask ?? true,
            requestVertexNormals: options.requestVertexNormals ?? true
          });
        }

        // 配置地形显示选项
        if (viewer.scene.globe) {
          viewer.scene.globe.depthTestAgainstTerrain = options.depthTestAgainstTerrain ?? true;
          viewer.scene.globe.enableLighting = options.enableLighting ?? true;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('地形加载失败:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadTerrain();

    return () => {
      // 清理时恢复默认地形
      if (viewer && !viewer.isDestroyed()) {
        viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
          url: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
          requestWaterMask: true,
          requestVertexNormals: true
        });
      }
    };
  }, [viewer, terrainUrl, options]);

  // 显示加载状态
  if (isLoading) {
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '4px',
        zIndex: 1000
      }}>
        加载地形数据...
      </div>
    );
  }

  // 显示错误
  if (error) {
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(255, 0, 0, 0.7)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '4px',
        zIndex: 1000
      }}>
        地形加载失败: {error}
      </div>
    );
  }

  return null;
};

export default TerrainLayer;
