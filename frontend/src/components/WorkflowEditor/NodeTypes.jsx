import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Tag, Badge, Tooltip } from 'antd';
import {
  ApiOutlined,
  ImportOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  DatabaseOutlined,
  FileOutlined
} from '@ant-design/icons';
import styles from './WorkflowEditor.module.css';

// 模型节点组件
const ModelNode = memo(({ data, selected }) => {
  const { model, status = 'idle', onDoubleClick, onContextMenu } = data;

  // 解析接口端口
  const interfaces = model?.interfaces;
  let inputPorts = [];
  let outputPorts = [];

  if (interfaces) {
    // 接口可能是数组（后端格式）或 {inputs:[], outputs:[]}（前端格式）
    if (Array.isArray(interfaces)) {
      inputPorts = interfaces.filter(i => i.type === 'input');
      outputPorts = interfaces.filter(i => i.type === 'output');
    } else if (interfaces.inputs || interfaces.outputs) {
      inputPorts = (interfaces.inputs || []).map(i => ({ ...i, type: 'input' }));
      outputPorts = (interfaces.outputs || []).map(i => ({ ...i, type: 'output' }));
    }
  }

  const hasExplicitPorts = inputPorts.length > 0 || outputPorts.length > 0;

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <LoadingOutlined className={styles.statusIconRunning} />;
      case 'completed':
        return <CheckCircleOutlined className={styles.statusIconSuccess} />;
      case 'failed':
        return <CloseCircleOutlined className={styles.statusIconError} />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'processing';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // 计算端口垂直分布位置
  const getPortStyle = (index, total) => {
    if (total <= 1) return { top: '50%' };
    const cardHeight = 80 + total * 20; // 估算高度
    const step = Math.max(24, cardHeight / (total + 1));
    return { top: `${(index + 1) * step - 10}px` };
  };

  return (
    <div
      className={`${styles.node} ${styles.modelNode} ${selected ? styles.selected : ''}`}
      onDoubleClick={() => onDoubleClick?.(data)}
      onContextMenu={(e) => onContextMenu?.(e, data)}
    >
      {/* 输入端口 Handles */}
      {hasExplicitPorts ? (
        inputPorts.map((port, idx) => (
          <div key={port.name} className={styles.portWrapper} style={{ ...getPortStyle(idx, inputPorts.length), left: -6 }}>
            <Handle
              type="target"
              position={Position.Left}
              className={styles.handle}
              id={port.name}
              style={{ background: '#52c41a' }}
            />
            <span className={styles.portLabel} style={{ left: 10 }}>{port.name}</span>
          </div>
        ))
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          className={styles.handle}
          id="input"
        />
      )}

      <Card
        className={styles.nodeCard}
        size="small"
        title={
          <div className={styles.nodeHeader}>
            <ApiOutlined className={styles.nodeIcon} />
            <span className={styles.nodeTitle}>{model?.name || '未命名模型'}</span>
            {getStatusIcon()}
          </div>
        }
        extra={
          <Badge
            status={getStatusColor()}
            text={status === 'idle' ? '' : status}
          />
        }
      >
        <div className={styles.nodeContent}>
          <div className={styles.nodeDescription}>
            {model?.description || '暂无描述'}
          </div>
          <div className={styles.nodeMeta}>
            <Tag size="small">{model?.currentVersion || 'v1.0.0'}</Tag>
            {model?.category && (
              <Tag size="small" color="blue">
                {model.category}
              </Tag>
            )}
          </div>
        </div>
      </Card>

      {/* 输出端口 Handles */}
      {hasExplicitPorts ? (
        outputPorts.map((port, idx) => (
          <div key={port.name} className={styles.portWrapper} style={{ ...getPortStyle(idx, outputPorts.length), right: -6 }}>
            <Handle
              type="source"
              position={Position.Right}
              className={styles.handle}
              id={port.name}
              style={{ background: '#1890ff' }}
            />
            <span className={styles.portLabel} style={{ right: 10 }}>{port.name}</span>
          </div>
        ))
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className={styles.handle}
          id="output"
        />
      )}
    </div>
  );
});

// 输入节点组件
const InputNode = memo(({ data, selected }) => {
  const { label, dataset, onDoubleClick, onContextMenu } = data;

  return (
    <div
      className={`${styles.node} ${styles.inputNode} ${selected ? styles.selected : ''}`}
      onDoubleClick={() => onDoubleClick?.(data)}
      onContextMenu={(e) => onContextMenu?.(e, data)}
    >
      <Card
        className={styles.nodeCard}
        size="small"
        title={
          <div className={styles.nodeHeader}>
            <ImportOutlined className={styles.nodeIcon} />
            <span className={styles.nodeTitle}>{label || '输入'}</span>
          </div>
        }
      >
        <div className={styles.nodeContent}>
          {dataset ? (
            <>
              <div className={styles.nodeDescription}>
                <DatabaseOutlined /> {dataset.name}
              </div>
              <div className={styles.nodeMeta}>
                <Tag size="small">{dataset.format || '未知格式'}</Tag>
              </div>
            </>
          ) : (
            <div className={styles.nodePlaceholder}>
              <Tooltip title="双击配置输入数据">
                <span>点击配置输入</span>
              </Tooltip>
            </div>
          )}
        </div>
      </Card>
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        id="output"
      />
    </div>
  );
});

// 输出节点组件
const OutputNode = memo(({ data, selected }) => {
  const { label, output, onDoubleClick, onContextMenu } = data;

  return (
    <div
      className={`${styles.node} ${styles.outputNode} ${selected ? styles.selected : ''}`}
      onDoubleClick={() => onDoubleClick?.(data)}
      onContextMenu={(e) => onContextMenu?.(e, data)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        id="input"
      />
      <Card
        className={styles.nodeCard}
        size="small"
        title={
          <div className={styles.nodeHeader}>
            <ExportOutlined className={styles.nodeIcon} />
            <span className={styles.nodeTitle}>{label || '输出'}</span>
          </div>
        }
      >
        <div className={styles.nodeContent}>
          {output ? (
            <>
              <div className={styles.nodeDescription}>
                <FileOutlined /> {output.name}
              </div>
              <div className={styles.nodeMeta}>
                <Tag size="small">{output.format || '未知格式'}</Tag>
              </div>
            </>
          ) : (
            <div className={styles.nodePlaceholder}>
              <Tooltip title="双击配置输出">
                <span>点击配置输出</span>
              </Tooltip>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
});

// 开始节点组件
const StartNode = memo(({ data, selected }) => {
  const { onDoubleClick } = data;

  return (
    <div
      className={`${styles.node} ${styles.startNode} ${selected ? styles.selected : ''}`}
      onDoubleClick={() => onDoubleClick?.(data)}
    >
      <div className={styles.startNodeContent}>
        <PlayCircleOutlined className={styles.startIcon} />
        <span>开始</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        id="output"
      />
    </div>
  );
});

// 结束节点组件
const EndNode = memo(({ data, selected }) => {
  const { onDoubleClick } = data;

  return (
    <div
      className={`${styles.node} ${styles.endNode} ${selected ? styles.selected : ''}`}
      onDoubleClick={() => onDoubleClick?.(data)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        id="input"
      />
      <div className={styles.endNodeContent}>
        <CheckCircleOutlined className={styles.endIcon} />
        <span>结束</span>
      </div>
    </div>
  );
});

// 节点类型映射
export const nodeTypes = {
  model: ModelNode,
  input: InputNode,
  output: OutputNode,
  start: StartNode,
  end: EndNode,
};

export { ModelNode, InputNode, OutputNode, StartNode, EndNode };
