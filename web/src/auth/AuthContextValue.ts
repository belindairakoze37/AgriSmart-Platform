import { createContext } from 'react';
import type { AuthUser, RegisterData } from '../api/types';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  restorationError: string | null;
  login: (phoneNumber: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  updateProfile: (data: Partial<Pick<
    AuthUser,
    'first_name' | 'last_name' | 'email' | 'preferred_language'
  >>) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
