import api from './api';

export const userService = {
  getCurrentUser: () => api.get('/auth/me'),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),

  getUsers: (params?: Record<string, unknown>) =>
    api.get('/users', params),

  getUser: (id: string) =>
    api.get(`/users/${id}`),

  updateUser: (id: string, data: Record<string, unknown>) =>
    api.put(`/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/users/${id}`),
};
