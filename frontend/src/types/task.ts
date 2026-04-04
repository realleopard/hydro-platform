// 任务类型定义

export type TaskStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRYING';

export interface Task {
  id: number;
  name: string;
  description?: string;
  workflowId: number;
  status: TaskStatus;
  progress?: number;
  executionStrategy?: 'sequential' | 'parallel' | 'mixed';
  outputs?: Record<string, string>;
  nodeExecutions?: NodeExecution[];
  createdBy: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeExecution {
  nodeId: string;
  nodeName?: string;
  status: string;
  progress?: number;
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  workflowId: number;
  executionStrategy?: 'sequential' | 'parallel' | 'mixed';
  parameters?: Record<string, unknown>;
}

export interface TaskQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TaskStatus;
  workflowId?: number;
  createdBy?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskProgressUpdate {
  taskId: number;
  status: TaskStatus;
  progress: number;
  currentNodeId?: string;
  currentNode?: string;
  nodeExecution?: {
    nodeId: string;
    status: string;
    progress?: number;
    message?: string;
    startedAt?: string;
    completedAt?: string;
  };
  message?: string;
  timestamp: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  modelId: number;
  name?: string;
  position?: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  dataMapping?: Record<string, string>;
  condition?: string;
}

export interface Workflow {
  id: number;
  name: string;
  description?: string;
  definition?: WorkflowDefinition;
  isPublic?: boolean;
  visibility?: string;
  tags?: string[];
  authorId?: number;
  ownerName?: string;
  runCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  definition?: WorkflowDefinition;
  isPublic?: boolean;
  tags?: string[];
}

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
