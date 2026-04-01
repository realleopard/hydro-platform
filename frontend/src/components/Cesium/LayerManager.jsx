import React, { useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import './LayerManager.css';

const LayerManager = ({ viewer }) => {
  const [layers, setLayers] = useState([
    { id: 'terrain', name: '地形', visible: true, type: 'terrain' },
    { id: 'satellite', name: '卫星影像', visible: true, type: 'imagery' },
    { id: 'rivers', name: '河网', visible: false, type: 'vector' },
    { id: 'basins', name: '流域边界', visible: false, type: 'vector' }
  ]);

  const [expanded, setExpanded] = useState(true);

  const toggleLayer = useCallback((layerId) => {
    if (!viewer) return;

    setLayers(prev => prev.map(layer => {
      if (layer.id === layerId) {
        const newVisible = !layer.visible;

        // 根据图层类型控制显示
        switch (layer.type) {
          case 'terrain':
            viewer.scene.globe.show = newVisible;
            break;
          case 'imagery':
            viewer.imageryLayers.get(0).show = newVisible;
            break;
          default:
            // 自定义图层的显示逻辑
            break;
        }

        return { ...layer, visible: newVisible };
      }
      return layer;
    }));
  }, [viewer]);

  const addRasterLayer = useCallback((url, name) => {
    if (!viewer) return;

    const imageryLayer = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: url,
        tilingScheme: new Cesium.WebMercatorTilingScheme()
      })
    );

    setLayers(prev => [...prev, {
      id: `layer-${Date.now()}`,
      name: name,
      visible: true,
      type: 'imagery',
      cesiumLayer: imageryLayer
    }]);
  }, [viewer]);

  const removeLayer = useCallback((layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer?.cesiumLayer && viewer) {
      viewer.imageryLayers.remove(layer.cesiumLayer);
    }
    setLayers(prev => prev.filter(l => l.id !== layerId));
  }, [layers, viewer]);

  const changeLayerOpacity = useCallback((layerId, opacity) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer?.cesiumLayer && viewer) {
      layer.cesiumLayer.alpha = opacity;
    }
  }, [layers, viewer]);

  if (!viewer) return null;

  return (
    <div className={`layer-manager ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="layer-manager-header" onClick={() => setExpanded(!expanded)}>
        <span className="layer-manager-title">🗺️ 图层管理</span>
        <span className="toggle-icon">{expanded ? '◀' : '▶'}</span>
      </div>

      {expanded && (
        <div className="layer-manager-content">
          <div className="layer-list">
            {layers.map(layer => (
              <div key={layer.id} className="layer-item">
                <label className="layer-checkbox">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => toggleLayer(layer.id)}
                  />
                  <span className="checkmark"></span>
                  <span className="layer-name">{layer.name}</span>
                </label>

                {layer.visible && layer.type === 'imagery' && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    defaultValue="1"
                    className="opacity-slider"
                    onChange={(e) => changeLayerOpacity(layer.id, parseFloat(e.target.value))}
                    title="透明度"
                  />
                )}

                {layer.cesiumLayer && (
                  <button
                    className="remove-layer-btn"
                    onClick={() => removeLayer(layer.id)}
                    title="移除图层"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="layer-actions">
            <button
              className="add-layer-btn"
              onClick={() => {
                // 示例：添加 OpenStreetMap 图层
                addRasterLayer(
                  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'OpenStreetMap'
                );
              }}
            >
              + 添加 OSM 图层
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayerManager;
