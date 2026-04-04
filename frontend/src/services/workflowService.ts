import { api } from './api';
import {
  Workflow,
  CreateWorkflowRequest,
  PageResponse,
  WorkflowDefinition,
  Task,
} from '../types';

/**
 * 工作流查询参数
 */
interface WorkflowQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isPublic?: boolean;
  tags?: string;
}

/**
 * 工作流服务
 * 处理工作流的 CRUD 操作和查询
 */
export const workflowService = {
  /**
   * 获取工作流列表
   * @param params 查询参数
   * @returns 分页工作流列表
   */
  getWorkflows: async (
    params?: WorkflowQueryParams
  ): Promise<PageResponse<Workflow>> => {
    return api.get<PageResponse<Workflow>>('/workflows', params as Record<string, unknown>);
  },

  /**
   * 获取工作流详情
   * @param id 工作流 ID
   * @returns 工作流详情
   */
  getWorkflowById: async (id: string): Promise<Workflow> => {
    return api.get<Workflow>(`/workflows/${id}`);
  },

  /**
   * 创建工作流
   * @param data 工作流数据
   * @returns 创建的工作流
   */
  createWorkflow: async (data: CreateWorkflowRequest): Promise<Workflow> => {
    return api.post<Workflow>('/workflows', data);
  },

  /**
   * 更新工作流
   * @param id 工作流 ID
   * @param data 更新数据
   * @returns 更新后的工作流
   */
  updateWorkflow: async (
    id: string,
    data: Partial<CreateWorkflowRequest>
  ): Promise<Workflow> => {
    return api.put<Workflow>(`/workflows/${id}`, data);
  },

  /**
   * 删除工作流
   * @param id 工作流 ID
   */
  deleteWorkflow: async (id: string): Promise<void> => {
    return api.delete<void>(`/workflows/${id}`);
  },

  /**
   * 获取公开工作流列表
   * @param params 查询参数
   * @returns 分页工作流列表
   */
  getPublicWorkflows: async (
    params?: Omit<WorkflowQueryParams, 'isPublic'>
  ): Promise<PageResponse<Workflow>> => {
    return api.get<PageResponse<Workflow>>('/workflows/public', params as Record<string, unknown>);
  },

  /**
   * 获取我的工作流列表
   * @param params 查询参数
   * @returns 分页工作流列表
   */
  getMyWorkflows: async (
    params?: Omit<WorkflowQueryParams, 'authorId'>
  ): Promise<PageResponse<Workflow>> => {
    return api.get<PageResponse<Workflow>>('/workflows/my', params as Record<string, unknown>);
  },

  /**
   * 搜索工作流
   * @param keyword 搜索关键词
   * @param params 其他查询参数
   * @returns 分页工作流列表
   */
  searchWorkflows: async (
    keyword: string,
    params?: Omit<WorkflowQueryParams, 'search'>
  ): Promise<PageResponse<Workflow>> => {
    return api.get<PageResponse<Workflow>>('/workflows/search', {
      ...params,
      search: keyword,
    } as Record<string, unknown>);
  },

  /**
   * 验证工作流定义
   * @param definition 工作流定义
   * @returns 验证结果
   */
  validateWorkflow: async (
    definition: WorkflowDefinition
  ): Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }> => {
    return api.post<{
      valid: boolean;
      errors?: string[];
      warnings?: string[];
    }>('/workflows/validate', { definition });
  },

  /**
   * 克隆工作流
   * @param id 源工作流 ID
   * @param newName 新工作流名称
   * @returns 克隆的工作流
   */
  cloneWorkflow: async (id: string, newName?: string): Promise<Workflow> => {
    return api.post<Workflow>(`/workflows/${id}/clone`, {
      name: newName,
    });
  },

  /**
   * 导出工作流
   * @param id 工作流 ID
   * @returns 工作流 JSON 数据
   */
  exportWorkflow: async (id: string): Promise<WorkflowDefinition> => {
    return api.get<WorkflowDefinition>(`/workflows/${id}/export`);
  },

  /**
   * 导入工作流
   * @param definition 工作流定义
   * @param name 工作流名称
   * @returns 导入的工作流
   */
  importWorkflow: async (
    definition: WorkflowDefinition,
    name: string,
    description?: string
  ): Promise<Workflow> => {
    return api.post<Workflow>('/workflows/import', {
      name,
      description,
      definition,
    });
  },

  /**
   * 获取工作流执行历史
   * @param id 工作流 ID
   * @returns 执行历史列表
   */
  runWorkflow: async (id: string, inputs?: Record<string, any>): Promise<Task> => {
    return api.post<Task>(`/workflows/${id}/run`, inputs ? { inputs: JSON.stringify(inputs) } : {});
  },

  getExecutionHistory: async (
    id: string
  ): Promise<
    Array<{
      taskId: number;
      status: string;
      startTime: string;
      endTime?: string;
      executedBy: number;
    }>
  > => {
    return api.get<
      Array<{
        taskId: number;
        status: string;
        startTime: string;
        endTime?: string;
        executedBy: number;
      }>
    >(`/workflows/${id}/history`);
  },

  /**
   * 获取工作流标签列表
   * @returns 标签列表
   */
  getTags: async (): Promise<string[]> => {
    return api.get<string[]>('/workflows/tags');
  },

  /**
   * 更新工作流定义（仅更新节点和边）
   * @param id 工作流 ID
   * @param definition 工作流定义
   * @returns 更新后的工作流
   */
  updateDefinition: async (
    id: string,
    definition: WorkflowDefinition
  ): Promise<Workflow> => {
    return api.patch<Workflow>(`/workflows/${id}/definition`, { definition });
  },

  /**
   * 设置工作流公开/私有
   * @param id 工作流 ID
   * @param isPublic 是否公开
   */
  setPublic: async (id: string, isPublic: boolean): Promise<void> => {
    return api.patch<void>(`/workflows/${id}/visibility`, { isPublic });
  },
};

export default workflowService;
