// 任务状态选项
export const TASK_STATUS_OPTIONS = [
  { label: '等待中', value: 'pending', color: 'default' },
  { label: '队列中', value: 'queued', color: 'processing' },
  { label: '运行中', value: 'running', color: 'processing' },
  { label: '已完成', value: 'completed', color: 'success' },
  { label: '失败', value: 'failed', color: 'error' },
  { label: '已取消', value: 'cancelled', color: 'warning' },
  { label: '重试中', value: 'retrying', color: 'processing' },
];

// 执行策略选项
export const EXECUTION_STRATEGY_OPTIONS = [
  { label: '串行', value: 'sequential' },
  { label: '并行', value: 'parallel' },
  { label: '混合', value: 'mixed' },
];

// 日志级别颜色映射
export const LOG_LEVEL_COLORS = {
  debug: '#8c8c8c',
  info: '#1890ff',
  warn: '#faad14',
  error: '#ff4d4f',
};
