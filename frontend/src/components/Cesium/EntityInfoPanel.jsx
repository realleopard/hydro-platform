import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Button } from 'antd';
import {
  EnvironmentOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getEntityHistory } from '../../services/mockTimeSeriesData';

const EntityInfoPanel = ({ entity, onClose }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const type = entity?.type;
  const id = entity?.id;
  const name = entity?.name;
  const properties = entity?.properties;

  useEffect(() => {
    if (showHistory && type && id) {
      const data = getEntityHistory(type, id);
      setHistoryData(data);
    }
  }, [showHistory, type, id]);

  if (!entity) return null;

  const unit = getUnit(properties?.type);

  const renderContent = () => {
    switch (type) {
      case 'river':
        return (
          <>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="河流名称">{name}</Descriptions.Item>
              <Descriptions.Item label="河流长度">
                {properties?.length ? `${properties.length.toFixed(2)} km` : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="流域面积">
                {properties?.basinArea ? `${properties.basinArea.toFixed(2)} km²` : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="平均流量">
                {properties?.avgFlow ? `${properties.avgFlow.toFixed(2)} m³/s` : '--'}
              </Descriptions.Item>
            </Descriptions>
            {properties?.flow && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>实时流量</h4>
                <div style={{ fontSize: 24, color: '#1890ff', fontWeight: 'bold' }}>
                  {properties.flow.toFixed(2)} <span style={{ fontSize: 14 }}>m³/s</span>
                </div>
              </div>
            )}
          </>
        );

      case 'lake':
        return (
          <>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="水体名称">{name}</Descriptions.Item>
              <Descriptions.Item label="水域面积">
                {properties?.area ? `${properties.area.toFixed(2)} km²` : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="库容">
                {properties?.capacity ? `${properties.capacity.toFixed(2)} 万m³` : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="最大深度">
                {properties?.maxDepth ? `${properties.maxDepth.toFixed(1)} m` : '--'}
              </Descriptions.Item>
            </Descriptions>
            {properties?.waterLevel && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>当前水位</h4>
                <div style={{ fontSize: 24, color: '#1890ff', fontWeight: 'bold' }}>
                  {properties.waterLevel.toFixed(2)} <span style={{ fontSize: 14 }}>m</span>
                </div>
              </div>
            )}
          </>
        );

      case 'station':
        return (
          <>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="测站名称">{name}</Descriptions.Item>
              <Descriptions.Item label="测站类型">
                <Tag color={getStationTypeColor(properties?.type)}>
                  {getStationTypeLabel(properties?.type)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="测站编码">{id}</Descriptions.Item>
              <Descriptions.Item label="建站时间">
                {properties?.establishedDate || '--'}
              </Descriptions.Item>
            </Descriptions>
            {properties?.value !== undefined && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>当前监测值</h4>
                <div style={{ fontSize: 24, color: getValueColor(properties?.type, properties?.value), fontWeight: 'bold' }}>
                  {properties.value.toFixed(2)}
                  <span style={{ fontSize: 14 }}> {getUnit(properties?.type)}</span>
                </div>
              </div>
            )}
          </>
        );

      case 'basin':
        return (
          <>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="流域名称">{name}</Descriptions.Item>
              <Descriptions.Item label="流域面积">
                {properties?.area ? `${properties.area.toFixed(2)} km²` : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="出口断面">
                {properties?.outlet || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="平均高程">
                {properties?.avgElevation ? `${properties.avgElevation.toFixed(0)} m` : '--'}
              </Descriptions.Item>
            </Descriptions>
            {properties?.runoff && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>年径流量</h4>
                <div style={{ fontSize: 24, color: '#1890ff', fontWeight: 'bold' }}>
                  {properties.runoff.toFixed(2)} <span style={{ fontSize: 14 }}>亿m³</span>
                </div>
              </div>
            )}
          </>
        );

      default:
        return (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="名称">{name}</Descriptions.Item>
            <Descriptions.Item label="类型">{type}</Descriptions.Item>
            <Descriptions.Item label="ID">{id}</Descriptions.Item>
          </Descriptions>
        );
    }
  };

  const getStationTypeColor = (t) => {
    switch (t) {
      case 'rainfall': return 'blue';
      case 'flow': return 'green';
      case 'waterLevel': return 'cyan';
      case 'quality': return 'purple';
      default: return 'default';
    }
  };

  const getStationTypeLabel = (t) => {
    switch (t) {
      case 'rainfall': return '雨量站';
      case 'flow': return '流量站';
      case 'waterLevel': return '水位站';
      case 'quality': return '水质站';
      default: return '综合站';
    }
  };

  const getValueColor = (t, value) => {
    if (t === 'rainfall') {
      if (value < 10) return '#66ccff';
      if (value < 25) return '#00aaff';
      if (value < 50) return '#0066cc';
      if (value < 100) return '#ffcc00';
      return '#ff6600';
    }
    if (t === 'flow') {
      if (value < 100) return '#00cc66';
      if (value < 500) return '#66cc00';
      if (value < 1000) return '#cccc00';
      if (value < 5000) return '#cc6600';
      return '#cc0000';
    }
    return '#1890ff';
  };

  return (
    <Card
      title={
        <span>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          实体详情
        </span>
      }
      extra={
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          size="small"
        />
      }
      style={{
        width: 300,
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 100,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        maxHeight: '80vh',
        overflow: 'auto',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      {renderContent()}

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
        <Button
          block
          icon={<LineChartOutlined />}
          onClick={() => setShowHistory(!showHistory)}
          style={{ marginBottom: showHistory ? 12 : 0 }}
        >
          {showHistory ? '收起历史数据' : '查看历史数据'}
        </Button>

        {showHistory && historyData.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <h4 style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
              近30天趋势{unit ? ` (${unit})` : ''}
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={historyData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  formatter={(val) => [val.toFixed(1), unit || '值']}
                  labelFormatter={(v) => `日期: ${v}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1890ff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {showHistory && historyData.length === 0 && (
          <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: 8 }}>
            暂无历史数据
          </div>
        )}
      </div>
    </Card>
  );
};

function getUnit(type) {
  switch (type) {
    case 'rainfall': return 'mm';
    case 'flow': return 'm³/s';
    case 'waterLevel': return 'm';
    default: return '';
  }
}

export default EntityInfoPanel;
