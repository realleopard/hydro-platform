import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { User, LoginResponse } from '../types';

/**
 * 认证状态接口
 */
interface AuthState {
  // 状态
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 动作
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: {
    username: string;
    password: string;
    email: string;
    fullName: string;
    organizationId?: number;
  }) => Promise<boolean>;
  logout: () => void;
  fetchCurrentUser: () => Promise<User | null>;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
  setToken: (token: string, refreshToken: string) => void;
}

/**
 * 认证状态管理 Store
 * 使用 Zustand + persist 中间件实现状态持久化
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * 用户登录
       */
      login: async (username: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const data: LoginResponse = await authService.login(username, password);
          set({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '登录失败',
            isLoading: false,
            isAuthenticated: false,
          });
          return false;
        }
      },

      /**
       * 用户注册
       */
      register: async (data): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          await authService.register({
            username: data.username,
            password: data.password,
            email: data.email,
            fullName: data.fullName,
            organizationId: data.organizationId,
          });
          set({ isLoading: false });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '注册失败',
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * 用户登出
       */
      logout: () => {
        authService.logout().catch(() => {
          // 忽略登出 API 错误
        });
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      /**
       * 获取当前用户信息
       */
      fetchCurrentUser: async (): Promise<User | null> => {
        try {
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true });
          return user;
        } catch (error) {
          set({ isAuthenticated: false, user: null });
          return null;
        }
      },

      /**
       * 更新用户信息
       */
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      /**
       * 清除错误信息
       */
      clearError: () => set({ error: null }),

      /**
       * 设置 Token（用于刷新 token 场景）
       */
      setToken: (token: string, refreshToken: string) => {
        set({ token, refreshToken });
      },
    }),
    {
      name: 'auth-storage', // localStorage 键名
      partialize: (state) => ({
        // 只持久化这些字段
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
