import axios from 'axios';

// API 基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const API_TIMEOUT = 30000;

// 创建 Axios 实例
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    // 检查业务逻辑错误码
    if (response.data.code !== 200) {
      const error = new Error(response.data.message || '请求失败');
      error.code = response.data.code;
      throw error;
    }
    return response;
  },
  (error) => {
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
      );
      customError.code = data?.code || status;
      customError.status = status;
      return Promise.reject(customError);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      const networkError = new Error('网络错误，请检查网络连接');
      networkError.code = 'NETWORK_ERROR';
      return Promise.reject(networkError);
    } else {
      // 请求配置出错
      return Promise.reject(new Error(error.message));
    }
  }
);

// 导出通用请求方法
export const api = {
  get: (url, params) =>
    apiClient
      .get(url, { params })
      .then((res) => res.data.data),

  post: (url, data) =>
    apiClient.post(url, data).then((res) => res.data.data),

  put: (url, data) =>
    apiClient.put(url, data).then((res) => res.data.data),

  patch: (url, data) =>
    apiClient.patch(url, data).then((res) => res.data.data),

  delete: (url) =>
    apiClient.delete(url).then((res) => res.data.data),
};

export { apiClient };
export default apiClient;
