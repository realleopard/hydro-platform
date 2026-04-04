import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { taskService } from '../services/taskService';
import {
  Task,
  CreateTaskRequest,
  TaskQueryParams,
  TaskStatus,
  TaskProgressUpdate,
  PageResponse,
} from '../types';

/**
 * 任务状态接口
 */
interface TaskState {
  // 状态
  tasks: Task[];
  currentTask: Task | null;
  pagination: {
    total: number;
    current: number;
    pageSize: number;
    pages: number;
  };
  statistics: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  isLoading: boolean;
  error: string | null;

  // WebSocket 订阅
  activeSubscriptions: Set<string>;

  // 查询参数
  queryParams: TaskQueryParams;

  // 动作
  fetchTasks: (params?: TaskQueryParams) => Promise<void>;
  fetchTaskById: (id: string) => Promise<any>;
  createTask: (data: CreateTaskRequest) => Promise<Task | null>;
  cancelTask: (id: string) => Promise<boolean>;
  retryTask: (id: string) => Promise<any>;
  deleteTask: (id: string) => Promise<boolean>;
  fetchStatistics: () => Promise<void>;
  subscribeToTask: (taskId: string) => void;
  unsubscribeFromTask: (taskId: string) => void;
  updateTaskProgress: (update: TaskProgressUpdate) => void;
  setQueryParams: (params: Partial<TaskQueryParams>) => void;
  resetQueryParams: () => void;
  clearCurrentTask: () => void;
  clearError: () => void;
}

/**
 * 默认查询参数
 */
const defaultQueryParams: TaskQueryParams = {
  page: 1,
  pageSize: 20,
};

/**
 * 任务状态管理 Store
 * 使用 Zustand + devtools 中间件
 */
export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      tasks: [],
      currentTask: null,
      pagination: {
        total: 0,
        current: 1,
        pageSize: 20,
        pages: 0,
      },
      statistics: {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      },
      isLoading: false,
      error: null,
      activeSubscriptions: new Set(),
      queryParams: { ...defaultQueryParams },

      /**
       * 获取任务列表
       */
      fetchTasks: async (params?: TaskQueryParams) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = { ...get().queryParams, ...params };
          const response: PageResponse<Task> = await taskService.getTasks(queryParams);

          set({
            tasks: response.records,
            pagination: {
              total: response.total,
              current: response.current,
              pageSize: response.size,
              pages: response.pages,
            },
            queryParams,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取任务列表失败',
            isLoading: false,
          });
        }
      },

      /**
       * 获取任务详情
       */
      fetchTaskById: async (id: string): Promise<any> => {
        set({ isLoading: true, error: null });
        try {
          const task = await taskService.getTaskById(String(id));
          set({ currentTask: task as any, isLoading: false });
          return task as any;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取任务详情失败',
            isLoading: false,
          });
          return null;
        }
      },

      /**
       * 创建任务
       */
      createTask: async (data: CreateTaskRequest): Promise<Task | null> => {
        set({ isLoading: true, error: null });
        try {
          const task = await taskService.createTask(data);
          set((state) => ({
            tasks: [task, ...state.tasks],
            currentTask: task,
            isLoading: false,
          }));
          // 自动订阅新创建任务的进度更新
          get().subscribeToTask(task.id);
          return task;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建任务失败',
            isLoading: false,
          });
          return null;
        }
      },

      /**
       * 取消任务
       */
      cancelTask: async (id: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          await taskService.cancelTask(id);
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, status: 'CANCELLED' as TaskStatus } : t
            ),
            currentTask:
              state.currentTask?.id === id
                ? { ...state.currentTask, status: 'CANCELLED' as TaskStatus }
                : state.currentTask,
            isLoading: false,
          }));
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '取消任务失败',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * 重试任务
       */
      retryTask: async (id: string): Promise<any> => {
        set({ isLoading: true, error: null });
        try {
          const task = await taskService.retryTask(id);
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? task : t)),
            currentTask: task,
            isLoading: false,
          }));
          // 重新订阅任务进度
          get().subscribeToTask(task.id);
          return task;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '重试任务失败',
            isLoading: false,
          });
          return null;
        }
      },

      /**
       * 删除任务
       */
      deleteTask: async (id: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          await taskService.deleteTask(id);
          // 取消订阅
          get().unsubscribeFromTask(id);
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
            currentTask: state.currentTask?.id === id ? null : state.currentTask,
            activeSubscriptions: new Set(
              Array.from(state.activeSubscriptions).filter((tid) => tid !== id)
            ),
            isLoading: false,
          }));
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除任务失败',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * 获取任务统计
       */
      fetchStatistics: async () => {
        try {
          const stats = await taskService.getTaskStatistics();
          set({ statistics: stats });
        } catch (error) {
          console.error('获取任务统计失败:', error);
        }
      },

      /**
       * 订阅任务进度更新（WebSocket）
       */
      subscribeToTask: (taskId: string) => {
        const { activeSubscriptions } = get();
        if (activeSubscriptions.has(taskId)) return;

        taskService.subscribeToProgress(taskId, (update: TaskProgressUpdate) => {
          get().updateTaskProgress(update);
        });

        set((state) => ({
          activeSubscriptions: new Set([...state.activeSubscriptions, taskId]),
        }));
      },

      /**
       * 取消订阅任务进度更新
       */
      unsubscribeFromTask: (taskId: string) => {
        taskService.unsubscribeFromProgress(taskId);
        set((state) => ({
          activeSubscriptions: new Set(
            [...state.activeSubscriptions].filter((id) => id !== taskId)
          ),
        }));
      },

      /**
       * 更新任务进度（WebSocket 回调）
       */
      updateTaskProgress: (update: TaskProgressUpdate) => {
        set((state) => {
          const updatedTasks = state.tasks.map((task) =>
            task.id === update.taskId
              ? {
                  ...task,
                  status: update.status,
                  progress: update.progress,
                  currentNodeId: update.currentNodeId,
                }
              : task
          );

          const updatedCurrentTask =
            state.currentTask?.id === update.taskId
              ? {
                  ...state.currentTask,
                  status: update.status,
                  progress: update.progress,
                  currentNodeId: update.currentNodeId,
                  nodeExecutions: update.nodeExecution
                    ? [
                        ...state.currentTask.nodeExecutions.filter(
                          (ne) => ne.nodeId !== update.nodeExecution?.nodeId
                        ),
                        update.nodeExecution,
                      ]
                    : state.currentTask.nodeExecutions,
                }
              : state.currentTask;

          return {
            tasks: updatedTasks,
            currentTask: updatedCurrentTask,
          };
        });
      },

      /**
       * 设置查询参数
       */
      setQueryParams: (params: Partial<TaskQueryParams>) => {
        set((state) => ({
          queryParams: { ...state.queryParams, ...params },
        }));
      },

      /**
       * 重置查询参数
       */
      resetQueryParams: () => {
        set({ queryParams: { ...defaultQueryParams } });
      },

      /**
       * 清除当前任务
       */
      clearCurrentTask: () => {
        set({ currentTask: null });
      },

      /**
       * 清除错误信息
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'TaskStore' }
  )
);

export default useTaskStore;
