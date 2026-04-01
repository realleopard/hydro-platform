import { taskService } from '../taskService';
import { api } from '../api';

// Mock api module
jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should fetch task list', async () => {
      const mockResponse = {
        records: [{ id: 1, status: 'RUNNING' }],
        total: 1,
      };
      api.get.mockResolvedValueOnce(mockResponse);

      const result = await taskService.getTasks({ page: 1, pageSize: 20 });

      expect(api.get).toHaveBeenCalledWith('/tasks', { page: 1, pageSize: 20 });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getTaskById', () => {
    it('should fetch task details', async () => {
      const mockTask = { id: 1, status: 'RUNNING' };
      api.get.mockResolvedValueOnce(mockTask);

      const result = await taskService.getTaskById(1);

      expect(api.get).toHaveBeenCalledWith('/tasks/1');
      expect(result).toEqual(mockTask);
    });
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const mockData = { workflowId: 1, inputs: { key: 'value' } };
      const mockTask = { id: 1, status: 'PENDING' };
      api.post.mockResolvedValueOnce(mockTask);

      const result = await taskService.createTask(mockData);

      expect(api.post).toHaveBeenCalledWith('/tasks', mockData);
      expect(result).toEqual(mockTask);
    });

    it('should handle creation error', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(taskService.createTask({})).rejects.toThrow('Network error');
    });
  });

  describe('cancelTask', () => {
    it('should cancel a running task', async () => {
      api.post.mockResolvedValueOnce(undefined);

      await taskService.cancelTask(1);

      expect(api.post).toHaveBeenCalledWith('/tasks/1/cancel');
    });
  });

  describe('retryTask', () => {
    it('should retry a failed task', async () => {
      const mockTask = { id: 2, status: 'PENDING' };
      api.post.mockResolvedValueOnce(mockTask);

      const result = await taskService.retryTask(1);

      expect(api.post).toHaveBeenCalledWith('/tasks/1/retry');
      expect(result).toEqual(mockTask);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      api.delete.mockResolvedValueOnce(undefined);

      await taskService.deleteTask(1);

      expect(api.delete).toHaveBeenCalledWith('/tasks/1');
    });
  });

  describe('getTaskLogs', () => {
    it('should fetch task logs', async () => {
      const mockLogs = ['line 1', 'line 2'];
      api.get.mockResolvedValueOnce(mockLogs);

      const result = await taskService.getTaskLogs(1);

      expect(api.get).toHaveBeenCalledWith('/tasks/1/logs', {});
      expect(result).toEqual(mockLogs);
    });

    it('should fetch logs for specific node', async () => {
      api.get.mockResolvedValueOnce([]);

      await taskService.getTaskLogs(1, 'node-1');

      expect(api.get).toHaveBeenCalledWith('/tasks/1/logs', { nodeId: 'node-1' });
    });
  });

  describe('getTaskStatistics', () => {
    it('should fetch task statistics', async () => {
      const mockStats = { total: 10, pending: 2, running: 1, completed: 5, failed: 1, cancelled: 1 };
      api.get.mockResolvedValueOnce(mockStats);

      const result = await taskService.getTaskStatistics();

      expect(api.get).toHaveBeenCalledWith('/tasks/statistics');
      expect(result).toEqual(mockStats);
    });
  });

  describe('subscribeToProgress', () => {
    it('should return unsubscribe function', () => {
      const callback = jest.fn();

      const unsubscribe = taskService.subscribeToProgress(1, callback);

      expect(typeof unsubscribe).toBe('function');
      // Cleanup
      unsubscribe();
    });
  });

  describe('utility methods', () => {
    it('getStatusColor should return color for known status', () => {
      expect(taskService.getStatusColor('COMPLETED')).toBe('#52c41a');
      expect(taskService.getStatusColor('FAILED')).toBe('#f5222d');
    });

    it('getStatusText should return Chinese text for known status', () => {
      expect(taskService.getStatusText('RUNNING')).toBe('运行中');
      expect(taskService.getStatusText('COMPLETED')).toBe('已完成');
    });

    it('isActive should identify active statuses', () => {
      expect(taskService.isActive('PENDING')).toBe(true);
      expect(taskService.isActive('RUNNING')).toBe(true);
      expect(taskService.isActive('COMPLETED')).toBe(false);
    });

    it('isCompleted should identify completed statuses', () => {
      expect(taskService.isCompleted('COMPLETED')).toBe(true);
      expect(taskService.isCompleted('FAILED')).toBe(true);
      expect(taskService.isCompleted('RUNNING')).toBe(false);
    });
  });
});
