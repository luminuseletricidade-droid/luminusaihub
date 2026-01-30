import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides authentication context', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('signIn');
    expect(result.current).toHaveProperty('signOut');
    expect(result.current).toHaveProperty('isLoading');
  });

  it('starts with no authenticated user', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles successful sign in', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: {
        user: mockUser,
        session: {
          access_token: 'token',
          refresh_token: 'refresh',
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.signIn({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('handles sign in error', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error('Invalid credentials'),
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.signIn({
          email: 'test@example.com',
          password: 'wrong',
        });
      })
    ).rejects.toThrow('Invalid credentials');

    expect(result.current.user).toBeNull();
  });

  it('handles sign out', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.signOut();
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });

  it('handles session refresh', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: mockUser,
          access_token: 'token',
          refresh_token: 'refresh',
        },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('validates email format', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.signIn({
          email: 'invalid-email',
          password: 'password123',
        });
      })
    ).rejects.toThrow();
  });

  it('requires password', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.signIn({
          email: 'test@example.com',
          password: '',
        });
      })
    ).rejects.toThrow();
  });

  it('handles auth state changes', async () => {
    const authStateCallback = vi.fn();

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateCallback.mockImplementation(callback);
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
        error: null,
      };
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    act(() => {
      authStateCallback('SIGNED_IN', {
        user: mockUser,
        access_token: 'token',
      });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    act(() => {
      authStateCallback('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });

  it('cleans up auth listener on unmount', () => {
    const unsubscribe = vi.fn();

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe } },
      error: null,
    });

    const { unmount } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});