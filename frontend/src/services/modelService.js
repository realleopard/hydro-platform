import { api } from './api';

/**
 * 模型服务
 * 处理水文模型的 CRUD 操作和查询
 */
export const modelService = {
  /**
   * 获取模型列表
   * @param params 查询参数
   * @returns 分页模型列表
   */
  getModels: async (params = {}) => {
    return api.get('/models', params);
  },

  /**
   * 获取模型详情
   * @param id 模型 ID
   * @returns 模型详情
   */
  getModelById: async (id) => {
    return api.get(`/models/${id}`);
  },

  /**
   * 创建模型
   * @param data 模型数据
   * @returns 创建的模型
   */
  createModel: async (data) => {
    return api.post('/models', data);
  },

  /**
   * 更新模型
   * @param id 模型 ID
   * @param data 更新数据
   * @returns 更新后的模型
   */
  updateModel: async (id, data) => {
    return api.put(`/models/${id}`, data);
  },

  /**
   * 删除模型
   * @param id 模型 ID
   */
  deleteModel: async (id) => {
    return api.delete(`/models/${id}`);
  },

  /**
   * 获取公开模型列表
   * @param params 查询参数
   * @returns 分页模型列表
   */
  getPublicModels: async (params = {}) => {
    return api.get('/models/public', params);
  },

  /**
   * 获取我的模型列表
   * @param params 查询参数
   * @returns 分页模型列表
   */
  getMyModels: async (params = {}) => {
    return api.get('/models/my', params);
  },

  /**
   * 搜索模型
   * @param keyword 搜索关键词
   * @param params 其他查询参数
   * @returns 分页模型列表
   */
  searchModels: async (keyword, params = {}) => {
    return api.get('/models/search', {
      ...params,
      search: keyword,
    });
  },

  /**
   * 获取模型分类列表
   * @returns 分类列表
   */
  getCategories: async () => {
    return api.get('/models/categories');
  },

  /**
   * 获取模型标签列表
   * @returns 标签列表
   */
  getTags: async () => {
    return api.get('/models/tags');
  },

  /**
   * 验证模型
   * @param id 模型 ID
   * @param datasetId 验证数据集 ID
   * @returns 验证结果
   */
  validateModel: async (id, datasetId) => {
    return api.post(`/models/${id}/validate`, { datasetId });
  },

  /**
   * 发布模型版本
   * @param id 模型 ID
   * @param version 版本号
   * @param changelog 变更日志
   */
  publishVersion: async (id, version, changelog) => {
    return api.post(`/models/${id}/versions`, {
      version,
      changelog,
    });
  },

  /**
   * 获取模型版本历史
   * @param id 模型 ID
   * @returns 版本列表
   */
  getVersions: async (id) => {
    return api.get(`/models/${id}/versions`);
  },
};

export default modelService;
