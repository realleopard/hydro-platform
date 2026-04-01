import request from '../utils/request';

export const workflowService = {
  // 获取工作流列表
  getWorkflows(params = {}) {
    return request.get('/workflows', { params });
  },

  // 获取我的工作流
  getMyWorkflows() {
    return request.get('/workflows/my');
  },

  // 获取工作流详情
  getWorkflow(id) {
    return request.get(`/workflows/${id}`);
  },

  // 创建工作流
  createWorkflow(data) {
    return request.post('/workflows', data);
  },

  // 更新工作流
  updateWorkflow(id, data) {
    return request.put(`/workflows/${id}`, data);
  },

  // 删除工作流
  deleteWorkflow(id) {
    return request.delete(`/workflows/${id}`);
  },

  // 运行工作流
  runWorkflow(id) {
    return request.post(`/workflows/${id}/run`);
  },

  // 获取工作流执行历史
  getWorkflowRuns(id) {
    return request.get(`/workflows/${id}/runs`);
  }
};
