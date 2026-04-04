import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { Button, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, BranchesOutlined } from '@ant-design/icons';
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

// 条件边 - 带条件表达式标签
const ConditionEdge = memo(({
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

  const onEditClick = (evt) => {
    evt.stopPropagation();
    data?.onEditCondition?.(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={data?.markerEnd}
        style={{
          stroke: selected ? '#722ed1' : '#b37feb',
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: '8,4',
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
          <div className={styles.conditionLabel}>
            <BranchesOutlined style={{ marginRight: 4 }} />
            {data?.condition ? (
              <code className={styles.conditionCode}>{data.condition}</code>
            ) : (
              <span style={{ opacity: 0.6 }}>条件</span>
            )}
          </div>
          {selected && (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
              <Tooltip title="编辑条件">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={onEditClick}
                  style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}
                />
              </Tooltip>
              <Tooltip title="删除连接">
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={onEdgeClick}
                />
              </Tooltip>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// 边类型映射
export const edgeTypes = {
  custom: CustomEdge,
  dataFlow: DataFlowEdge,
  condition: ConditionEdge,
};

export { CustomEdge, DataFlowEdge, ConditionEdge };
