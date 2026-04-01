import { create } from 'zustand';
import { workflowService } from '../services/workflowService';

export const useWorkflowStore = create((set, get) => ({
  // 状态
  workflows: [],
  currentWorkflow: null,
  myWorkflows: [],
  loading: false,
  error: null,

  // 编辑器状态
  editorState: {
    nodes: [],
    edges: [],
    selectedNode: null,
    isDirty: false
  },

  // 获取工作流列表
  fetchWorkflows: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await workflowService.getWorkflows(params);
      set({ workflows: data.items || data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 获取我的工作流
  fetchMyWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      const data = await workflowService.getMyWorkflows();
      set({ myWorkflows: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // 获取工作流详情
  fetchWorkflow: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await workflowService.getWorkflow(id);
      set({
        currentWorkflow: data,
        editorState: {
          nodes: data.definition?.nodes || [],
          edges: data.definition?.edges || [],
          selectedNode: null,
          isDirty: false
        },
        loading: false
      });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // 创建工作流
  createWorkflow: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await workflowService.createWorkflow(data);
      set({ loading: false });
      get().fetchWorkflows();
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // 更新工作流
  updateWorkflow: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const result = await workflowService.updateWorkflow(id, data);
      set({
        currentWorkflow: result,
        editorState: { ...get().editorState, isDirty: false },
        loading: false
      });
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // 删除工作流
  deleteWorkflow: async (id) => {
    set({ loading: true, error: null });
    try {
      await workflowService.deleteWorkflow(id);
      set({
        workflows: get().workflows.filter(w => w.id !== id),
        loading: false
      });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // 运行工作流
  runWorkflow: async (id) => {
    try {
      const result = await workflowService.runWorkflow(id);
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // 编辑器操作
  addNode: (node) => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        nodes: [...state.editorState.nodes, node],
        isDirty: true
      }
    }));
  },

  updateNode: (nodeId, data) => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        nodes: state.editorState.nodes.map(n =>
          n.id === nodeId ? { ...n, ...data } : n
        ),
        isDirty: true
      }
    }));
  },

  removeNode: (nodeId) => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        nodes: state.editorState.nodes.filter(n => n.id !== nodeId),
        edges: state.editorState.edges.filter(
          e => e.source !== nodeId && e.target !== nodeId
        ),
        isDirty: true
      }
    }));
  },

  addEdge: (edge) => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        edges: [...state.editorState.edges, edge],
        isDirty: true
      }
    }));
  },

  removeEdge: (edgeId) => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        edges: state.editorState.edges.filter(e => e.id !== edgeId),
        isDirty: true
      }
    }));
  },

  setSelectedNode: (node) => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        selectedNode: node
      }
    }));
  },

  clearEditor: () => {
    set({
      editorState: {
        nodes: [],
        edges: [],
        selectedNode: null,
        isDirty: false
      }
    });
  },

  clearError: () => set({ error: null })
}));
