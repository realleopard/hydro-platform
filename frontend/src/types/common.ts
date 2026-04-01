// 通用类型定义

// API 响应包装器
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
}

// 分页响应数据
export interface PageResponse<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages: number;
}

// 分页请求参数
export interface PageRequest {
  page?: number;
  pageSize?: number;
}

// 排序参数
export interface SortParam {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 用户信息
export interface User {
  id: number;
  username: string;
  email: string;
  realName?: string;
  role: 'admin' | 'expert' | 'user' | 'student';
  organization?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  token?: string; // 后端返回 token 字段的兼容
  user: User;
}

// 注册请求
export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  fullName?: string;
  realName?: string;
  organization?: string;
  organizationId?: number;
}
