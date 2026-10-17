import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api/v1'
).replace(/\/+$/, '');
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const REFRESH_URL = '/auth/token/refresh/';
const REQUEST_TIMEOUT_MS = 15_000;

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
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

export interface Commodity {
  id: string;
  name: string;
  local_names: Record<string, string>;
  category: string;
  unit: string;
  image: string | null;
}

export interface District {
  id: string;
  name: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
}

export interface CurrentPrice {
  market_id: string;
  market_name: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  price_per_unit: number;
  unit: string;
  recorded_date: string;
  change_percent: number | null;
  source: string;
}

export interface CurrentPricesResponse {
  commodity_id: string;
  prices: CurrentPrice[];
  total_markets: number;
}

export interface MarketPrice {
  id: string;
  market: string;
  market_name: string;
  commodity: string;
  commodity_name: string;
  district_name: string;
  price_per_unit: string;
  unit: string;
  price_type: string;
  source: string;
  recorded_date: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Listing {
  id: string;
  farmer: string;
  farmer_name: string;
  farmer_phone: string;
  commodity: string;
  commodity_name: string;
  title: string;
  description: string;
  quantity_kg: string;
  quality_grade: string;
  expected_price_per_kg: string;
  available_from: string;
  available_until: string | null;
  district: string;
  district_name: string;
  latitude: string | null;
  longitude: string | null;
  pickup_location: string;
  images: string[];
  status: string;
  views_count: number;
  offers_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateListingData {
  commodity: string;
  title: string;
  description?: string;
  quantity_kg: number;
  quality_grade: 'A' | 'B' | 'C';
  expected_price_per_kg: number;
  available_from: string;
  available_until?: string | null;
  district: string;
  pickup_location?: string;
  images?: string[];
}

export interface AdvisorySession {
  id: string;
  title: string;
  crop_type: string;
  location: string;
  language: string;
  is_active: boolean;
  last_message: {
    content: string;
    sender: 'user' | 'ai' | 'system';
    created_at: string;
  } | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdvisoryMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  content: string;
  intent: string;
  confidence: number | null;
  sources: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SendMessageResponse {
  session_id: string;
  user_message: AdvisoryMessage;
  ai_message: AdvisoryMessage;
}

interface RefreshResponse {
  access: string;
  refresh?: string;
}

let refreshRequest: Promise<string> | null = null;
let onSessionExpired: () => void = () => undefined;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export function getApiUrl(): string {
  return API_URL;
}

function isPublicAuthRequest(url?: string): boolean {
  return Boolean(
    url &&
      [
        '/auth/login/',
        '/auth/register/',
        '/auth/otp/request/',
        '/auth/otp/verify/',
        REFRESH_URL,
      ].some((path) => url.includes(path)),
  );
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
        { timeout: REQUEST_TIMEOUT_MS },
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

async function expireSession(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  } finally {
    onSessionExpired();
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (isPublicAuthRequest(config.url)) return config;
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | InternalAxiosRequestConfig
      | undefined;
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      isPublicAuthRequest(originalRequest.url)
    ) {
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
  getProfile: () => api.get<AuthUser>('/auth/profile/'),
};

export const marketsApi = {
  getDistricts: () => api.get<District[]>('/markets/districts/'),
  getCommodities: () => api.get<Commodity[]>('/markets/commodities/'),
  getPrices: (page = 1) =>
    api.get<PaginatedResponse<MarketPrice>>('/markets/prices/', {
      params: { page },
    }),
  getCurrentPrices: (commodityId: string, limit = 5) =>
    api.get<CurrentPricesResponse>('/markets/prices/current/', {
      params: { commodity: commodityId, limit },
    }),
  getPriceHistory: (commodityId: string, months = 12) =>
    api.get<{
      commodity_id: string;
      period_months: number;
      data: Array<{
        date: string | null;
        avg_price: number | null;
        min_price: number | null;
        max_price: number | null;
        sample_count: number;
      }>;
    }>('/markets/prices/history/', {
      params: { commodity: commodityId, months },
    }),
};

export const marketplaceApi = {
  getListings: (page = 1, search = '') =>
    api.get<PaginatedResponse<Listing>>('/marketplace/listings/', {
      params: { page, ...(search ? { search } : {}) },
    }),
  getMyListings: (page = 1) =>
    api.get<PaginatedResponse<Listing>>('/marketplace/listings/mine/', {
      params: { page },
    }),
  getListing: (id: string) => api.get<Listing>(`/marketplace/listings/${id}/`),
  createListing: (data: CreateListingData) =>
    api.post<Listing>('/marketplace/listings/', data),
  createOffer: (data: {
    listing: string;
    offered_price_per_kg: number;
    quantity_kg: number;
    pickup_date?: string;
    message?: string;
  }) => api.post('/marketplace/offers/', data),
};

export const advisoryApi = {
  getSessions: () =>
    api.get<PaginatedResponse<AdvisorySession>>('/advisory/sessions/'),
  getMessages: (sessionId: string) =>
    api.get<PaginatedResponse<AdvisoryMessage>>(
      `/advisory/sessions/${sessionId}/messages/`,
    ),
  sendMessage: (
    content: string,
    sessionId?: string,
    context?: { crop_type?: string; location?: string },
  ) =>
    api.post<SendMessageResponse>(
      sessionId ? `/advisory/chat/${sessionId}/` : '/advisory/chat/',
      { content, ...context },
    ),
};

export function toArray<T>(
  data: T[] | PaginatedResponse<T>,
): T[] {
  return Array.isArray(data) ? data : data.results;
}

export function getNextPage<T>(
  page: PaginatedResponse<T>,
  _pages: PaginatedResponse<T>[],
  currentPage: number,
): number | undefined {
  return page.next ? currentPage + 1 : undefined;
}

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';
  }

  const responseData = error.response?.data;
  if (typeof responseData === 'object' && responseData !== null) {
    const data = responseData as Record<string, unknown>;
    const message = data.error ?? data.detail;
    if (typeof message === 'string') return message;
    const firstFieldError = Object.values(data).find((value) =>
      Array.isArray(value) && typeof value[0] === 'string',
    );
    if (Array.isArray(firstFieldError) && typeof firstFieldError[0] === 'string') {
      return firstFieldError[0];
    }
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return 'Could not reach AgriSmart. Check your connection and try again.';
  }
  if (error.response?.status && error.response.status >= 500) {
    return 'AgriSmart is temporarily unavailable. Please try again shortly.';
  }
  return error.message || 'Request failed. Please try again.';
}
