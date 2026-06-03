/**
 * @vitest-environment jsdom
 * Traceability Matrix:
 * - USER-05: Login flow state update
 * - USER-05 (Error): Failed login handles error
 * - USER-08: Logout flow clears state
 * - State-driven: Initializes user on mount if cookie exists
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../../../src/context/AuthContext';
import api from '../../../src/services/api';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  }
}));

const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout, refreshUser } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'done'}</div>
      <div data-testid="auth">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user">{user ? user.full_name : 'none'}</div>
      <button onClick={() => login({ email: 'test@test.com', password: '123' })} data-testid="btn-login">Login</button>
      <button onClick={logout} data-testid="btn-logout">Logout</button>
      <button onClick={refreshUser} data-testid="btn-refresh">Refresh</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state and attempt to fetch user', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { id: '1', full_name: 'Test User' } } });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state
    expect(screen.getByTestId('loading').textContent).toBe('loading');
    
    // After fetch
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done');
      expect(screen.getByTestId('auth').textContent).toBe('authenticated');
      expect(screen.getByTestId('user').textContent).toBe('Test User');
    });
    
    expect(api.get).toHaveBeenCalledWith('/users/me');
  });

  it('should handle unauthenticated state on initialization failure', async () => {
    api.get.mockRejectedValueOnce(new Error('Unauthorized'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done');
      expect(screen.getByTestId('auth').textContent).toBe('unauthenticated');
      expect(screen.getByTestId('user').textContent).toBe('none');
    });
  });

  it('should login user and update state on success', async () => {
    // Setup initial unauthenticated state
    api.get.mockRejectedValueOnce(new Error('Unauthorized'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('done'));
    
    // Mock successful login
    api.post.mockResolvedValueOnce({ data: { data: { user: { id: '2', full_name: 'Logged In User' } } } });
    
    act(() => {
      screen.getByTestId('btn-login').click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('authenticated');
      expect(screen.getByTestId('user').textContent).toBe('Logged In User');
    });
    
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: '123' });
  });

  it('should return error and keep state unauthenticated on failed login', async () => {
    // Setup initial unauthenticated state
    api.get.mockRejectedValueOnce(new Error('Unauthorized'));
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('done'));
    
    // Mock failed login
    api.post.mockRejectedValueOnce({
      response: {
        data: {
          error: { message: 'Sai thông tin' }
        }
      }
    });
    
    let result;
    const TestComponentWithCallback = () => {
      const { login } = useAuth();
      return (
        <button onClick={async () => { result = await login({ email: 'test@test.com', password: '123' }); }} data-testid="btn-login-cb">
          Login CB
        </button>
      );
    };
    
    const { unmount } = render(
      <AuthProvider>
        <TestComponentWithCallback />
      </AuthProvider>
    );
    
    act(() => {
      screen.getByTestId('btn-login-cb').click();
    });
    
    await waitFor(() => {
      expect(result).toBeDefined();
    });
    
    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Sai thông tin');
    
    unmount();
  });

  it('should logout user and clear state', async () => {
    // Setup authenticated state
    api.get.mockResolvedValueOnce({ data: { data: { id: '1', full_name: 'Test User' } } });
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('authenticated'));
    
    // Mock successful logout
    api.post.mockResolvedValueOnce({});
    
    act(() => {
      screen.getByTestId('btn-logout').click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('unauthenticated');
      expect(screen.getByTestId('user').textContent).toBe('none');
    });
    
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('should throw error if useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });
});
