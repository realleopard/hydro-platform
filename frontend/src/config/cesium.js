// Cesium 配置

// To obtain a Cesium Ion access token:
// 1. Sign up at https://cesium.com/ion/
// 2. Go to "Access Tokens" in your dashboard
// 3. Create a new token or copy the default one
// 4. Set it as the REACT_APP_CESIUM_ION_TOKEN environment variable
//    (e.g. in a .env file at the project root):
//      REACT_APP_CESIUM_ION_TOKEN=your_token_here
//
// The application will still start without a valid token, but terrain
// and imagery layers that depend on Cesium Ion will be unavailable.
const ionToken = process.env.REACT_APP_CESIUM_ION_TOKEN || '';

export const CESIUM_CONFIG = {
  // Cesium Ion access token - required for Cesium World Terrain and Ion imagery
  ionToken,

  // Default view centered on the Yangtze River middle reach (长江中游)
  defaultView: {
    longitude: 111.5,
    latitude: 30.5,
    height: 2000000, // 2000 km overview
    heading: 0,
    pitch: -45,
    roll: 0
  },

  // 地形配置 — 使用 STK terrain (不需要 Ion token)
  terrain: {
    url: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
    requestWaterMask: true,
    requestVertexNormals: true
  },

  // 影像图层 — OSM 不需要认证
  imageryLayers: [
    {
      name: 'OpenStreetMap',
      provider: 'OSM',
      url: 'https://a.tile.openstreetmap.org/'
    },
    {
      name: 'Bing Maps 卫星影像',
      provider: 'BingMaps',
      key: 'bingMapsKey'
    },
  ],

  // 性能配置
  performance: {
    maximumScreenSpaceError: 2,
    maximumMemoryUsage: 512, // MB
    preloadAncestors: true,
    preloadSiblings: true
  }
};

// 颜色配置
export const HYDRO_COLORS = {
  water: '#0066cc',
  waterDeep: '#003d7a',
  river: '#00aaff',
  rainfall: '#66ccff',
  terrain: {
    low: '#2d5016',
    mid: '#8b7355',
    high: '#ffffff'
  }
};
