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
  notification_preferences: {
    price_alerts: boolean;
    weather_alerts: boolean;
    advisories: boolean;
    marketplace_offers: boolean;
  };
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

export interface PriceAlert {
  id: string;
  commodity: string;
  commodity_name: string;
  market: string | null;
  market_name: string | null;
  target_price: string;
  condition: 'above' | 'below';
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface PriceForecast {
  id: string;
  commodity: string;
  commodity_name: string;
  market: string | null;
  market_name: string | null;
  forecast_date: string;
  target_date: string;
  predicted_price: string;
  lower_bound: string;
  upper_bound: string;
  confidence: number;
  model_type: string;
  created_at: string;
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

export interface Offer {
  id: string;
  listing: string;
  listing_title: string;
  buyer: string;
  buyer_name: string;
  buyer_phone: string;
  offered_price_per_kg: string;
  quantity_kg: string;
  pickup_date: string | null;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  name: string;
  size_acres: string;
  latitude: string | null;
  longitude: string | null;
  soil_type: string;
  irrigation_type: string;
  created_at: string;
  updated_at: string;
}

export interface FarmerProfile {
  id: string;
  district: string;
  sub_county: string;
  village: string;
  latitude: string | null;
  longitude: string | null;
  farm_size_acres: string | null;
  farming_type: string;
  years_of_experience: number | null;
  primary_crops: string[];
  has_smartphone: boolean;
}

export interface FarmerWeather {
  location: string;
  district: string;
  temperature_c: number;
  feels_like_c: number;
  humidity_percent: number;
  wind_speed_mps: number;
  condition: string;
  icon: string;
  rainfall_next_24h_mm: number;
  heavy_rain_warning: boolean;
  advisory: string;
  updated_at: string;
}

export interface Crop {
  id: string;
  farm: string;
  crop_type: string;
  variety: string;
  area_acres: string;
  planting_date: string | null;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  growth_stage: string;
  expected_yield_kg: string | null;
  actual_yield_kg: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AgriNotification {
  id: string;
  user: string;
  title: string;
  message: string;
  notification_type: 'market_price' | 'advisory' | 'disease' | 'marketplace' | 'system';
  is_read: boolean;
  action_url: string;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
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

export interface DiseaseDetection {
  id: string;
  image: string;
  crop_type: string;
  detected_disease: string;
  confidence: number | null;
  all_predictions: Array<{
    disease: string;
    name: string;
    confidence: number;
    severity?: string;
  }>;
  recommendations: {
    immediate_actions: string[];
    preventive_measures: string[];
    severity: string;
  };
  is_correct: boolean | null;
  user_notes: string;
  created_at: string;
}

export interface DiseaseDetectionResponse {
  detection: DiseaseDetection;
  disclaimer: string;
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
  login: (identifier: string, password: string) =>
    api.post<AuthResponse>('/auth/login/', { identifier, password }),
  getProfile: () => api.get<AuthUser>('/auth/profile/'),
  updateProfilePicture: async (uri: string) => {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('The selected profile photo could not be read.');
    }
    const formData = new FormData();
    formData.append('profile_picture', await response.blob(), 'profile-picture.jpg');
    return api.patch<AuthUser>(
      '/auth/profile/',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
  updateProfile: (data: {
    preferred_language?: 'en' | 'lg' | 'sw';
    notification_preferences?: AuthUser['notification_preferences'];
  }) => api.patch<AuthUser>('/auth/profile/', data),
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
  getPriceAlerts: () =>
    api.get<PaginatedResponse<PriceAlert>>('/markets/alerts/'),
  createPriceAlert: (data: {
    commodity: string;
    target_price: number;
    condition: 'above' | 'below';
    market?: string;
  }) => api.post<PriceAlert>('/markets/alerts/', data),
  updatePriceAlert: (id: string, isActive: boolean) =>
    api.patch<PriceAlert>(`/markets/alerts/${id}/`, { is_active: isActive }),
};

export const forecastsApi = {
  generate: (commodityId: string, horizon = 4) =>
    api.get<{
      commodity_id: string;
      forecasts: PriceForecast[];
      source: string;
      disclaimer?: string;
    }>('/forecasts/generate/', {
      params: { commodity: commodityId, horizon },
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
  getOffers: (page = 1) =>
    api.get<PaginatedResponse<Offer>>('/marketplace/offers/', {
      params: { page },
    }),
  updateOfferStatus: (id: string, status: 'accepted' | 'rejected') =>
    api.patch<Offer>(`/marketplace/offers/${id}/`, { status }),
  getListing: (id: string) => api.get<Listing>(`/marketplace/listings/${id}/`),
  createListing: async (data: CreateListingData, photoUris: string[] = []) => {
    if (photoUris.length === 0) {
      return api.post<Listing>('/marketplace/listings/', data);
    }

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'string' ? value : String(value));
      }
    });
    await Promise.all(
      photoUris.map(async (uri, index) => {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error('A selected listing photo could not be read.');
        }
        const image = await response.blob();
        formData.append('image_files', image, `produce-${index + 1}.jpg`);
      }),
    );
    return api.post<Listing>('/marketplace/listings/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  createOffer: (data: {
    listing: string;
    offered_price_per_kg: number;
    quantity_kg: number;
    pickup_date?: string;
    message?: string;
  }) => api.post('/marketplace/offers/', data),
};

export const farmApi = {
  getProfile: () => api.get<FarmerProfile>('/farmers/profile/'),
  updateProfile: (data: Pick<FarmerProfile, 'district' | 'sub_county' | 'village'>) =>
    api.patch<FarmerProfile>('/farmers/profile/', data),
  getWeather: () => api.get<FarmerWeather>('/farmers/weather/'),
  getFarms: () => api.get<PaginatedResponse<Farm>>('/farmers/farms/'),
  createFarm: (data: Pick<Farm, 'name' | 'size_acres' | 'soil_type' | 'irrigation_type'>) =>
    api.post<Farm>('/farmers/farms/', data),
  updateFarm: (
    id: string,
    data: Pick<Farm, 'name' | 'size_acres' | 'soil_type' | 'irrigation_type'>,
  ) => api.patch<Farm>(`/farmers/farms/${id}/`, data),
  getCrops: (farmId?: string) =>
    api.get<PaginatedResponse<Crop>>('/farmers/crops/', {
      params: farmId ? { farm: farmId } : undefined,
    }),
  createCrop: (data: Pick<
    Crop,
    'farm' | 'crop_type' | 'variety' | 'area_acres' | 'planting_date' |
    'expected_harvest_date' | 'growth_stage' | 'notes'
  >) => api.post<Crop>('/farmers/crops/', data),
  updateCrop: (
    id: string,
    data: Pick<
      Crop,
      'farm' | 'crop_type' | 'variety' | 'area_acres' | 'planting_date' |
      'expected_harvest_date' | 'growth_stage' | 'notes'
    >,
  ) => api.patch<Crop>(`/farmers/crops/${id}/`, data),
};

export const notificationsApi = {
  getUnread: () => api.get<PaginatedResponse<AgriNotification>>('/notifications/unread/'),
  markAllRead: () => api.post<{ updated: number }>('/notifications/mark-all-read/'),
  updateRead: (id: string, isRead: boolean) =>
    api.patch<AgriNotification>(`/notifications/${id}/`, { is_read: isRead }),
};

export const diseasesApi = {
  detect: async (uri: string, cropType: string) => {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('The selected crop photo could not be read.');
    }
    const formData = new FormData();
    formData.append('image', await response.blob(), 'crop-photo.jpg');
    formData.append('crop_type', cropType);
    return (
      await api.post<DiseaseDetectionResponse>(
        '/diseases/detect/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
    ).data;
  },
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
