import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage, marketsApi, marketplaceApi } from '../api/client';
import type { CreateListingData } from '../api/types';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Feedback';
import { z } from 'zod';

const listingSchema = z.object({
  title: z.string().trim().min(3, 'Enter at least 3 characters.').max(200),
  description: z.string().max(4000),
  quantity_kg: z.coerce.number().positive('Enter a quantity greater than zero.'),
  expected_price_per_kg: z.coerce.number().positive('Enter a price greater than zero.'),
  available_from: z.string().date('Enter a valid availability date.'),
  pickup_location: z.string().max(200),
  commodity: z.string().min(1, 'Choose a commodity.'),
  district: z.string().min(1, 'Choose a district.'),
  quality_grade: z.enum(['A', 'B', 'C']),
});

export function ListingCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const commoditiesQuery = useQuery({
    queryKey: ['markets', 'commodities'],
    queryFn: marketsApi.getCommodities,
  });
  const districtsQuery = useQuery({
    queryKey: ['markets', 'districts'],
    queryFn: marketsApi.getDistricts,
  });
  const createMutation = useMutation({
    mutationFn: (data: CreateListingData) => marketplaceApi.createListing(data),
    onSuccess: async (listing) => {
      await queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] });
      navigate(`/marketplace/${listing.id}`, { replace: true });
    },
    onError: (requestError: unknown) => setError(getApiErrorMessage(requestError)),
  });

  if (commoditiesQuery.isPending || districtsQuery.isPending) return <LoadingState label="Loading produce and district options…" />;
  if (commoditiesQuery.isError || districtsQuery.isError) {
    const requestError = commoditiesQuery.error ?? districtsQuery.error;
    return <ErrorState error={requestError} onRetry={() => void Promise.all([commoditiesQuery.refetch(), districtsQuery.refetch()])} title="Listing options unavailable" />;
  }
  if (commoditiesQuery.data.length === 0 || districtsQuery.data.length === 0) {
    return <EmptyState title="Cannot create a listing yet" description="The backend needs at least one commodity and one district before listings can be published." action={<Link className="button button-secondary button-compact" to="/marketplace"><ArrowLeft size={15} /> Marketplace</Link>} />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const parsed = listingSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') || '',
      quantity_kg: formData.get('quantity_kg'),
      expected_price_per_kg: formData.get('expected_price_per_kg'),
      available_from: formData.get('available_from'),
      pickup_location: formData.get('pickup_location') || '',
      commodity: formData.get('commodity'),
      district: formData.get('district'),
      quality_grade: formData.get('quality_grade'),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your listing details.');
      return;
    }
    const data: CreateListingData = parsed.data;
    createMutation.mutate(data);
  }

  return (
    <>
      <Link className="back-link page-back" to="/marketplace"><ArrowLeft size={16} aria-hidden="true" /> Marketplace</Link>
      <PageHeader eyebrow="SELL YOUR PRODUCE" title="Create a listing" description="Give buyers clear, accurate information about the produce you have available." />
      <div className="form-page-layout">
        <form className="form-card form-stack" onSubmit={(event) => void submit(event)} noValidate>
          <label className="field">
            <span>Listing title</span>
            <input maxLength={200} name="title" placeholder="e.g. Fresh dried maize" required />
          </label>
          <div className="form-row">
            <label className="field">
              <span>Commodity</span>
              <select defaultValue="" name="commodity" required>
                <option disabled value="">Select a commodity</option>
                {commoditiesQuery.data.map((commodity) => <option key={commodity.id} value={commodity.id}>{commodity.name} · {commodity.unit}</option>)}
              </select>
            </label>
            <label className="field">
              <span>District</span>
              <select defaultValue="" name="district" required>
                <option disabled value="">Select a district</option>
                {districtsQuery.data.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Quantity available (kg)</span>
              <input min="0.01" name="quantity_kg" placeholder="250" required step="any" type="number" />
            </label>
            <label className="field">
              <span>Expected price per kg (UGX)</span>
              <input min="0.01" name="expected_price_per_kg" placeholder="2500" required step="any" type="number" />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Quality grade</span>
              <select defaultValue="B" name="quality_grade">
                <option value="A">Grade A</option><option value="B">Grade B</option><option value="C">Grade C</option>
              </select>
            </label>
            <label className="field">
              <span>Available from</span>
              <input defaultValue={new Date().toISOString().slice(0, 10)} name="available_from" required type="date" />
            </label>
          </div>
          <label className="field">
            <span>Pickup location <small>(optional)</small></span>
            <input maxLength={200} name="pickup_location" placeholder="Village or collection point" />
          </label>
          <label className="field">
            <span>Description <small>(optional)</small></span>
            <textarea maxLength={4000} name="description" placeholder="Describe freshness, drying, packaging, or other details" rows={5} />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button-primary" disabled={createMutation.isPending} type="submit">
            <Check size={17} aria-hidden="true" /> {createMutation.isPending ? 'Publishing…' : 'Publish listing'}
          </button>
          <p className="secure-note">Offers are handled by AgriSmart. This app does not collect payment.</p>
        </form>
        <aside className="form-aside">
          <h2>A clear listing helps</h2>
          <p>Accurate quantity, location, quality, and availability details help buyers decide whether to contact you.</p>
          <ul><li>Use a specific title for your produce.</li><li>Choose the closest matching quality grade.</li><li>Share only a pickup location you are comfortable publishing.</li></ul>
        </aside>
      </div>
    </>
  );
}
