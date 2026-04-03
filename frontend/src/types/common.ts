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
  id: string;
  username: string;
  email: string;
  fullName?: string;
  realName?: string;
  role: 'admin' | 'expert' | 'user' | 'student';
  organization?: string;
  avatarUrl?: string;
  avatar?: string;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 角色选项
export const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员', color: 'red' },
  { value: 'expert', label: '专家', color: 'blue' },
  { value: 'user', label: '普通用户', color: 'green' },
  { value: 'student', label: '学生', color: 'orange' },
];

export const ROLE_MAP = Object.fromEntries(
  ROLE_OPTIONS.map(o => [o.value, o])
) as Record<string, { label: string; color: string }>;

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
