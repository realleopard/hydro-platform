import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { Button, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import styles from './WorkflowEditor.module.css';

// 自定义边组件 - 带删除按钮
const CustomEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt) => {
    evt.stopPropagation();
    data?.onDelete?.(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={data?.markerEnd}
        style={{
          stroke: selected ? '#1890ff' : '#b1b1b7',
          strokeWidth: selected ? 3 : 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {selected && (
            <Tooltip title="删除连接">
              <Button
                type="primary"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={onEdgeClick}
                className={styles.edgeDeleteButton}
              />
            </Tooltip>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// 数据流边 - 带数据映射标签
const DataFlowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt) => {
    evt.stopPropagation();
    data?.onDelete?.(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={data?.markerEnd}
        style={{
          stroke: selected ? '#52c41a' : '#b1b1b7',
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: '5,5',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className={styles.dataFlowLabel}>
            {data?.mapping ? (
              <span className={styles.mappingLabel}>{data.mapping}</span>
            ) : null}
            {selected && (
              <Button
                type="primary"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={onEdgeClick}
                className={styles.edgeDeleteButton}
              />
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// 边类型映射
export const edgeTypes = {
  custom: CustomEdge,
  dataFlow: DataFlowEdge,
};

export { CustomEdge, DataFlowEdge };
