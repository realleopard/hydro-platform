import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // 状态
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authService.login(username, password);
          set({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false
          });
          return true;
        } catch (error) {
          set({
            error: error.message,
            isLoading: false,
            isAuthenticated: false
          });
          return false;
        }
      },

      // 注册
      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(data);
          set({ isLoading: false });
          return true;
        } catch (error) {
          set({
            error: error.message,
            isLoading: false
          });
          return false;
        }
      },

      // 登出
      logout: () => {
        authService.logout().catch(() => {});
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null
        });
      },

      // 获取当前用户信息
      fetchCurrentUser: async () => {
        try {
          const user = await authService.getCurrentUser();
          set({ user });
          return user;
        } catch (error) {
          set({ isAuthenticated: false });
          return null;
        }
      },

      // 更新用户信息
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },

      // 清除错误
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user
      })
    }
  )
);
