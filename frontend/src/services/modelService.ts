import { api } from './api';
import {
  Model,
  CreateModelRequest,
  UpdateModelRequest,
  ModelQueryParams,
  PageResponse,
} from '../types';

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
  getModels: async (
    params?: ModelQueryParams
  ): Promise<PageResponse<Model>> => {
    return api.get<PageResponse<Model>>('/models', params as Record<string, unknown>);
  },

  /**
   * 获取模型详情
   * @param id 模型 ID
   * @returns 模型详情
   */
  getModelById: async (id: number): Promise<Model> => {
    return api.get<Model>(`/models/${id}`);
  },

  /**
   * 创建模型
   * @param data 模型数据
   * @returns 创建的模型
   */
  createModel: async (data: CreateModelRequest): Promise<Model> => {
    return api.post<Model>('/models', data);
  },

  /**
   * 更新模型
   * @param id 模型 ID
   * @param data 更新数据
   * @returns 更新后的模型
   */
  updateModel: async (id: number, data: UpdateModelRequest): Promise<Model> => {
    return api.put<Model>(`/models/${id}`, data);
  },

  /**
   * 删除模型
   * @param id 模型 ID
   */
  deleteModel: async (id: number): Promise<void> => {
    return api.delete<void>(`/models/${id}`);
  },

  /**
   * 获取公开模型列表
   * @param params 查询参数
   * @returns 分页模型列表
   */
  getPublicModels: async (
    params?: Omit<ModelQueryParams, 'isPublic'>
  ): Promise<PageResponse<Model>> => {
    return api.get<PageResponse<Model>>('/models/public', {
      ...params,
    } as Record<string, unknown>);
  },

  /**
   * 获取我的模型列表
   * @param params 查询参数
   * @returns 分页模型列表
   */
  getMyModels: async (
    params?: Omit<ModelQueryParams, 'authorId'>
  ): Promise<PageResponse<Model>> => {
    return api.get<PageResponse<Model>>('/models/my', params as Record<string, unknown>);
  },

  /**
   * 搜索模型
   * @param keyword 搜索关键词
   * @param params 其他查询参数
   * @returns 分页模型列表
   */
  searchModels: async (
    keyword: string,
    params?: Omit<ModelQueryParams, 'search'>
  ): Promise<PageResponse<Model>> => {
    return api.get<PageResponse<Model>>('/models/search', {
      ...params,
      search: keyword,
    } as Record<string, unknown>);
  },

  /**
   * 获取模型分类列表
   * @returns 分类列表
   */
  getCategories: async (): Promise<string[]> => {
    return api.get<string[]>('/models/categories');
  },

  /**
   * 获取模型标签列表
   * @returns 标签列表
   */
  getTags: async (): Promise<string[]> => {
    return api.get<string[]>('/models/tags');
  },

  /**
   * 验证模型
   * @param id 模型 ID
   * @param datasetId 验证数据集 ID
   * @returns 验证结果
   */
  validateModel: async (
    id: number,
    datasetId: number
  ): Promise<{
    nse: number;
    rmse: number;
    mae: number;
    r2: number;
  }> => {
    return api.post<{
      nse: number;
      rmse: number;
      mae: number;
      r2: number;
    }>(`/models/${id}/validate`, { datasetId });
  },

  /**
   * 发布模型版本
   * @param id 模型 ID
   * @param version 版本号
   * @param changelog 变更日志
   */
  publishVersion: async (
    id: number,
    version: string,
    changelog?: string
  ): Promise<void> => {
    return api.post<void>(`/models/${id}/versions`, {
      version,
      changelog,
    });
  },

  /**
   * 获取模型版本历史
   * @param id 模型 ID
   * @returns 版本列表
   */
  getVersions: async (
    id: number
  ): Promise<
    Array<{
      version: string;
      changelog: string;
      createdAt: string;
      createdBy: number;
    }>
  > => {
    return api.get<
      Array<{
        version: string;
        changelog: string;
        createdAt: string;
        createdBy: number;
      }>
    >(`/models/${id}/versions`);
  },

  /**
   * 获取模型评价列表
   */
  getModelReviews: async (id: string): Promise<any[]> => {
    return api.get<any[]>(`/models/${id}/reviews`);
  },

  /**
   * 创建模型评价
   */
  createModelReview: async (id: string, data: { rating: number; comment: string }): Promise<any> => {
    return api.post<any>(`/models/${id}/reviews`, data);
  },
};

export default modelService;
