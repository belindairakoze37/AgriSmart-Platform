import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../api/types';
import { ProfilePage } from './ProfilePage';

const authMocks = vi.hoisted(() => ({
  updateProfilePicture: vi.fn(),
  updateProfile: vi.fn(),
}));

const user: AuthUser = {
  id: 'user-123',
  phone_number: '+256700000001',
  email: 'jane@example.com',
  first_name: 'Jane',
  last_name: 'Farmer',
  full_name: 'Jane Farmer',
  role: 'farmer',
  preferred_language: 'en',
  profile_picture: null,
  is_phone_verified: false,
  date_joined: '2026-01-01T00:00:00Z',
};

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user,
    updateProfile: authMocks.updateProfile,
    updateProfilePicture: authMocks.updateProfilePicture,
  }),
}));

vi.mock('../api/client', () => ({
  getApiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Request failed',
}));

describe('profile picture editing', () => {
  let originalCreateObjectURL: PropertyDescriptor | undefined;
  let originalRevokeObjectURL: PropertyDescriptor | undefined;

  afterEach(() => {
    cleanup();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:profile-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    authMocks.updateProfilePicture.mockResolvedValue(undefined);
  });

  it('previews and uploads the selected profile picture', async () => {
    render(<ProfilePage />);
    const photo = new File(['photo'], 'profile.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Choose photo'), {
      target: { files: [photo] },
    });

    expect(screen.getByRole('img', { name: 'Profile' })).toHaveAttribute(
      'src',
      'blob:profile-preview',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));

    await waitFor(() =>
      expect(authMocks.updateProfilePicture).toHaveBeenCalledWith(photo),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your profile picture was updated.',
    );
  });

  it('rejects files that are not supported image types', () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText('Choose photo'), {
      target: { files: [new File(['not an image'], 'notes.txt', { type: 'text/plain' })] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPEG, PNG, or WebP image.');
    expect(authMocks.updateProfilePicture).not.toHaveBeenCalled();
  });
});
