import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { modelService } from '../services/modelService';
import {
  Model,
  CreateModelRequest,
  UpdateModelRequest,
  ModelQueryParams,
  PageResponse,
} from '../types';

/**
 * 模型状态接口
 */
interface ModelState {
  // 状态
  models: Model[];
  currentModel: Model | null;
  pagination: {
    total: number;
    current: number;
    pageSize: number;
    pages: number;
  };
  categories: string[];
  tags: string[];
  isLoading: boolean;
  error: string | null;

  // 查询参数
  queryParams: ModelQueryParams;

  // 动作
  fetchModels: (params?: ModelQueryParams) => Promise<void>;
  fetchModelById: (id: number) => Promise<Model | null>;
  createModel: (data: CreateModelRequest) => Promise<Model | null>;
  updateModel: (id: number, data: UpdateModelRequest) => Promise<Model | null>;
  deleteModel: (id: number) => Promise<boolean>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  setQueryParams: (params: Partial<ModelQueryParams>) => void;
  resetQueryParams: () => void;
  clearCurrentModel: () => void;
  clearError: () => void;
}

/**
 * 默认查询参数
 */
const defaultQueryParams: ModelQueryParams = {
  page: 1,
  pageSize: 20,
};

/**
 * 模型状态管理 Store
 * 使用 Zustand + devtools 中间件
 */
export const useModelStore = create<ModelState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      models: [],
      currentModel: null,
      pagination: {
        total: 0,
        current: 1,
        pageSize: 20,
        pages: 0,
      },
      categories: [],
      tags: [],
      isLoading: false,
      error: null,
      queryParams: { ...defaultQueryParams },

      /**
       * 获取模型列表
       */
      fetchModels: async (params?: ModelQueryParams) => {
        set({ isLoading: true, error: null });
        try {
          const queryParams = { ...get().queryParams, ...params };
          const response: PageResponse<Model> = await modelService.getModels(queryParams);

          set({
            models: response.records,
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
            error: error instanceof Error ? error.message : '获取模型列表失败',
            isLoading: false,
          });
        }
      },

      /**
       * 获取模型详情
       */
      fetchModelById: async (id: number): Promise<Model | null> => {
        set({ isLoading: true, error: null });
        try {
          const model = await modelService.getModelById(id);
          set({ currentModel: model, isLoading: false });
          return model;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取模型详情失败',
            isLoading: false,
          });
          return null;
        }
      },

      /**
       * 创建模型
       */
      createModel: async (data: CreateModelRequest): Promise<Model | null> => {
        set({ isLoading: true, error: null });
        try {
          const model = await modelService.createModel(data);
          set((state) => ({
            models: [model, ...state.models],
            currentModel: model,
            isLoading: false,
          }));
          return model;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建模型失败',
            isLoading: false,
          });
          return null;
        }
      },

      /**
       * 更新模型
       */
      updateModel: async (id: number, data: UpdateModelRequest): Promise<Model | null> => {
        set({ isLoading: true, error: null });
        try {
          const model = await modelService.updateModel(id, data);
          set((state) => ({
            models: state.models.map((m) => (m.id === id ? model : m)),
            currentModel: model,
            isLoading: false,
          }));
          return model;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新模型失败',
            isLoading: false,
          });
          return null;
        }
      },

      /**
       * 删除模型
       */
      deleteModel: async (id: number): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          await modelService.deleteModel(id);
          set((state) => ({
            models: state.models.filter((m) => m.id !== id),
            currentModel: state.currentModel?.id === id ? null : state.currentModel,
            isLoading: false,
          }));
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除模型失败',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * 获取分类列表
       */
      fetchCategories: async () => {
        try {
          const categories = await modelService.getCategories();
          set({ categories });
        } catch (error) {
          console.error('获取分类列表失败:', error);
        }
      },

      /**
       * 获取标签列表
       */
      fetchTags: async () => {
        try {
          const tags = await modelService.getTags();
          set({ tags });
        } catch (error) {
          console.error('获取标签列表失败:', error);
        }
      },

      /**
       * 设置查询参数
       */
      setQueryParams: (params: Partial<ModelQueryParams>) => {
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
       * 清除当前模型
       */
      clearCurrentModel: () => {
        set({ currentModel: null });
      },

      /**
       * 清除错误信息
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'ModelStore' }
  )
);

export default useModelStore;
