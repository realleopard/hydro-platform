// Cesium 配置
export const CESIUM_CONFIG = {
  // ion token - 需要从 https://cesium.com/ion/ 获取
  // 生产环境应该使用环境变量
  ionToken: process.env.REACT_APP_CESIUM_ION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1YjEwNS0zMjUzLTRiMzgtYmQyNi0wMmE0Njc1ZDc3MDIiLCJpZCI6MjQ2MDQ4LCJpYXQiOjE3MjgyMzQ1MjF9.placeholder',

  // 默认视角（中国中部）
  defaultView: {
    longitude: 111.5,
    latitude: 30.5,
    height: 2000000, // 2km
    heading: 0,
    pitch: -45,
    roll: 0
  },

  // 地形配置
  terrain: {
    url: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
    requestWaterMask: true,
    requestVertexNormals: true
  },

  // 影像图层
  imageryLayers: [
    {
      name: 'Bing Maps 卫星影像',
      provider: 'BingMaps',
      key: 'bingMapsKey'
    },
    {
      name: 'OpenStreetMap',
      provider: 'OSM',
      url: 'https://a.tile.openstreetmap.org/'
    }
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
