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

export interface LoginResponse {
  user: AuthUser;
  access: string;
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

export interface Paginated<T> {
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
  is_demo: boolean;
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
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | string;
  created_at: string;
  updated_at: string;
}

export interface CreateListingData {
  commodity: string;
  title: string;
  description: string;
  quantity_kg: number;
  quality_grade: 'A' | 'B' | 'C';
  expected_price_per_kg: number;
  available_from: string;
  district: string;
  pickup_location: string;
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

export interface AdvisoryFarmContext {
  district: string;
  primary_crops: string[];
}

export interface OfficerFarmer {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  district: string;
  farm_size_acres: string | null;
  primary_crops: string[];
  farm_count: number;
  active_listing_count: number;
}

export interface DiseaseOutbreak {
  crop_type: string;
  disease: string;
  district: string;
  reports: number;
  farmers_affected: number;
  latitude: number | null;
  longitude: number | null;
}

export interface OfficerDashboard {
  district: string | null;
  farmer_count: number;
  farm_count: number;
  active_listing_count: number;
  farmers: OfficerFarmer[];
  farmers_truncated: boolean;
  outbreaks: DiseaseOutbreak[];
}

export interface AdvisoryDeliveryResult {
  district: string | null;
  notified: number;
  skipped_by_preferences: number;
}

export interface AdminDashboardMetrics {
  total_users: number;
  total_listings: number;
  active_listings: number;
  completed_transactions: number;
  completed_transaction_value_ugx: string;
  market_price_reports: number;
  active_commodities: number;
}

export interface AdminCommodity extends Commodity {
  is_active: boolean;
}
