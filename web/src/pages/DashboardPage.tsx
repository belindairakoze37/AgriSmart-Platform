import { useQueries, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ChartNoAxesCombined,
  Leaf,
  MessageCircle,
  ShoppingBasket,
  Sprout,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { advisoryApi, marketsApi, marketplaceApi } from '../api/client';
import type { AdvisorySession } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Feedback';
import { Currency } from '../components/format';
import { formatDate } from '../components/formatDate';

const actions = [
  { to: '/markets', title: 'Explore market prices', copy: 'View reported produce prices and history.', Icon: ChartNoAxesCombined },
  { to: '/advisory', title: 'Ask an advisor', copy: 'Get crop guidance and return to past chats.', Icon: MessageCircle },
  { to: '/marketplace', title: 'Open marketplace', copy: 'Find produce or post your own listing.', Icon: ShoppingBasket },
];

export function DashboardPage() {
  const { user } = useAuth();
  const commoditiesQuery = useQuery({
    queryKey: ['markets', 'commodities'],
    queryFn: marketsApi.getCommodities,
  });
  const topCommodities = (commoditiesQuery.data ?? []).slice(0, 3);
  const priceQueries = useQueries({
    queries: topCommodities.map((commodity) => ({
      queryKey: ['markets', 'current-price', commodity.id],
      queryFn: () => marketsApi.getCurrentPrices(commodity.id, 1),
      staleTime: 5 * 60_000,
    })),
  });
  const sessionsQuery = useQuery({
    queryKey: ['advisory', 'sessions'],
    queryFn: () => advisoryApi.getSessions(),
  });
  const listingsQuery = useQuery({
    queryKey: ['marketplace', 'listings', 'dashboard'],
    queryFn: () => marketplaceApi.getListings(1),
  });
  const currentPriceError = priceQueries.find((query) => query.error)?.error;

  return (
    <>
      <PageHeader eyebrow="AGRISMART · UGANDA" title={`Hello${user?.first_name ? `, ${user.first_name}` : ''}`} description="A better day starts with a good plan." />
      <section className="dashboard-hero">
        <div className="dashboard-hero-icon"><Sprout size={25} aria-hidden="true" /></div>
        <div>
          <p className="hero-kicker">YOUR FARM, BETTER INFORMED</p>
          <h2>Make your next farming decision with confidence.</h2>
          <p>Check the market, explore practical guidance, and connect with produce buyers.</p>
        </div>
        <Link className="hero-action-link" to="/markets" aria-label="Explore the markets"><ArrowRight size={19} /></Link>
      </section>

      <section className="content-section" aria-labelledby="actions-heading">
        <div className="section-heading">
          <div><p className="eyebrow">YOUR TOOLS</p><h2 id="actions-heading">Quick access</h2></div>
        </div>
        <div className="quick-action-grid">
          {actions.map(({ to, title, copy, Icon }) => (
            <Link className="quick-action-card" key={to} to={to}>
              <span className="quick-action-icon"><Icon size={20} aria-hidden="true" /></span>
              <span className="quick-action-copy"><strong>{title}</strong><small>{copy}</small></span>
              <ArrowRight className="quick-action-arrow" size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="content-section" aria-labelledby="market-watch-heading">
          <div className="section-heading">
            <div><p className="eyebrow">MARKET DATA</p><h2 id="market-watch-heading">Market watch</h2></div>
            <Link className="text-link" to="/markets">All markets <ArrowRight size={15} /></Link>
          </div>
          {commoditiesQuery.isPending || priceQueries.some((query) => query.isPending) ? (
            <LoadingState label="Loading market prices…" />
          ) : commoditiesQuery.isError ? (
            <ErrorState error={commoditiesQuery.error} onRetry={() => void commoditiesQuery.refetch()} />
          ) : currentPriceError ? (
            <ErrorState error={currentPriceError} onRetry={() => void Promise.all(priceQueries.map((query) => query.refetch()))} />
          ) : topCommodities.length === 0 ? (
            <EmptyState title="No market data yet" description="The backend has not published any commodities to display." />
          ) : (
            <div className="market-watch-list">
              {topCommodities.map((commodity, index) => {
                const price = priceQueries[index]?.data?.prices[0];
                return (
                  <Link className="market-watch-row" key={commodity.id} to={`/markets/${commodity.id}`}>
                    <span className="commodity-icon"><Leaf size={18} aria-hidden="true" /></span>
                    <span className="commodity-copy"><strong>{commodity.name}</strong><small>{commodity.category} · per {commodity.unit}</small></span>
                    <span className="market-watch-price">
                      <strong>{price ? <Currency value={price.price_per_unit} unit={price.unit} /> : 'No recent price'}</strong>
                      <small>{price ? `${price.market_name} · ${formatDate(price.recorded_date)}` : 'Open for details'}</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
          <p className="data-note">Prices are reported by markets and shown with their latest record date. The dashboard displays the highest current market result returned for each commodity.</p>
        </section>

        <div className="dashboard-side">
          <section className="content-section" aria-labelledby="advisory-recent-heading">
            <div className="section-heading">
              <div><p className="eyebrow">YOUR ADVISOR</p><h2 id="advisory-recent-heading">Recent conversation</h2></div>
            </div>
            {sessionsQuery.isPending ? <LoadingState label="Checking conversations…" /> : sessionsQuery.isError ? (
              <ErrorState error={sessionsQuery.error} onRetry={() => void sessionsQuery.refetch()} />
            ) : sessionsQuery.data.results[0] ? (
              <RecentSession session={sessionsQuery.data.results[0]} />
            ) : (
              <EmptyState title="Start a conversation" description="Your advisory chat history will be available here." action={<Link className="button button-secondary button-compact" to="/advisory">Ask an advisor</Link>} />
            )}
          </section>
          <section className="content-section" aria-labelledby="listings-recent-heading">
            <div className="section-heading">
              <div><p className="eyebrow">FROM THE MARKETPLACE</p><h2 id="listings-recent-heading">Produce nearby</h2></div>
              <Link className="text-link" to="/marketplace">Browse <ArrowRight size={15} /></Link>
            </div>
            {listingsQuery.isPending ? <LoadingState label="Loading listings…" /> : listingsQuery.isError ? (
              <ErrorState error={listingsQuery.error} onRetry={() => void listingsQuery.refetch()} />
            ) : listingsQuery.data.results.length === 0 ? (
              <EmptyState title="No active listings" description="There are no active produce listings to show right now." />
            ) : (
              <ul className="recent-listings">
                {listingsQuery.data.results.slice(0, 3).map((listing) => (
                  <li key={listing.id}>
                    <Link to={`/marketplace/${listing.id}`}>
                      <span><strong>{listing.title}</strong><small>{listing.commodity_name} · {listing.district_name}</small></span>
                      <strong><Currency value={listing.expected_price_per_kg} unit="kg" /></strong>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function RecentSession({ session }: { session: AdvisorySession }) {
  return (
    <Link className="recent-session-card" to="/advisory" state={{ sessionId: session.id }}>
      <span className="feature-icon"><MessageCircle size={18} aria-hidden="true" /></span>
      <span className="recent-session-copy">
        <strong>{session.title || session.crop_type || 'Farm conversation'}</strong>
        <small>{session.last_message?.content ?? 'Open this conversation'} </small>
        <small>{formatDate(session.updated_at)} · {session.message_count} messages</small>
      </span>
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}
