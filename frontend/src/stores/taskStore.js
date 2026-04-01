import { create } from 'zustand';
import { taskService } from '../services/taskService';

export const useTaskStore = create((set, get) => ({
  // 状态
  tasks: [],
  currentTask: null,
  myTasks: [],
  loading: false,
  error: null,

  // WebSocket
  wsConnection: null,
  logs: [],

  // 获取任务列表
  fetchTasks: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await taskService.getTasks(params);
      set({ tasks: data.items || data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 获取我的任务
  fetchMyTasks: async () => {
    set({ loading: true, error: null });
    try {
      const data = await taskService.getMyTasks();
      set({ myTasks: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 获取任务详情
  fetchTask: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await taskService.getTask(id);
      set({ currentTask: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // 取消任务
  cancelTask: async (id) => {
    try {
      await taskService.cancelTask(id);
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { ...t, status: 'cancelled' } : t
        ),
        currentTask: state.currentTask?.id === id
          ? { ...state.currentTask, status: 'cancelled' }
          : state.currentTask
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // 重试任务
  retryTask: async (id) => {
    try {
      const result = await taskService.retryTask(id);
      get().fetchTasks();
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // 连接 WebSocket
  connectWebSocket: (taskId) => {
    // 关闭旧连接
    const oldWs = get().wsConnection;
    if (oldWs) {
      oldWs.close();
    }

    // 创建新连接
    const ws = taskService.createWebSocket(taskId);

    ws.onopen = () => {
      console.log('WebSocket connected:', taskId);
      set({ logs: [] });
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'status_update':
          set((state) => ({
            currentTask: state.currentTask?.id === taskId
              ? { ...state.currentTask, ...message.data }
              : state.currentTask
          }));
          break;

        case 'log':
          set((state) => ({
            logs: [...state.logs, message.data]
          }));
          break;

        case 'pong':
          // 心跳响应，无需处理
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ error: 'WebSocket连接错误' });
    };

    ws.onclose = () => {
      console.log('WebSocket closed:', taskId);
    };

    set({ wsConnection: ws });

    // 发送心跳
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // 返回清理函数
    return () => {
      clearInterval(heartbeat);
      ws.close();
    };
  },

  // 断开 WebSocket
  disconnectWebSocket: () => {
    const ws = get().wsConnection;
    if (ws) {
      ws.close();
      set({ wsConnection: null });
    }
  },

  // 清空日志
  clearLogs: () => set({ logs: [] }),

  clearError: () => set({ error: null })
}));
