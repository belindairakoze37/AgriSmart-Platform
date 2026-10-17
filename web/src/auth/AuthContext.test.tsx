import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import type { AuthUser } from '../api/types';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  restore: vi.fn(),
  updateProfile: vi.fn(),
  updateProfilePicture: vi.fn(),
  setAccessToken: vi.fn(),
  setSessionExpiredHandler: vi.fn(),
}));

vi.mock('../api/client', () => ({
  authApi: {
    login: authMocks.login,
    logout: authMocks.logout,
    register: authMocks.register,
    restore: authMocks.restore,
    updateProfile: authMocks.updateProfile,
    updateProfilePicture: authMocks.updateProfilePicture,
  },
  setAccessToken: authMocks.setAccessToken,
  setSessionExpiredHandler: authMocks.setSessionExpiredHandler,
}));

const user: AuthUser = {
  id: 'user-123',
  phone_number: '+256700000001',
  email: null,
  first_name: 'Jane',
  last_name: 'Farmer',
  full_name: 'Jane Farmer',
  role: 'farmer',
  preferred_language: 'en',
  profile_picture: null,
  is_phone_verified: false,
  date_joined: '2026-01-01T00:00:00Z',
};

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <output aria-label="auth status">
        {auth.isLoading ? 'loading' : auth.user?.phone_number ?? 'signed out'}
      </output>
      <button onClick={() => void auth.login('+256700000001', 'secret')}>Sign in</button>
      <button onClick={() => void auth.logout()}>Sign out</button>
    </div>
  );
}

function renderAuth() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider><AuthProbe /></AuthProvider>
    </QueryClientProvider>,
  );
}

describe('browser authentication state', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.restore.mockResolvedValue(user);
    authMocks.login.mockResolvedValue({ user, access: 'in-memory-access' });
    authMocks.logout.mockResolvedValue(undefined);
  });

  it('restores the profile using the backend browser session', async () => {
    renderAuth();
    expect(await screen.findByLabelText('auth status')).toHaveTextContent(user.phone_number);
    expect(authMocks.restore).toHaveBeenCalledOnce();
  });

  it('stores the returned access token in memory and signs in', async () => {
    renderAuth();
    await screen.findByText(user.phone_number);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(authMocks.setAccessToken).toHaveBeenCalledWith('in-memory-access'));
    expect(screen.getByLabelText('auth status')).toHaveTextContent(user.phone_number);
  });

  it('clears the session after the backend confirms logout', async () => {
    renderAuth();
    await screen.findByText(user.phone_number);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(authMocks.logout).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByLabelText('auth status')).toHaveTextContent('signed out'));
  });
});
