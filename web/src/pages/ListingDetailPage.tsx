import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, MapPin, Package, UserRound, Wheat } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { getApiErrorMessage, marketplaceApi } from '../api/client';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Feedback';
import { Currency } from '../components/format';
import { formatDate } from '../components/formatDate';

const offerSchema = z.object({
  offered_price_per_kg: z.coerce.number().positive('Enter a valid price greater than zero.'),
  quantity_kg: z.coerce.number().positive('Enter a quantity greater than zero.'),
  message: z.string().max(2000),
});

export function ListingDetailPage() {
  const { id = '' } = useParams();
  const [offerError, setOfferError] = useState('');
  const [offerSent, setOfferSent] = useState(false);
  const listingQuery = useQuery({
    queryKey: ['marketplace', 'listing', id],
    queryFn: () => marketplaceApi.getListing(id),
    enabled: Boolean(id),
  });
  const offerMutation = useMutation({
    mutationFn: (data: { listing: string; offered_price_per_kg: number; quantity_kg: number; message?: string }) =>
      marketplaceApi.createOffer(data),
    onSuccess: () => {
      setOfferError('');
      setOfferSent(true);
    },
    onError: (error: unknown) => setOfferError(getApiErrorMessage(error)),
  });

  if (listingQuery.isPending) return <LoadingState label="Loading marketplace listing…" />;
  if (listingQuery.isError) return <ErrorState error={listingQuery.error} onRetry={() => void listingQuery.refetch()} title="Listing could not be opened" />;
  const listing = listingQuery.data;
  const image = listing.images.find((url) => /^https?:\/\//i.test(url));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOfferError('');
    const form = new FormData(event.currentTarget);
    const parsed = offerSchema.safeParse({
      offered_price_per_kg: form.get('offered_price_per_kg'),
      quantity_kg: form.get('quantity_kg'),
      message: form.get('message') || '',
    });
    if (!parsed.success) {
      setOfferError(parsed.error.issues[0]?.message ?? 'Check your offer details.');
      return;
    }
    if (parsed.data.quantity_kg > Number(listing.quantity_kg)) {
      setOfferError(`Only ${listing.quantity_kg} kg is available.`);
      return;
    }
    offerMutation.mutate({
      listing: listing.id,
      offered_price_per_kg: parsed.data.offered_price_per_kg,
      quantity_kg: parsed.data.quantity_kg,
      ...(parsed.data.message.trim() ? { message: parsed.data.message.trim() } : {}),
    });
  }

  return (
    <>
      <Link className="back-link page-back" to="/marketplace"><ArrowLeft size={16} aria-hidden="true" /> Marketplace</Link>
      <PageHeader eyebrow="PRODUCE LISTING" title={listing.title} description={`${listing.commodity_name} · ${listing.district_name}`} />
      {listing.is_demo ? <p className="sample-data-note" role="note">Sample listing for demonstration only. This is not a real offer.</p> : null}
      <div className="detail-layout">
        <div className="detail-main">
          <div className="listing-detail-image">
            {image ? <img alt={`Produce for sale: ${listing.title}`} src={image} /> : <div className="listing-placeholder"><Wheat size={48} aria-hidden="true" /><span>Produce listing</span></div>}
          </div>
          <section className="detail-card">
            <div className="detail-card-heading"><div><p className="eyebrow">{listing.commodity_name}</p><h2>{listing.title}</h2></div><span className={`status-badge status-${listing.status.toLowerCase()}`}>{listing.status}</span></div>
            <p className="detail-price"><Currency value={listing.expected_price_per_kg} unit="kg" /></p>
            <div className="listing-facts">
              <Fact Icon={Package} label="Available quantity" value={`${Number(listing.quantity_kg).toLocaleString()} kg`} />
              <Fact Icon={Wheat} label="Quality grade" value={`Grade ${listing.quality_grade}`} />
              <Fact Icon={MapPin} label="District" value={listing.district_name} />
              <Fact Icon={UserRound} label="Farmer" value={listing.farmer_name || 'Farmer'} />
            </div>
            {listing.pickup_location ? <p className="pickup-location"><MapPin size={16} aria-hidden="true" /> Pickup: {listing.pickup_location}</p> : null}
            {listing.description ? <div className="listing-description"><h3>About this produce</h3><p>{listing.description}</p></div> : null}
            <p className="secure-note">Available from {formatDate(listing.available_from)} · {listing.views_count} views · {listing.offers_count} pending offers</p>
          </section>
        </div>
        <aside className="offer-panel">
          <div className="offer-panel-heading"><span className="feature-icon"><Package size={18} aria-hidden="true" /></span><div><p className="eyebrow">INTERESTED?</p><h2>Send an offer</h2></div></div>
          {listing.is_demo ? (
            <EmptyState title="Sample listing" description="This example is for demonstration only. Offers are disabled." />
          ) : listing.status.toLowerCase() !== 'active' ? (
            <EmptyState title="Listing unavailable" description={`This listing is currently ${listing.status.toLowerCase()}.`} />
          ) : offerSent ? (
            <div className="success-panel" role="status"><CheckCircle2 size={25} aria-hidden="true" /><h3>Offer sent</h3><p>The farmer can review your offer in AgriSmart. No payment has been taken.</p><button className="button button-secondary button-full" onClick={() => setOfferSent(false)} type="button">Send another offer</button></div>
          ) : (
            <>
              <p className="form-intro">Submit your proposed price and quantity for the farmer to review.</p>
              <form className="form-stack" onSubmit={submit} noValidate>
                <label className="field"><span>Your price per kg (UGX)</span><input min="0.01" name="offered_price_per_kg" required step="any" type="number" /></label>
                <label className="field"><span>Quantity (kg)</span><input max={Number(listing.quantity_kg)} min="0.01" name="quantity_kg" required step="any" type="number" /><small>Up to {Number(listing.quantity_kg).toLocaleString()} kg available</small></label>
                <label className="field"><span>Message <small>(optional)</small></span><textarea maxLength={2000} name="message" rows={3} /></label>
                {offerError ? <p className="form-error" role="alert">{offerError}</p> : null}
                <button className="button button-primary button-full" disabled={offerMutation.isPending} type="submit">{offerMutation.isPending ? 'Sending offer…' : 'Send offer'}</button>
              </form>
              <p className="data-note">An offer is not a payment. Agree on sale and pickup details directly with the farmer.</p>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function Fact({ Icon, label, value }: { Icon: typeof Package; label: string; value: string }) {
  return <div className="fact-item"><span className="fact-icon"><Icon size={17} aria-hidden="true" /></span><span><small>{label}</small><strong>{value}</strong></span></div>;
}
