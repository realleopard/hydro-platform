import { api } from './api';

/**
 * WebSocket 连接管理器
 */
class TaskWebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = 3000;
    this.listeners = new Map();
  }

  /**
   * 连接 WebSocket
   * @param taskId 任务 ID
   */
  connect(taskId) {
    const token = localStorage.getItem('accessToken');
    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8080'}/ws/v1/tasks/${taskId}?token=${token}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`WebSocket connected for task ${taskId}`);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
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
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 尝试重新连接
   */
  attemptReconnect(taskId) {
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
  addListener(taskId, callback) {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }
    this.listeners.get(taskId).add(callback);
  }

  /**
   * 移除监听器
   */
  removeListener(taskId, callback) {
    const listeners = this.listeners.get(taskId);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 通知所有监听器
   */
  notifyListeners(taskId, update) {
    const listeners = this.listeners.get(taskId);
    if (listeners) {
      listeners.forEach((callback) => {
        callback(update);
      });
    }
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
  getTasks: async (params = {}) => {
    return api.get('/tasks', params);
  },

  /**
   * 获取任务详情
   * @param id 任务 ID
   * @returns 任务详情
   */
  getTaskById: async (id) => {
    return api.get(`/tasks/${id}`);
  },

  /**
   * 创建任务
   * @param data 任务数据
   * @returns 创建的任务
   */
  createTask: async (data) => {
    return api.post('/tasks', data);
  },

  /**
   * 取消任务
   * @param id 任务 ID
   */
  cancelTask: async (id) => {
    return api.post(`/tasks/${id}/cancel`);
  },

  /**
   * 重试失败的任务
   * @param id 任务 ID
   * @returns 重试后的任务
   */
  retryTask: async (id) => {
    return api.post(`/tasks/${id}/retry`);
  },

  /**
   * 删除任务
   * @param id 任务 ID
   */
  deleteTask: async (id) => {
    return api.delete(`/tasks/${id}`);
  },

  /**
   * 获取任务日志
   * @param id 任务 ID
   * @param nodeId 节点 ID（可选）
   * @returns 日志内容
   */
  getTaskLogs: async (id, nodeId) => {
    const params = nodeId ? { nodeId } : {};
    return api.get(`/tasks/${id}/logs`, params);
  },

  /**
   * 获取任务输出文件
   * @param id 任务 ID
   * @returns 输出文件列表
   */
  getTaskOutputs: async (id) => {
    return api.get(`/tasks/${id}/outputs`);
  },

  /**
   * 下载任务输出文件
   * @param id 任务 ID
   * @param filePath 文件路径
   * @returns 下载链接
   */
  getDownloadUrl: async (id, filePath) => {
    const result = await api.get(`/tasks/${id}/download`, {
      path: filePath,
    });
    return result.url;
  },

  /**
   * 获取我的任务列表
   * @param params 查询参数
   * @returns 分页任务列表
   */
  getMyTasks: async (params = {}) => {
    return api.get('/tasks/my', params);
  },

  /**
   * 批量删除任务
   * @param ids 任务 ID 列表
   */
  batchDeleteTasks: async (ids) => {
    return api.post('/tasks/batch-delete', { ids });
  },

  /**
   * 订阅任务进度更新（WebSocket）
   * @param taskId 任务 ID
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  subscribeToProgress: (taskId, callback) => {
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
  unsubscribeFromProgress: (taskId) => {
    wsManager.disconnect();
  },

  /**
   * 获取任务状态颜色（用于 UI 显示）
   */
  getStatusColor: (status) => {
    const colorMap = {
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
  getStatusText: (status) => {
    const textMap = {
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
  isActive: (status) => {
    return ['PENDING', 'QUEUED', 'RUNNING', 'RETRYING'].includes(status);
  },

  /**
   * 检查任务是否已完成
   */
  isCompleted: (status) => {
    return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status);
  },
};

export default taskService;
