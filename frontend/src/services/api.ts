import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { ApiResponse } from '../types';

// API 基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.30.107:8080';
const API_TIMEOUT = 30000;

// 创建 Axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    // 检查业务逻辑错误码
    if (response.data.code !== 200) {
      const error = new Error(response.data.message || '请求失败');
      (error as Error & { code: number }).code = response.data.code;
      throw error;
    }
    return response;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // 未授权，清除 token 并跳转登录
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          break;
        case 403:
          console.error('权限不足:', data?.message);
          break;
        case 404:
          console.error('资源不存在:', data?.message);
          break;
        case 500:
          console.error('服务器错误:', data?.message);
          break;
        default:
          console.error(`HTTP ${status}:`, data?.message);
      }

      const customError = new Error(
        data?.message || `请求失败: ${status}`
      ) as Error & { code: number; status: number };
      customError.code = data?.code || status;
      customError.status = status;
      return Promise.reject(customError);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      const networkError = new Error(
        '网络错误，请检查网络连接'
      ) as Error & { code: string };
      networkError.code = 'NETWORK_ERROR';
      return Promise.reject(networkError);
    } else {
      // 请求配置出错
      return Promise.reject(new Error(error.message));
    }
  }
);

// 导出 API 客户端
export { apiClient };

// 导出通用请求方法
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiClient
      .get<ApiResponse<T>>(url, { params })
      .then((res) => res.data.data),

  post: <T>(url: string, data?: unknown) =>
    apiClient.post<ApiResponse<T>>(url, data).then((res) => res.data.data),

  put: <T>(url: string, data?: unknown) =>
    apiClient.put<ApiResponse<T>>(url, data).then((res) => res.data.data),

  patch: <T>(url: string, data?: unknown) =>
    apiClient.patch<ApiResponse<T>>(url, data).then((res) => res.data.data),

  delete: <T>(url: string) =>
    apiClient.delete<ApiResponse<T>>(url).then((res) => res.data.data),
};

export default apiClient;
