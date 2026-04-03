/**
 * 模拟时间序列数据 - 31天逐日水文数据
 * 用于3D可视化时间动画联动
 */

const DAYS = 31;

// 使用固定种子的伪随机，确保数据一致
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// 生成31天逐日降雨量（mm）
function generateRainfallData() {
  const data = [];
  for (let d = 0; d < DAYS; d++) {
    const base = 20 + 30 * Math.sin((d / DAYS) * Math.PI * 2);
    const noise = seededRandom(d * 17 + 3) * 15 - 7;
    const value = Math.max(0, base + noise);
    data.push({
      day: d + 1,
      date: `2024-01-${String(d + 1).padStart(2, '0')}`,
      stations: [
        { id: 'station-003', name: '武汉雨量站', longitude: 114.3, latitude: 30.5, rainfall: value * (0.8 + seededRandom(d * 7) * 0.4) },
        { id: 'station-rain-01', name: '宜昌雨量站', longitude: 111.3, latitude: 30.7, rainfall: value * (0.6 + seededRandom(d * 13) * 0.5) },
        { id: 'station-rain-02', name: '荆州雨量站', longitude: 112.2, latitude: 30.3, rainfall: value * (0.7 + seededRandom(d * 19) * 0.4) },
      ],
      averageRainfall: value,
    });
  }
  return data;
}

// 生成31天逐日流量数据（m3/s）
function generateFlowData() {
  const data = [];
  for (let d = 0; d < DAYS; d++) {
    const base = 12000 + 6000 * Math.sin(((d - 5) / DAYS) * Math.PI * 2);
    const noise = seededRandom(d * 23 + 7) * 2000 - 1000;
    const flow = Math.max(5000, base + noise);
    data.push({
      day: d + 1,
      date: `2024-01-${String(d + 1).padStart(2, '0')}`,
      stations: [
        { id: 'station-001', name: '宜昌站', longitude: 111.3, latitude: 30.7, value: flow * (0.9 + seededRandom(d * 11) * 0.2), type: 'flow' },
        { id: 'station-002', name: '汉口站', longitude: 114.3, latitude: 30.6, value: flow * (1.1 + seededRandom(d * 29) * 0.15), type: 'flow' },
      ],
      averageFlow: flow,
    });
  }
  return data;
}

// 生成31天逐日水位数据（m）
function generateWaterLevelData() {
  const data = [];
  for (let d = 0; d < DAYS; d++) {
    const base = 32 + 6 * Math.sin(((d - 3) / DAYS) * Math.PI * 2);
    const noise = seededRandom(d * 31 + 11) * 2 - 1;
    data.push({
      day: d + 1,
      date: `2024-01-${String(d + 1).padStart(2, '0')}`,
      stations: [
        { id: 'station-004', name: '荆州站', longitude: 112.2, latitude: 30.3, value: base + noise, type: 'waterLevel' },
      ],
      averageLevel: base + noise,
    });
  }
  return data;
}

// 缓存
let _rainfall = null;
let _flow = null;
let _waterLevel = null;

export function getRainfallTimeSeries() {
  if (!_rainfall) _rainfall = generateRainfallData();
  return _rainfall;
}

export function getFlowTimeSeries() {
  if (!_flow) _flow = generateFlowData();
  return _flow;
}

export function getWaterLevelTimeSeries() {
  if (!_waterLevel) _waterLevel = generateWaterLevelData();
  return _waterLevel;
}

// 根据天数索引（0-30）获取特定日期的数据
export function getRainfallByDay(dayIndex) {
  const series = getRainfallTimeSeries();
  return series[dayIndex] || series[0];
}

export function getFlowByDay(dayIndex) {
  const series = getFlowTimeSeries();
  return series[dayIndex] || series[0];
}

export function getWaterLevelByDay(dayIndex) {
  const series = getWaterLevelTimeSeries();
  return series[dayIndex] || series[0];
}

// 获取实体历史数据（用于EntityInfoPanel）
export function getEntityHistory(entityType, entityId) {
  if (entityType === 'station') {
    if (entityId === 'station-003' || entityId?.startsWith('station-rain')) {
      return getRainfallTimeSeries().map(d => ({
        date: d.date,
        value: d.stations.find(s => s.id === entityId)?.rainfall || d.averageRainfall,
      }));
    }
    if (entityId === 'station-001' || entityId === 'station-002') {
      return getFlowTimeSeries().map(d => ({
        date: d.date,
        value: d.stations.find(s => s.id === entityId)?.value || d.averageFlow,
      }));
    }
    if (entityId === 'station-004') {
      return getWaterLevelTimeSeries().map(d => ({
        date: d.date,
        value: d.stations.find(s => s.id === entityId)?.value || d.averageLevel,
      }));
    }
  }
  if (entityType === 'river') {
    return getFlowTimeSeries().map(d => ({
      date: d.date,
      value: d.averageFlow,
    }));
  }
  if (entityType === 'lake') {
    return getWaterLevelTimeSeries().map(d => ({
      date: d.date,
      value: d.averageLevel,
    }));
  }
  return [];
}
