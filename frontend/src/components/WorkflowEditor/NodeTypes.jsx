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

  return (
    <div
      className={`${styles.node} ${styles.modelNode} ${selected ? styles.selected : ''}`}
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
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        id="output"
      />
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
