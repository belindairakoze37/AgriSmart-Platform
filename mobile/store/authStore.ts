import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import type { AuthUser, RegisterData } from '../services/api';
import {
  authApi,
  setSessionExpiredHandler,
} from '../services/api';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ detail?: string; error?: string }>(error)) {
    return (
      error.response?.data?.detail ??
      error.response?.data?.error ??
      error.message
    );
  }
  return error instanceof Error ? error.message : fallback;
}

async function saveTokens(tokens: {
  access: string;
  refresh: string;
}): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh),
    ]);
  } catch (error) {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
    throw error;
  }
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authError: null,

  login: async (phone, password) => {
    set({ isLoading: true, authError: null });
    try {
      const response = await authApi.login(phone, password);
      const { user, tokens } = response.data;
      await saveTokens(tokens);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        authError: getErrorMessage(error, 'Login failed.'),
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, authError: null });
    try {
      const response = await authApi.register(data);
      const { user, tokens } = response.data;
      await saveTokens(tokens);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        authError: getErrorMessage(error, 'Registration failed.'),
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await clearTokens();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authError: null,
      });
    }
  },

  loadUser: async () => {
    set({ isLoading: true, authError: null });
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!token) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const response = await authApi.getProfile();
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      set({
        user: null,
        isAuthenticated: Boolean(token),
        isLoading: false,
        authError: getErrorMessage(error, 'Unable to load your profile.'),
      });
    }
  },
}));

setSessionExpiredHandler(() => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    authError: 'Your session has expired. Please log in again.',
  });
});
