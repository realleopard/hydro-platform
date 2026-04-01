import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // 侧边栏状态
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({
    sidebarCollapsed: !state.sidebarCollapsed
  })),

  // 主题
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),

  // 通知
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now();
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id }
      ]
    }));

    // 自动移除
    setTimeout(() => {
      get().removeNotification(id);
    }, notification.duration || 5000);

    return id;
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  // 模态框
  modals: {},
  openModal: (name, data = null) => set((state) => ({
    modals: { ...state.modals, [name]: { open: true, data } }
  })),
  closeModal: (name) => set((state) => ({
    modals: { ...state.modals, [name]: { open: false, data: null } }
  })),

  // 全局加载状态
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  // 面包屑
  breadcrumbs: [],
  setBreadcrumbs: (items) => set({ breadcrumbs: items })
}));
