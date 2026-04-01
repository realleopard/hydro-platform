import React, { useEffect, useState, useCallback } from 'react';
import * as Cesium from 'cesium';

/**
 * 影像图层组件 - 管理卫星影像和底图
 */
const ImageryLayer = ({ viewer, layers = [], defaultLayer = 'bing' }) => {
  const [activeLayers, setActiveLayers] = useState([]);

  // 预定义的影像图层配置
  const imageryProviders = {
    bing: {
      name: 'Bing Maps 卫星影像',
      create: () => new Cesium.BingMapsImageryProvider({
        key: '',
        mapStyle: Cesium.BingMapsStyle.AERIAL
      })
    },
    bingLabels: {
      name: 'Bing Maps 带标注',
      create: () => new Cesium.BingMapsImageryProvider({
        key: '',
        mapStyle: Cesium.BingMapsStyle.AERIAL_WITH_LABELS
      })
    },
    osm: {
      name: 'OpenStreetMap',
      create: () => new Cesium.OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
      })
    },
    sentinel: {
      name: 'Sentinel-2 卫星影像',
      create: () => new Cesium.IonImageryProvider({ assetId: 3954 })
    },
    esriWorldImagery: {
      name: 'Esri World 影像',
      create: () => new Cesium.ArcGisMapServerImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
      })
    },
    esriWorldStreet: {
      name: 'Esri World 街道',
      create: () => new Cesium.ArcGisMapServerImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer'
      })
    },
    naturalEarth: {
      name: 'Natural Earth II',
      create: () => new Cesium.IonImageryProvider({ assetId: 3 })
    }
  };

  // 添加影像图层
  const addImageryLayer = useCallback((layerConfig) => {
    if (!viewer) return null;

    let provider;

    if (typeof layerConfig === 'string' && imageryProviders[layerConfig]) {
      provider = imageryProviders[layerConfig].create();
    } else if (layerConfig.url) {
      // 自定义 URL
      provider = new Cesium.UrlTemplateImageryProvider({
        url: layerConfig.url,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        ...layerConfig.options
      });
    } else if (layerConfig.assetId) {
      // Cesium Ion asset
      provider = new Cesium.IonImageryProvider({ assetId: layerConfig.assetId });
    }

    if (provider) {
      const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);

      // 设置图层属性
      if (layerConfig.alpha !== undefined) {
        imageryLayer.alpha = layerConfig.alpha;
      }
      if (layerConfig.brightness !== undefined) {
        imageryLayer.brightness = layerConfig.brightness;
      }
      if (layerConfig.contrast !== undefined) {
        imageryLayer.contrast = layerConfig.contrast;
      }
      if (layerConfig.show !== undefined) {
        imageryLayer.show = layerConfig.show;
      }

      return imageryLayer;
    }

    return null;
  }, [viewer]);

  // 移除影像图层
  const removeImageryLayer = useCallback((layer) => {
    if (!viewer || !viewer.isDestroyed()) {
      viewer.imageryLayers.remove(layer);
    }
  }, [viewer]);

  // 初始化默认图层
  useEffect(() => {
    if (!viewer) return;

    // 清除现有图层（保留第一个基础图层）
    while (viewer.imageryLayers.length > 1) {
      viewer.imageryLayers.remove(viewer.imageryLayers.get(viewer.imageryLayers.length - 1));
    }

    // 添加默认图层
    if (defaultLayer && imageryProviders[defaultLayer]) {
      const defaultImageryLayer = addImageryLayer(defaultLayer);
      if (defaultImageryLayer) {
        // 将默认图层移到最底层
        viewer.imageryLayers.lowerToBottom(defaultImageryLayer);
      }
    }

    // 添加其他图层
    const newLayers = [];
    layers.forEach(layerConfig => {
      const layer = addImageryLayer(layerConfig);
      if (layer) {
        newLayers.push({ config: layerConfig, cesiumLayer: layer });
      }
    });

    setActiveLayers(newLayers);

    return () => {
      // 清理时只移除我们添加的图层
      newLayers.forEach(({ cesiumLayer }) => {
        removeImageryLayer(cesiumLayer);
      });
    };
  }, [viewer, defaultLayer, layers, addImageryLayer, removeImageryLayer]);

  // 控制面板组件
  const LayerControl = () => {
    const [selectedLayer, setSelectedLayer] = useState(defaultLayer);

    const handleLayerChange = (layerKey) => {
      setSelectedLayer(layerKey);

      // 移除所有现有图层
      while (viewer.imageryLayers.length > 0) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
      }

      // 添加选中的图层
      const newLayer = addImageryLayer(layerKey);
      if (newLayer) {
        setActiveLayers([{ config: layerKey, cesiumLayer: newLayer }]);
      }
    };

    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '12px',
        borderRadius: '8px',
        color: 'white',
        zIndex: 100
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>影像图层</h4>
        <select
          value={selectedLayer}
          onChange={(e) => handleLayerChange(e.target.value)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          {Object.entries(imageryProviders).map(([key, provider]) => (
            <option key={key} value={key} style={{ background: '#333' }}>
              {provider.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return viewer ? <LayerControl /> : null;
};

export default ImageryLayer;
