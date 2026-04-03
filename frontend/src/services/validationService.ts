import { api } from './api';

/**
 * 模型验证服务
 * 处理模型验证指标计算和管理
 */
export const validationService = {
  /**
   * 创建验证记录
   */
  createValidation: async (data: {
    modelId: string;
    versionId?: string;
    referenceDatasetId?: string;
  }): Promise<any> => {
    return api.post<any>('/validations', data);
  },

  /**
   * 执行验证计算
   */
  performValidation: async (
    validationId: string,
    data: { observed: number[]; simulated: number[] }
  ): Promise<any> => {
    return api.post<any>(`/validations/${validationId}/perform`, data);
  },

  /**
   * 获取验证指标结果
   */
  getValidationMetrics: async (validationId: string): Promise<any> => {
    return api.get<any>(`/validations/${validationId}/metrics`);
  },

  /**
   * 获取模型的所有验证记录
   */
  getModelValidations: async (modelId: string): Promise<any[]> => {
    return api.get<any[]>(`/validations/model/${modelId}`);
  },

  /**
   * 获取模型最新验证指标
   */
  getLatestMetrics: async (modelId: string): Promise<any> => {
    return api.get<any>(`/validations/model/${modelId}/latest`);
  },

  /**
   * 直接计算指标（不保存）
   */
  calculateDirectly: async (data: {
    observed: number[];
    simulated: number[];
  }): Promise<any> => {
    return api.post<any>('/validations/calculate', data);
  },

  /**
   * 批量验证
   */
  batchValidate: async (validations: any[]): Promise<any[]> => {
    return api.post<any[]>('/validations/batch', validations);
  },
};

export default validationService;
