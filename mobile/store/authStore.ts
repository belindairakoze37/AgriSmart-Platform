import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser, RegisterData } from '../services/api';
import {
  authApi,
  getApiErrorMessage,
  setSessionExpiredHandler,
} from '../services/api';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  updateUser: (user: AuthUser) => void;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  initializeAuth: () => Promise<void>;
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

let initializationPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authError: null,
  updateUser: (user) => set({ user }),

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
        authError: getApiErrorMessage(error),
      });
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
        authError: getApiErrorMessage(error),
      });
    }
  },

  logout: async () => {
    await clearTokens();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
    });
  },

  loadUser: async () => {
    set({ isLoading: true, authError: null });
    let token: string | null = null;
    try {
      token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
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
      set({
        user: null,
        isAuthenticated: Boolean(token),
        isLoading: false,
        authError: getApiErrorMessage(error),
      });
    }
  },

  initializeAuth: () => {
    if (!initializationPromise) {
      initializationPromise = get()
        .loadUser()
        .finally(() => {
          initializationPromise = null;
        });
    }
    return initializationPromise;
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
