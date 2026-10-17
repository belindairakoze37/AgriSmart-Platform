import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from './AuthPages';
import type { AuthUser } from '../api/types';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  restore: vi.fn(),
  updateProfile: vi.fn(),
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
  },
  getApiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Sign-in failed',
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

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<h1>Protected dashboard</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('browser sign-in page', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.restore.mockRejectedValue(new Error('No browser session'));
    authMocks.login.mockResolvedValue({ user, access: 'memory-access-token' });
  });

  it('validates required credentials before calling the API', async () => {
    renderLogin();
    const signIn = await screen.findByRole('button', { name: 'Sign in' });
    fireEvent.click(signIn);
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid phone number.');
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it('authenticates and navigates to the protected dashboard', async () => {
    renderLogin();
    await screen.findByRole('button', { name: 'Sign in' });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+256700000001' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Protected dashboard' })).toBeInTheDocument();
    await waitFor(() => expect(authMocks.login).toHaveBeenCalledWith('+256700000001', 'StrongPass123!'));
    expect(authMocks.setAccessToken).toHaveBeenCalledWith('memory-access-token');
  });
});
