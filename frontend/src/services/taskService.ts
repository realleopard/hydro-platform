import { api } from './api';
import {
  Task,
  CreateTaskRequest,
  TaskQueryParams,
  PageResponse,
  TaskStatus,
  TaskProgressUpdate,
} from '../types';

/**
 * Derive WebSocket base URL from the API base URL.
 * Replaces http(s) with ws(s) and strips any trailing path segments.
 */
function getWebSocketBaseUrl(): string {
  const wsUrlFromEnv = process.env.REACT_APP_WS_URL;
  if (wsUrlFromEnv) {
    return wsUrlFromEnv;
  }

  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://192.168.30.107:8080';
  return apiBaseUrl.replace(/^http/, 'ws');
}

/**
 * WebSocket 连接管理器
 */
class TaskWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000;
  private listeners: Map<number, Set<(update: TaskProgressUpdate) => void>> = new Map();

  /**
   * 连接 WebSocket
   * @param taskId 任务 ID
   */
  connect(taskId: number): void {
    const token = localStorage.getItem('accessToken');
    const wsUrl = `${getWebSocketBaseUrl()}/ws/v1/tasks/${taskId}?token=${token}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`WebSocket connected for task ${taskId}`);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const update: TaskProgressUpdate = JSON.parse(event.data);
        this.notifyListeners(taskId, update);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log(`WebSocket closed for task ${taskId}`);
      this.attemptReconnect(taskId);
    };
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 尝试重新连接
   */
  private attemptReconnect(taskId: number): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts})`);
        this.connect(taskId);
      }, this.reconnectTimeout * this.reconnectAttempts);
    }
  }

  /**
   * 添加监听器
   */
  addListener(taskId: number, callback: (update: TaskProgressUpdate) => void): void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }
    this.listeners.get(taskId)?.add(callback);
  }

  /**
   * 移除监听器
   */
  removeListener(taskId: number, callback: (update: TaskProgressUpdate) => void): void {
    this.listeners.get(taskId)?.delete(callback);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(taskId: number, update: TaskProgressUpdate): void {
    this.listeners.get(taskId)?.forEach((callback) => {
      callback(update);
    });
  }
}

// 全局 WebSocket 管理器实例
const wsManager = new TaskWebSocketManager();

/**
 * 任务服务
 * 处理任务的 CRUD 操作、状态管理和实时更新
 */
export const taskService = {
  /**
   * 获取任务列表
   * @param params 查询参数
   * @returns 分页任务列表
   */
  getTasks: async (params?: TaskQueryParams): Promise<PageResponse<Task>> => {
    return api.get<PageResponse<Task>>('/tasks', params as Record<string, unknown>);
  },

  /**
   * 获取任务详情（包含节点、资源使用、工作流名称等）
   * @param id 任务 ID
   * @returns 任务详情（Map 格式）
   */
  getTaskById: async (id: string): Promise<any> => {
    return api.get(`/tasks/${id}`);
  },

  /**
   * 创建任务
   * @param data 任务数据
   * @returns 创建的任务
   */
  createTask: async (data: CreateTaskRequest): Promise<Task> => {
    return api.post<Task>('/tasks', data);
  },

  /**
   * 取消任务
   * @param id 任务 ID
   */
  cancelTask: async (id: string): Promise<void> => {
    return api.post<void>(`/tasks/${id}/cancel`);
  },

  /**
   * 重试失败的任务
   * @param id 任务 ID
   * @returns 重试后的任务
   */
  retryTask: async (id: string): Promise<any> => {
    return api.post(`/tasks/${id}/retry`);
  },

  /**
   * 删除任务
   * @param id 任务 ID
   */
  deleteTask: async (id: string): Promise<void> => {
    return api.delete<void>(`/tasks/${id}`);
  },

  /**
   * 获取任务日志（按行拆分的结构化日志）
   * @param id 任务 ID
   * @returns 日志条目数组
   */
  getTaskLogs: async (id: string): Promise<any[]> => {
    return api.get(`/tasks/${id}/logs`);
  },

  /**
   * 获取任务输出（从节点输出数据解析）
   * @param id 任务 ID
   * @returns 输出数据
   */
  getTaskOutputs: async (id: string): Promise<any[]> => {
    try {
      const task: any = await api.get(`/tasks/${id}`);
      const nodes = task?.nodes || [];
      const outputs = [];
      for (const node of nodes) {
        if (node.outputs) {
          try {
            const parsed = typeof node.outputs === 'string' ? JSON.parse(node.outputs) : node.outputs;
            outputs.push({
              nodeId: node.nodeId,
              nodeName: node.nodeName,
              data: parsed,
            });
          } catch { /* skip */ }
        }
      }
      return outputs;
    } catch {
      return [];
    }
  },

  /**
   * 下载任务输出文件
   * @param id 任务 ID
   * @param filePath 文件路径
   * @returns 下载链接
   */
  getDownloadUrl: async (id: number, filePath: string): Promise<string> => {
    const result = await api.get<{ url: string }>(`/tasks/${id}/download`, {
      path: filePath,
    });
    return result.url;
  },

  /**
   * 获取我的任务列表
   * @param params 查询参数
   * @returns 分页任务列表
   */
  getMyTasks: async (
    params?: Omit<TaskQueryParams, 'createdBy'>
  ): Promise<PageResponse<Task>> => {
    return api.get<PageResponse<Task>>('/tasks/my', params as Record<string, unknown>);
  },

  /**
   * 获取工作流相关的任务
   * @param workflowId 工作流 ID
   * @param params 查询参数
   * @returns 分页任务列表
   */
  getTasksByWorkflow: async (
    workflowId: number,
    params?: Omit<TaskQueryParams, 'workflowId'>
  ): Promise<PageResponse<Task>> => {
    return api.get<PageResponse<Task>>(`/workflows/${workflowId}/tasks`, params as Record<string, unknown>);
  },

  /**
   * 批量删除任务
   * @param ids 任务 ID 列表
   */
  batchDeleteTasks: async (ids: number[]): Promise<void> => {
    return api.post<void>('/tasks/batch-delete', { ids });
  },

  /**
   * 订阅任务进度更新（WebSocket）
   * @param taskId 任务 ID
   * @param callback 回调函数
   */
  subscribeToProgress: (
    taskId: number,
    callback: (update: TaskProgressUpdate) => void
  ): (() => void) => {
    wsManager.connect(taskId);
    wsManager.addListener(taskId, callback);

    // 返回取消订阅函数
    return () => {
      wsManager.removeListener(taskId, callback);
    };
  },

  /**
   * 取消订阅任务进度更新
   */
  unsubscribeFromProgress: (taskId: number): void => {
    wsManager.disconnect();
    wsManager.removeListener(taskId, () => {});
  },

  /**
   * 获取任务统计信息
   * @returns 任务统计
   */
  getTaskStatistics: async (): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> => {
    return api.get<{
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
    }>('/tasks/statistics');
  },

  /**
   * 获取任务状态颜色（用于 UI 显示）
   */
  getStatusColor: (status: TaskStatus): string => {
    const colorMap: Record<TaskStatus, string> = {
      PENDING: '#faad14',
      QUEUED: '#1890ff',
      RUNNING: '#722ed1',
      COMPLETED: '#52c41a',
      FAILED: '#f5222d',
      CANCELLED: '#8c8c8c',
      RETRYING: '#eb2f96',
    };
    return colorMap[status] || '#8c8c8c';
  },

  /**
   * 获取任务状态文本
   */
  getStatusText: (status: TaskStatus): string => {
    const textMap: Record<TaskStatus, string> = {
      PENDING: '待处理',
      QUEUED: '队列中',
      RUNNING: '运行中',
      COMPLETED: '已完成',
      FAILED: '失败',
      CANCELLED: '已取消',
      RETRYING: '重试中',
    };
    return textMap[status] || status;
  },

  /**
   * 检查任务是否处于活动状态
   */
  isActive: (status: TaskStatus): boolean => {
    return ['PENDING', 'QUEUED', 'RUNNING', 'RETRYING'].includes(status);
  },

  /**
   * 检查任务是否已完成
   */
  isCompleted: (status: TaskStatus): boolean => {
    return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status);
  },
};

export default taskService;
