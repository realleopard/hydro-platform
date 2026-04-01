import request from '../utils/request';

export const datasetService = {
  // 获取数据集列表
  getDatasets(params = {}) {
    return request.get('/datasets', { params });
  },

  // 获取我的数据集
  getMyDatasets() {
    return request.get('/datasets/my');
  },

  // 获取数据集详情
  getDataset(id) {
    return request.get(`/datasets/${id}`);
  },

  // 创建数据集
  createDataset(data) {
    return request.post('/datasets', data);
  },

  // 更新数据集
  updateDataset(id, data) {
    return request.put(`/datasets/${id}`, data);
  },

  // 删除数据集
  deleteDataset(id) {
    return request.delete(`/datasets/${id}`);
  }
};
