import React from 'react';
import { Handle, Position } from 'react-flow-renderer';
import './ModelNode.css';

const ModelNode = ({ data, selected }) => {
  const { label, modelType, status, onDelete, onConfigure } = data;

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#52c41a';
      case 'completed':
        return '#1890ff';
      case 'failed':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  return (
    <div className={`model-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />

      <div className="model-node-header" style={{ borderLeftColor: getStatusColor() }}>
        <div className="model-node-icon">
          {modelType === 'input' && '📥'}
          {modelType === 'output' && '📤'}
          {modelType === 'model' && '🔧'}
          {modelType === 'condition' && '🔀'}
        </div>
        <div className="model-node-title">{label}</div>
      </div>

      <div className="model-node-body">
        {data.description && (
          <div className="model-node-description">{data.description}</div>
        )}

        {status && (
          <div className="model-node-status" style={{ color: getStatusColor() }}>
            {status === 'running' && '运行中...'}
            {status === 'completed' && '已完成'}
            {status === 'failed' && '失败'}
          </div>
        )}
      </div>

      <div className="model-node-actions">
        <button
          className="model-node-btn"
          onClick={(e) => {
            e.stopPropagation();
            onConfigure?.();
          }}
          title="配置"
        >
          ⚙️
        </button>
        <button
          className="model-node-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          title="删除"
        >
          🗑️
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />
    </div>
  );
};

export default ModelNode;
