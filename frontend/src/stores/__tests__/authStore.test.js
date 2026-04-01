import { useAuthStore } from '../authStore';
import { authService } from '../../services/authService';

// Mock authService
jest.mock('../../services/authService', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        user: { id: 1, username: 'test' },
      };
      authService.login.mockResolvedValueOnce(mockResponse);

      const result = await useAuthStore.getState().login('test', 'password');

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockResponse.user);
      expect(state.token).toBe('token-123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle login failure', async () => {
      authService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

      const result = await useAuthStore.getState().login('test', 'wrong');

      expect(result).toBe(false);
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should clear user data on logout', () => {
      useAuthStore.setState({
        user: { id: 1, username: 'test' },
        token: 'token-123',
        isAuthenticated: true,
      });
      authService.logout.mockResolvedValueOnce();

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user data', () => {
      useAuthStore.setState({ user: { id: 1, username: 'test' } });

      useAuthStore.getState().updateUser({ username: 'updated' });

      expect(useAuthStore.getState().user).toEqual({ id: 1, username: 'updated' });
    });

    it('should not update when user is null', () => {
      useAuthStore.setState({ user: null });

      useAuthStore.getState().updateUser({ username: 'updated' });

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('setToken', () => {
    it('should set token and refreshToken', () => {
      useAuthStore.getState().setToken('new-token', 'new-refresh');

      const state = useAuthStore.getState();
      expect(state.token).toBe('new-token');
      expect(state.refreshToken).toBe('new-refresh');
    });
  });

  describe('fetchCurrentUser', () => {
    it('should fetch and set current user', async () => {
      const mockUser = { id: 1, username: 'test' };
      authService.getCurrentUser.mockResolvedValueOnce(mockUser);

      const user = await useAuthStore.getState().fetchCurrentUser();

      expect(user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should handle fetch failure', async () => {
      authService.getCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'));

      const user = await useAuthStore.getState().fetchCurrentUser();

      expect(user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
