import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
).replace(/\/+$/, '');
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const REFRESH_URL = '/auth/token/refresh/';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

interface RefreshResponse {
  access: string;
  refresh?: string;
}

export interface AuthUser {
  id: string;
  phone_number: string;
  email: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  preferred_language: string;
  profile_picture: string | null;
  is_phone_verified: boolean;
  date_joined: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface RegisterData {
  phone_number: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
}

let refreshRequest: Promise<string> | null = null;
let onSessionExpired: () => void = () => undefined;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const refresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refresh) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await axios.post<RefreshResponse>(
        `${API_URL}${REFRESH_URL}`,
        { refresh },
      );
      if (!response.data.access) {
        throw new Error('The server returned an invalid access token.');
      }
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.data.access);
      if (response.data.refresh) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refresh);
      }
      return response.data.access;
    })().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

async function clearStoredTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

async function expireSession(): Promise<void> {
  try {
    await clearStoredTokens();
  } finally {
    onSessionExpired();
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | InternalAxiosRequestConfig
      | undefined;
    const isRefreshRequest = originalRequest?.url?.includes(REFRESH_URL);

    if (error.response?.status !== 401 || !originalRequest || isRefreshRequest) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      await expireSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    let accessToken: string;
    try {
      accessToken = await refreshAccessToken();
    } catch (refreshError) {
      if (axios.isAxiosError(refreshError) && !refreshError.response) {
        return Promise.reject(refreshError);
      }
      await expireSession();
      return Promise.reject(refreshError);
    }

    originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
    return api(originalRequest);
  },
);

export const authApi = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>('/auth/register/', data),
  login: (phone: string, password: string) =>
    api.post<AuthResponse>('/auth/login/', {
      phone_number: phone,
      password,
    }),
  requestOTP: (phone: string) =>
    api.post('/auth/otp/request/', { phone_number: phone }),
  verifyOTP: (phone: string, code: string) =>
    api.post('/auth/otp/verify/', { phone_number: phone, otp_code: code }),
  getProfile: () => api.get<AuthUser>('/auth/profile/'),
};

export const marketsApi = {
  getDistricts: () => api.get('/markets/districts/'),
  getCommodities: () => api.get('/markets/commodities/'),
  getCurrentPrices: (commodityId: string, districtId?: string) =>
    api.get('/markets/prices/current/', {
      params: { commodity: commodityId, district: districtId },
    }),
  getPriceHistory: (commodityId: string, months = 12) =>
    api.get('/markets/prices/history/', {
      params: { commodity: commodityId, months },
    }),
};

export const forecastsApi = {
  getForecast: (commodityId: string, marketId?: string) =>
    api.get('/forecasts/generate/', {
      params: { commodity: commodityId, market: marketId },
    }),
};

export const advisoryApi = {
  getSessions: () => api.get('/advisory/sessions/'),
  createSession: (data: Record<string, unknown>) =>
    api.post('/advisory/sessions/', data),
  sendMessage: (content: string, sessionId?: string) =>
    sessionId
      ? api.post(`/advisory/chat/${sessionId}/`, { content })
      : api.post('/advisory/chat/', { content }),
  getMessages: (sessionId: string) =>
    api.get(`/advisory/sessions/${sessionId}/messages/`),
};

export const diseasesApi = {
  detect: (image: FormData, cropType: string) =>
    api.post('/diseases/detect/', image, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { crop_type: cropType },
    }),
  getDetections: () => api.get('/diseases/'),
};

export const marketplaceApi = {
  getListings: (params?: Record<string, string | number | boolean>) =>
    api.get('/marketplace/listings/', { params }),
  getMyListings: () => api.get('/marketplace/listings/mine/'),
  createListing: (data: Record<string, unknown>) =>
    api.post('/marketplace/listings/', data),
  getListing: (id: string) => api.get(`/marketplace/listings/${id}/`),
  makeOffer: (data: Record<string, unknown>) =>
    api.post('/marketplace/offers/', data),
  getMyOffers: () => api.get('/marketplace/offers/mine/'),
};
