import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, MapPin, Plus, Search, Wheat, X } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNextPage } from '../api/pagination';
import { getApiErrorMessage, marketplaceApi } from '../api/client';
import type { Offer } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Feedback';
import { Currency } from '../components/format';
import { formatDate } from '../components/formatDate';

export function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'browse' | 'mine' | 'offers'>('browse');
  const deferredSearch = useDeferredValue(search.trim());
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listingsQuery = useInfiniteQuery({
    queryKey: ['marketplace', 'listings', view, view === 'browse' ? deferredSearch : ''],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      view === 'mine'
        ? marketplaceApi.getMyListings(pageParam)
        : marketplaceApi.getListings(pageParam, deferredSearch),
    getNextPageParam: getNextPage,
    enabled: view !== 'offers',
  });
  const offersQuery = useInfiniteQuery({
    queryKey: ['marketplace', 'offers'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => marketplaceApi.getOffers(pageParam),
    getNextPageParam: getNextPage,
    enabled: view === 'offers',
  });
  const offerMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) =>
      marketplaceApi.updateOfferStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'offers'] }),
        queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] }),
      ]);
    },
  });
  const listings = listingsQuery.data?.pages.flatMap((page) => page.results) ?? [];
  const offers = offersQuery.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="BUY AND SELL PRODUCE"
        title={view === 'mine' ? 'My listings' : view === 'offers' ? 'Marketplace offers' : 'Marketplace'}
        description={view === 'mine' ? 'Review the produce listings you have published.' : view === 'offers' ? 'Review offers you sent and offers received on your listings.' : 'Browse active produce listings from farmers.'}
        action={<Link className="button button-primary" to="/marketplace/create"><Plus size={17} aria-hidden="true" /> Create listing</Link>}
      />
      <div className="marketplace-toolbar">
        <div className="segmented-control" role="group" aria-label="Marketplace view">
          <button aria-pressed={view === 'browse'} className={view === 'browse' ? 'segment-active' : ''} onClick={() => setView('browse')} type="button">Browse listings</button>
          <button aria-pressed={view === 'mine'} className={view === 'mine' ? 'segment-active' : ''} onClick={() => setView('mine')} type="button">My listings</button>
          <button aria-pressed={view === 'offers'} className={view === 'offers' ? 'segment-active' : ''} onClick={() => setView('offers')} type="button">Offers</button>
        </div>
        {view === 'browse' ? (
          <label className="search-field marketplace-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search active listings</span>
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Search title or description" value={search} />
          </label>
        ) : null}
      </div>
      {view === 'offers' ? (
        offersQuery.isPending ? <LoadingState label="Loading offers…" /> : offersQuery.isError ? (
          <ErrorState error={offersQuery.error} onRetry={() => void offersQuery.refetch()} title="Offers unavailable" />
        ) : offers.length === 0 ? (
          <EmptyState title="No offers yet" description="Offers you send and offers received on your listings will appear here." />
        ) : (
          <>
            <p className="result-count">{offersQuery.data?.pages[0]?.count ?? 0} offers on your account</p>
            {offerMutation.isError ? <p className="inline-error" role="alert">{getApiErrorMessage(offerMutation.error)}</p> : null}
            <div className="offers-list">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  isBuyer={offer.buyer === user?.id}
                  busy={offerMutation.isPending}
                  onStatus={(status) => offerMutation.mutate({ id: offer.id, status })}
                />
              ))}
            </div>
            {offersQuery.hasNextPage ? <div className="load-more-row"><button className="button button-secondary" disabled={offersQuery.isFetchingNextPage} onClick={() => void offersQuery.fetchNextPage()} type="button">{offersQuery.isFetchingNextPage ? 'Loading offers…' : 'Load more offers'}</button></div> : null}
            <p className="data-note">Accepting an offer creates a backend transaction record and marks its listing sold. It does not process or collect payment.</p>
          </>
        )
      ) : listingsQuery.isPending ? <LoadingState label="Loading produce listings…" /> : listingsQuery.isError && listings.length === 0 ? (
        <ErrorState error={listingsQuery.error} onRetry={() => void listingsQuery.refetch()} title="Marketplace unavailable" />
      ) : listings.length === 0 ? (
        <EmptyState
          title={view === 'mine' ? 'No listings yet' : search ? 'No listings match' : 'Marketplace is quiet'}
          description={view === 'mine' ? 'Your published listings will appear here.' : search ? 'Try another listing title or description.' : 'There are no active produce listings to display right now.'}
          action={view === 'mine' ? <Link className="button button-primary button-compact" to="/marketplace/create"><Plus size={15} /> Create a listing</Link> : undefined}
        />
      ) : (
        <>
          <p className="result-count">{listingsQuery.data?.pages[0]?.count ?? 0} {view === 'mine' ? 'listings from your account' : 'active listings'}</p>
          {listingsQuery.isError ? <p className="inline-error" role="status">More listings could not be loaded. The listings already retrieved are still shown.</p> : null}
          <div className="listing-grid">
            {listings.map((listing) => {
              const image = listing.images.find((url) => /^https?:\/\//i.test(url));
              return (
                <article className="listing-card" key={listing.id}>
                  <Link className="listing-image" to={`/marketplace/${listing.id}`} aria-label={`Open ${listing.title}`}>
                    {image ? <img alt="" loading="lazy" src={image} /> : <span className="listing-placeholder"><Wheat size={35} aria-hidden="true" /><small>Produce listing</small></span>}
                    <span className="listing-grade">Grade {listing.quality_grade}</span>
                    {listing.is_demo ? <span className="listing-sample-badge">Sample</span> : null}
                  </Link>
                  <div className="listing-card-body">
                    <p className="eyebrow">{listing.commodity_name}</p>
                    <h2><Link to={`/marketplace/${listing.id}`}>{listing.title}</Link></h2>
                    <p className="listing-summary">{listing.description || 'Contact the farmer for more information about this produce.'}</p>
                    <div className="listing-meta"><span><MapPin size={14} aria-hidden="true" /> {listing.district_name}</span><span>{Number(listing.quantity_kg).toLocaleString()} kg available</span></div>
                    <div className="listing-card-footer">
                      <strong><Currency value={listing.expected_price_per_kg} unit="kg" /></strong>
                      <small>Available {formatDate(listing.available_from)}</small>
                    </div>
                    <Link className="button button-secondary button-full" to={`/marketplace/${listing.id}`}>View listing <ArrowRight size={15} aria-hidden="true" /></Link>
                  </div>
                </article>
              );
            })}
          </div>
          {listingsQuery.hasNextPage ? (
            <div className="load-more-row">
              <button className="button button-secondary" disabled={listingsQuery.isFetchingNextPage} onClick={() => void listingsQuery.fetchNextPage()} type="button">
                {listingsQuery.isFetchingNextPage ? 'Loading listings…' : 'Load more listings'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

function OfferCard({
  offer,
  isBuyer,
  busy,
  onStatus,
}: {
  offer: Offer;
  isBuyer: boolean;
  busy: boolean;
  onStatus: (status: 'accepted' | 'rejected') => void;
}) {
  return (
    <article className="offer-card">
      <div className="offer-card-top">
        <div><p className="eyebrow">{isBuyer ? 'YOUR OFFER' : 'OFFER RECEIVED'}</p><h2><Link to={`/marketplace/${offer.listing}`}>{offer.listing_title}</Link></h2></div>
        <span className={`status-badge status-${offer.status}`}>{offer.status}</span>
      </div>
      <div className="offer-details">
        <span><small>Offered price</small><strong><Currency value={offer.offered_price_per_kg} unit="kg" /></strong></span>
        <span><small>Quantity</small><strong>{Number(offer.quantity_kg).toLocaleString()} kg</strong></span>
        <span><small>{isBuyer ? 'Your offer' : 'Buyer'}</small><strong>{isBuyer ? 'You' : offer.buyer_name || offer.buyer_phone}</strong></span>
        <span><small>Submitted</small><strong>{formatDate(offer.created_at)}</strong></span>
      </div>
      {offer.message ? <p className="offer-message">{offer.message}</p> : null}
      {offer.status === 'pending' && !isBuyer ? (
        <div className="offer-actions">
          <button className="button button-primary button-compact" disabled={busy} onClick={() => onStatus('accepted')} type="button"><Check size={15} /> Accept offer</button>
          <button className="button button-secondary button-compact" disabled={busy} onClick={() => onStatus('rejected')} type="button"><X size={15} /> Decline</button>
        </div>
      ) : null}
    </article>
  );
}
