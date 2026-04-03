import api from './api';

export const userService = {
  getUsers: (params?: Record<string, unknown>) =>
    api.get('/users', params),

  getUser: (id: string) =>
    api.get(`/users/${id}`),

  updateUser: (id: string, data: Record<string, unknown>) =>
    api.put(`/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/users/${id}`),
};
