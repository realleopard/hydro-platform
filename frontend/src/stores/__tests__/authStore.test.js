import { useAuthStore } from '../authStore';
import authService from '../../services/authService';

// Mock authService
jest.mock('../../services/authService');

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const credentials = { username: 'test', password: 'password' };
      const mockResponse = {
        accessToken: 'token-123',
        user: { id: 1, username: 'test' }
      };
      authService.login.mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().login(credentials);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockResponse.user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const credentials = { username: 'test', password: 'wrong' };
      const error = new Error('Invalid credentials');
      authService.login.mockRejectedValueOnce(error);

      await expect(useAuthStore.getState().login(credentials)).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(error.message);
    });
  });

  describe('logout', () => {
    it('should clear user data on logout', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: { id: 1, username: 'test' },
        isAuthenticated: true
      });
      authService.logout.mockResolvedValueOnce();

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
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

  describe('setUser', () => {
    it('should update user data', () => {
      const user = { id: 1, username: 'test' };

      useAuthStore.getState().setUser(user);

      expect(useAuthStore.getState().user).toEqual(user);
    });
  });
});
