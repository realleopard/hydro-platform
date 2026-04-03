import React, { useMemo } from 'react';
import './Legend.css';

const COLORMAPS = {
  jet: (ratio) => {
    const r = Math.round(Math.max(0, Math.min(255, ratio < 0.5 ? 0 : (ratio - 0.5) * 2 * 255)));
    const g = Math.round(Math.max(0, Math.min(255, ratio < 0.25 ? ratio * 4 * 255 : ratio < 0.75 ? 255 : (1 - ratio) * 4 * 255)));
    const b = Math.round(Math.max(0, Math.min(255, ratio < 0.5 ? (0.5 - ratio) * 2 * 255 : 0)));
    return `rgb(${r},${g},${b})`;
  },
  hot: (ratio) => {
    return `rgb(${Math.round(ratio * 255)},0,${Math.round((1 - ratio) * 255)})`;
  },
  cool: (ratio) => {
    return `rgb(${Math.round((1 - ratio) * 128)},${Math.round(ratio * 255)},${Math.round((1 - ratio) * 255 + ratio * 128)})`;
  },
  rainfall: (ratio) => {
    if (ratio < 0.2) return '#66ccff';
    if (ratio < 0.4) return '#00aaff';
    if (ratio < 0.6) return '#0066cc';
    if (ratio < 0.8) return '#ffcc00';
    return '#ff6600';
  },
  waterLevel: (ratio) => {
    if (ratio < 0.25) return '#2d5016';
    if (ratio < 0.5) return '#8b7355';
    if (ratio < 0.75) return '#c4a35a';
    return '#8b0000';
  },
  flow: (ratio) => {
    const colors = ['#0066cc', '#00aaff', '#66ccff', '#ffcc00', '#ff6600', '#cc0000'];
    return colors[Math.min(Math.floor(ratio * colors.length), colors.length - 1)];
  },
};

const formatValue = (val) => {
  if (val == null) return '';
  if (Math.abs(val) >= 1000) return val.toFixed(0);
  if (Math.abs(val) >= 1) return val.toFixed(1);
  return val.toFixed(2);
};

const Legend = ({ colormap = 'jet', min = 0, max = 100, unit = '', title, mode = 'continuous', items }) => {
  const gradientStops = useMemo(() => {
    if (mode === 'category' && items) return null;
    const steps = 20;
    const fn = COLORMAPS[colormap] || COLORMAPS.jet;
    const stops = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      stops.push(`${fn(ratio)} ${(ratio * 100).toFixed(1)}%`);
    }
    return `linear-gradient(to top, ${stops.join(', ')})`;
  }, [colormap, mode, items]);

  if (mode === 'category' && items) {
    return (
      <div className="legend-container">
        {title && <div className="legend-title">{title}</div>}
        <div className="legend-category-list">
          {items.map((item, i) => (
            <div key={i} className="legend-category-item">
              <span className="legend-category-swatch" style={{ background: item.color }} />
              <span className="legend-category-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="legend-container">
      {title && <div className="legend-title">{title}</div>}
      <div className="legend-bar-wrapper">
        <div className="legend-label legend-label-max">{formatValue(max)}</div>
        <div className="legend-bar" style={{ background: gradientStops }} />
        <div className="legend-label legend-label-min">{formatValue(min)}</div>
      </div>
      {unit && <div className="legend-unit">{unit}</div>}
    </div>
  );
};

export default Legend;
