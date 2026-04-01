import apiClient from './api';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  ApiResponse,
} from '../types';

/**
 * 认证服务
 * 处理用户登录、注册、登出等认证相关操作
 */
export const authService = {
  /**
   * 用户登录
   * @param username 用户名
   * @param password 密码
   * @returns 登录响应，包含 token 和用户信息
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      { username, password } as LoginRequest
    );
    const data = response.data.data;

    // 保存 token 到 localStorage
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    return data;
  },

  /**
   * 用户注册
   * @param registerData 注册信息
   */
  register: async (registerData: RegisterRequest): Promise<void> => {
    await apiClient.post<ApiResponse<void>>('/auth/register', registerData);
  },

  /**
   * 用户登出
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post<ApiResponse<void>>('/auth/logout');
    } finally {
      // 清除本地存储的 token
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  /**
   * 获取当前登录用户信息
   * @returns 用户信息
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  /**
   * 刷新访问令牌
   * @returns 新的访问令牌
   */
  refreshToken: async (): Promise<string> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );

    const { accessToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  },

  /**
   * 修改密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  changePassword: async (
    oldPassword: string,
    newPassword: string
  ): Promise<void> => {
    await apiClient.post<ApiResponse<void>>('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },

  /**
   * 检查是否已登录
   * @returns 是否已登录
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('accessToken');
  },

  /**
   * 获取存储的访问令牌
   * @returns 访问令牌
   */
  getToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },

  /**
   * 获取存储的刷新令牌
   * @returns 刷新令牌
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem('refreshToken');
  },
};

export default authService;
