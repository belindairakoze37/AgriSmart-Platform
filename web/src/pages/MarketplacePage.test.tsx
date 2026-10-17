import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Offer } from '../api/types';
import { MarketplacePage } from './MarketplacePage';

const apiMocks = vi.hoisted(() => ({
  getListings: vi.fn(),
  getMyListings: vi.fn(),
  getOffers: vi.fn(),
  updateOfferStatus: vi.fn(),
}));

vi.mock('../api/client', () => ({
  marketplaceApi: apiMocks,
  getApiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Request failed',
}));

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'seller-1' } }),
}));

const offer: Offer = {
  id: 'offer-1',
  listing: 'listing-1',
  listing_title: 'Maize in Mukono',
  buyer: 'buyer-1',
  buyer_name: 'Buyer One',
  buyer_phone: '+256700000002',
  offered_price_per_kg: '1200.00',
  quantity_kg: '50.00',
  pickup_date: null,
  message: 'I can collect this week.',
  status: 'pending',
  created_at: '2026-01-01T12:00:00Z',
  updated_at: '2026-01-01T12:00:00Z',
};

function renderMarketplace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><MarketplacePage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('marketplace offers', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getListings.mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    apiMocks.getOffers.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [offer],
    });
    apiMocks.updateOfferStatus.mockResolvedValue({ ...offer, status: 'accepted' });
  });

  it('lets the listing owner accept a pending offer and refreshes the offers', async () => {
    renderMarketplace();
    fireEvent.click(screen.getByRole('button', { name: 'Offers' }));

    expect(await screen.findByRole('heading', { name: offer.listing_title })).toBeInTheDocument();
    expect(screen.getByText('I can collect this week.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept offer' }));

    await waitFor(() =>
      expect(apiMocks.updateOfferStatus).toHaveBeenCalledWith('offer-1', 'accepted'),
    );
    await waitFor(() => expect(apiMocks.getOffers).toHaveBeenCalledTimes(2));
  });

  it('displays seeded sample listings with a visible sample label', async () => {
    apiMocks.getListings.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 'sample-maize',
        farmer: 'demo-farmer',
        farmer_name: 'Demo Farmer Gulu',
        farmer_phone: '+256000000001',
        commodity: 'maize',
        commodity_name: 'Maize',
        title: 'Sample listing: dried maize grain',
        description: 'Sample marketplace data for demonstration only.',
        quantity_kg: '850.00',
        quality_grade: 'A',
        expected_price_per_kg: '1250.00',
        available_from: '2026-10-17',
        available_until: null,
        district: 'gulu',
        district_name: 'Gulu',
        latitude: null,
        longitude: null,
        pickup_location: 'Gulu town collection point',
        images: [],
        status: 'active',
        is_demo: true,
        views_count: 0,
        offers_count: 0,
        created_at: '2026-10-17T10:00:00Z',
        updated_at: '2026-10-17T10:00:00Z',
      }],
    });

    renderMarketplace();

    expect(await screen.findByText('Sample listing: dried maize grain')).toBeInTheDocument();
    expect(screen.getByText('Sample', { selector: '.listing-sample-badge' })).toBeInTheDocument();
  });
});
