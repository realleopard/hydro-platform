import request from '../utils/request';

export const datasetService = {
  // 获取数据集列表（支持服务端筛选）
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

  // 上传数据集文件
  uploadDataset(formData, onProgress) {
    return request.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      onUploadProgress: onProgress,
    });
  },

  // 下载数据集文件
  async downloadDataset(id) {
    const blob = await request.get(`/datasets/${id}/download`, {
      responseType: 'blob',
    });
    // 从 Content-Disposition 提取文件名，或用数据集 ID
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dataset_${id}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // 预览数据集内容
  previewDataset(id) {
    return request.get(`/datasets/${id}/preview`);
  },

  // 创建数据集（仅元数据）
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
