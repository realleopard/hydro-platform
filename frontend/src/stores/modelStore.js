import { create } from 'zustand';
import { modelService } from '../services/modelService';

export const useModelStore = create((set, get) => ({
  // 状态
  models: [],
  currentModel: null,
  myModels: [],
  categories: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0
  },

  // 获取模型列表
  fetchModels: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await modelService.getModels(params);
      set({
        models: data.items || data,
        pagination: data.pagination || get().pagination,
        loading: false
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 获取我的模型
  fetchMyModels: async () => {
    set({ loading: true, error: null });
    try {
      const data = await modelService.getMyModels();
      set({ myModels: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 获取模型详情
  fetchModel: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await modelService.getModel(id);
      set({ currentModel: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // 创建模型
  createModel: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await modelService.createModel(data);
      set({ loading: false });
      get().fetchModels();
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // 更新模型
  updateModel: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const result = await modelService.updateModel(id, data);
      set({
        currentModel: result,
        loading: false
      });
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // 删除模型
  deleteModel: async (id) => {
    set({ loading: true, error: null });
    try {
      await modelService.deleteModel(id);
      set({
        models: get().models.filter(m => m.id !== id),
        loading: false
      });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // 发布模型
  publishModel: async (id) => {
    try {
      await modelService.publishModel(id);
      get().fetchModel(id);
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // 清除当前模型
  clearCurrentModel: () => set({ currentModel: null }),

  // 清除错误
  clearError: () => set({ error: null })
}));
