import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { authApi, setAccessToken, setSessionExpiredHandler } from '../api/client';
import type { AuthUser, RegisterData } from '../api/types';
import { AuthContext } from './AuthContextValue';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restorationError, setRestorationError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setSessionExpiredHandler(() => {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
    });
    void authApi.restore()
      .then((restoredUser) => {
        if (mounted) setUser(restoredUser);
      })
      .catch((error: unknown) => {
        if (
          mounted &&
          axios.isAxiosError(error) &&
          error.response?.status !== 401
        ) {
          setRestorationError(
            'We could not check your saved sign-in. You can retry after checking your connection.',
          );
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
      setSessionExpiredHandler(() => undefined);
    };
  }, [queryClient]);

  const login = useCallback(async (phoneNumber: string, password: string) => {
    const response = await authApi.login(phoneNumber, password);
    setAccessToken(response.access);
    setUser(response.user);
    setRestorationError(null);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await authApi.register(data);
    setAccessToken(response.access);
    setUser(response.user);
    setRestorationError(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<Pick<
    AuthUser,
    'first_name' | 'last_name' | 'email' | 'preferred_language'
  >>) => {
    const updatedUser = await authApi.updateProfile(data);
    setUser(updatedUser);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setAccessToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, isLoading, restorationError, login, register, updateProfile, logout }),
    [user, isLoading, restorationError, login, register, updateProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
