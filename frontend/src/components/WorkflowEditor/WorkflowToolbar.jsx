import React from 'react';
import { Button, Space, Tooltip, Popconfirm, Badge, Divider } from 'antd';
import {
  SaveOutlined,
  PlayCircleOutlined,
  ClearOutlined,
  UndoOutlined,
  RedoOutlined,
  CheckCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  SettingOutlined,
  FullscreenOutlined,
  CompressOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import styles from './WorkflowEditor.module.css';

const WorkflowToolbar = ({
  onSave,
  onRun,
  onClear,
  onUndo,
  onRedo,
  onValidate,
  onExport,
  onImport,
  onSettings,
  onFitView,
  onDelete,
  hasSelection,
  isDirty,
  isValid,
  canUndo,
  canRedo,
  loading,
  workflowName
}) => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <Space>
          <Tooltip title="保存工作流">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={onSave}
              loading={loading}
            >
              保存
              {isDirty && <Badge dot className={styles.dirtyBadge} />}
            </Button>
          </Tooltip>

          <Tooltip title="运行工作流">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={onRun}
              disabled={!isValid}
              style={{ backgroundColor: '#52c41a' }}
            >
              运行
            </Button>
          </Tooltip>

          <Divider type="vertical" />

          <Tooltip title="撤销">
            <Button
              icon={<UndoOutlined />}
              onClick={onUndo}
              disabled={!canUndo}
            />
          </Tooltip>

          <Tooltip title="重做">
            <Button
              icon={<RedoOutlined />}
              onClick={onRedo}
              disabled={!canRedo}
            />
          </Tooltip>

          <Tooltip title="验证工作流">
            <Button
              icon={<CheckCircleOutlined />}
              onClick={onValidate}
            >
              验证
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div className={styles.toolbarCenter}>
        <span className={styles.workflowName}>{workflowName || '未命名工作流'}</span>
        {isDirty && <span className={styles.dirtyIndicator}>*</span>}
      </div>

      <div className={styles.toolbarRight}>
        <Space>
          <Tooltip title="删除选中节点">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
              disabled={!hasSelection}
            />
          </Tooltip>

          <Tooltip title="清空画布">
            <Popconfirm
              title="确认清空"
              description="确定要清空所有节点和连接吗？此操作不可撤销。"
              onConfirm={onClear}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<ClearOutlined />} />
            </Popconfirm>
          </Tooltip>

          <Divider type="vertical" />

          <Tooltip title="导出工作流">
            <Button icon={<ExportOutlined />} onClick={onExport} />
          </Tooltip>

          <Tooltip title="导入工作流">
            <Button icon={<ImportOutlined />} onClick={onImport} />
          </Tooltip>

          <Tooltip title="适应视图">
            <Button icon={<CompressOutlined />} onClick={onFitView} />
          </Tooltip>

          <Tooltip title="工作流设置">
            <Button icon={<SettingOutlined />} onClick={onSettings} />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};

export default WorkflowToolbar;
