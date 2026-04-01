import taskService from '../taskService';
import request from '../../utils/request';

// Mock request module
jest.mock('../../utils/request');

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const mockData = {
        workflowId: '123',
        inputs: { key: 'value' },
        parameters: { param1: 1 }
      };
      const mockResponse = {
        code: 200,
        data: { id: 'task-1', status: 'PENDING' }
      };
      request.post.mockResolvedValueOnce(mockResponse);

      const result = await taskService.createTask(mockData);

      expect(request.post).toHaveBeenCalledWith('/tasks', mockData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle error when creating task fails', async () => {
      const mockData = { workflowId: '123' };
      const error = new Error('Network error');
      request.post.mockRejectedValueOnce(error);

      await expect(taskService.createTask(mockData)).rejects.toThrow('Network error');
    });
  });

  describe('getTask', () => {
    it('should fetch task details', async () => {
      const taskId = 'task-1';
      const mockResponse = {
        code: 200,
        data: { id: taskId, status: 'RUNNING' }
      };
      request.get.mockResolvedValueOnce(mockResponse);

      const result = await taskService.getTask(taskId);

      expect(request.get).toHaveBeenCalledWith(`/tasks/${taskId}`);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listTasks', () => {
    it('should fetch task list with pagination', async () => {
      const params = { page: 1, pageSize: 20, status: 'COMPLETED' };
      const mockResponse = {
        code: 200,
        data: {
          list: [{ id: 'task-1' }],
          total: 1
        }
      };
      request.get.mockResolvedValueOnce(mockResponse);

      const result = await taskService.listTasks(params);

      expect(request.get).toHaveBeenCalledWith('/tasks', { params });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a running task', async () => {
      const taskId = 'task-1';
      const mockResponse = { code: 200, data: null };
      request.post.mockResolvedValueOnce(mockResponse);

      await taskService.cancelTask(taskId);

      expect(request.post).toHaveBeenCalledWith(`/tasks/${taskId}/cancel`);
    });
  });

  describe('createWebSocket', () => {
    it('should create WebSocket connection', () => {
      const taskId = 'task-1';
      const mockWebSocket = { onopen: null, onmessage: null };
      global.WebSocket = jest.fn(() => mockWebSocket);

      const ws = taskService.createWebSocket(taskId);

      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining(`/ws/v1/tasks/${taskId}`)
      );
      expect(ws).toBe(mockWebSocket);
    });
  });
});
