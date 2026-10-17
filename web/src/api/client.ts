import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import type {
  AdvisoryMessage,
  AdvisorySession,
  AdvisoryDeliveryResult,
  AuthUser,
  Commodity,
  CreateListingData,
  CurrentPrice,
  District,
  Listing,
  LoginResponse,
  MarketPrice,
  Offer,
  OfficerDashboard,
  Paginated,
  RegisterData,
  SendMessageResponse,
} from './types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')
  .replace(/\/+$/, '');
const API_TIMEOUT = 20_000;
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
const unauthenticatedApi = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _authRetry?: boolean;
  }
}

let accessToken: string | null = null;
let csrfToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let sessionExpiredHandler: (() => void) | null = null;
const CSRF_COOKIE_NAME = 'csrftoken';

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

async function getCsrfToken(): Promise<string> {
  const cookieToken = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.slice(CSRF_COOKIE_NAME.length + 1);
  if (cookieToken) {
    csrfToken = decodeURIComponent(cookieToken);
    return csrfToken;
  }
  if (csrfToken) return csrfToken;
  const response = await unauthenticatedApi.get<{ csrfToken: string }>(
    '/auth/web/csrf/',
  );
  csrfToken = response.data.csrfToken;
  return csrfToken;
}

function isBrowserAuthRequest(url?: string): boolean {
  return Boolean(url?.includes('/auth/web/'));
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const csrf = await getCsrfToken();
      const response = await unauthenticatedApi.post<{ access: string }>(
        '/auth/web/refresh/',
        {},
        { headers: { 'X-CSRFToken': csrf } },
      );
      if (!response.data.access) {
        throw new Error('The server returned an invalid access token.');
      }
      accessToken = response.data.access;
      return accessToken;
    })()
      .catch((error: unknown) => {
        accessToken = null;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          sessionExpiredHandler?.();
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as InternalAxiosRequestConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !request ||
      request._authRetry ||
      isBrowserAuthRequest(request.url)
    ) {
      return Promise.reject(error);
    }
    request._authRetry = true;
    try {
      await refreshAccessToken();
      return api(request);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export const authApi = {
  async login(phoneNumber: string, password: string): Promise<LoginResponse> {
    const csrf = await getCsrfToken();
    const response = await api.post<LoginResponse>(
      '/auth/web/login/',
      { phone_number: phoneNumber, password },
      { headers: { 'X-CSRFToken': csrf } },
    );
    return response.data;
  },
  async register(data: RegisterData): Promise<LoginResponse> {
    const csrf = await getCsrfToken();
    const response = await api.post<LoginResponse>(
      '/auth/web/register/',
      data,
      { headers: { 'X-CSRFToken': csrf } },
    );
    return response.data;
  },
  async restore(): Promise<AuthUser> {
    await refreshAccessToken();
    const response = await api.get<AuthUser>('/auth/profile/');
    return response.data;
  },
  async getProfile(): Promise<AuthUser> {
    const response = await api.get<AuthUser>('/auth/profile/');
    return response.data;
  },
  async updateProfile(data: Partial<Pick<
    AuthUser,
    'first_name' | 'last_name' | 'email' | 'preferred_language'
  >>): Promise<AuthUser> {
    const response = await api.patch<AuthUser>('/auth/profile/', data);
    return response.data;
  },
  async logout(): Promise<void> {
    const csrf = await getCsrfToken();
    await api.post('/auth/web/logout/', {}, {
      headers: { 'X-CSRFToken': csrf },
    });
    accessToken = null;
    csrfToken = null;
  },
};

export const marketsApi = {
  async getCommodities(): Promise<Commodity[]> {
    return (await api.get<Commodity[]>('/markets/commodities/')).data;
  },
  async getDistricts(): Promise<District[]> {
    return (await api.get<District[]>('/markets/districts/')).data;
  },
  async getPrices(page = 1): Promise<Paginated<MarketPrice>> {
    return (
      await api.get<Paginated<MarketPrice>>('/markets/prices/', {
        params: { page },
      })
    ).data;
  },
  async getCurrentPrices(
    commodityId: string,
    limit = 5,
  ): Promise<{ commodity_id: string; prices: CurrentPrice[]; total_markets: number }> {
    return (
      await api.get<{ commodity_id: string; prices: CurrentPrice[]; total_markets: number }>('/markets/prices/current/', {
        params: { commodity: commodityId, limit },
      })
    ).data;
  },
  async getPriceHistory(commodityId: string, months = 12): Promise<{
    commodity_id: string;
    period_months: number;
    data: Array<{
      date: string | null;
      avg_price: number | null;
      min_price: number | null;
      max_price: number | null;
      sample_count: number;
    }>;
  }> {
    return (
      await api.get<{
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
      })
    ).data;
  },
};

export const marketplaceApi = {
  async getListings(page = 1, search = ''): Promise<Paginated<Listing>> {
    return (
      await api.get<Paginated<Listing>>('/marketplace/listings/', {
        params: { page, ...(search ? { search } : {}) },
      })
    ).data;
  },
  async getMyListings(page = 1): Promise<Paginated<Listing>> {
    return (
      await api.get<Paginated<Listing>>('/marketplace/listings/mine/', {
        params: { page },
      })
    ).data;
  },
  async getListing(id: string): Promise<Listing> {
    return (await api.get<Listing>(`/marketplace/listings/${id}/`)).data;
  },
  async createListing(data: CreateListingData): Promise<Listing> {
    return (await api.post<Listing>('/marketplace/listings/', data)).data;
  },
  async createOffer(data: {
    listing: string;
    offered_price_per_kg: number;
    quantity_kg: number;
    message?: string;
  }): Promise<void> {
    await api.post('/marketplace/offers/', data);
  },
  async getOffers(page = 1): Promise<Paginated<Offer>> {
    return (
      await api.get<Paginated<Offer>>('/marketplace/offers/', {
        params: { page },
      })
    ).data;
  },
  async updateOfferStatus(id: string, status: 'accepted' | 'rejected'): Promise<Offer> {
    return (
      await api.patch<Offer>(`/marketplace/offers/${id}/`, { status })
    ).data;
  },
};

export const advisoryApi = {
  async getSessions(page = 1): Promise<Paginated<AdvisorySession>> {
    return (
      await api.get<Paginated<AdvisorySession>>('/advisory/sessions/', {
        params: { page },
      })
    ).data;
  },
  async getMessages(
    sessionId: string,
    page = 1,
  ): Promise<Paginated<AdvisoryMessage>> {
    return (
      await api.get<Paginated<AdvisoryMessage>>(
        `/advisory/sessions/${sessionId}/messages/`,
        { params: { page } },
      )
    ).data;
  },
  async sendMessage(
    content: string,
    sessionId?: string,
  ): Promise<SendMessageResponse> {
    const path = sessionId
      ? `/advisory/chat/${sessionId}/`
      : '/advisory/chat/';
    return (
      await api.post<SendMessageResponse>(path, { content })
    ).data;
  },
};

export const officerApi = {
  async getDashboard(district = ''): Promise<OfficerDashboard> {
    return (
      await api.get<OfficerDashboard>('/farmers/officers/dashboard/', {
        params: district ? { district } : {},
      })
    ).data;
  },
  async sendAdvisory(data: {
    title: string;
    message: string;
    district?: string;
  }): Promise<AdvisoryDeliveryResult> {
    return (
      await api.post<AdvisoryDeliveryResult>(
        '/farmers/officers/advisories/',
        data,
      )
    ).data;
  },
};

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';
  }
  const data: unknown = error.response?.data;
  if (data && typeof data === 'object') {
    const response = data as Record<string, unknown>;
    const detail = response.error ?? response.detail;
    if (typeof detail === 'string') return detail;
    const field = Object.values(response).find(
      (value) => Array.isArray(value) && typeof value[0] === 'string',
    );
    if (Array.isArray(field) && typeof field[0] === 'string') return field[0];
  }
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
    return 'Could not reach AgriSmart. Check your connection and try again.';
  }
  if ((error.response?.status ?? 0) >= 500) {
    return 'AgriSmart is temporarily unavailable. Please try again shortly.';
  }
  return error.message || 'Request failed. Please try again.';
}

export function getApiBaseUrl(): string {
  return API_URL;
}
