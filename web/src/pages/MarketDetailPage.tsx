import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, Leaf, Minus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { marketsApi } from '../api/client';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Feedback';
import { Currency } from '../components/format';
import { formatDate } from '../components/formatDate';

export function MarketDetailPage() {
  const { id = '' } = useParams();
  const commodityQuery = useQuery({
    queryKey: ['markets', 'commodities'],
    queryFn: marketsApi.getCommodities,
  });
  const currentQuery = useQuery({
    queryKey: ['markets', 'current-price', id, 10],
    queryFn: () => marketsApi.getCurrentPrices(id, 10),
    enabled: Boolean(id),
  });
  const historyQuery = useQuery({
    queryKey: ['markets', 'price-history', id],
    queryFn: () => marketsApi.getPriceHistory(id),
    enabled: Boolean(id),
  });
  if (commodityQuery.isPending || currentQuery.isPending || historyQuery.isPending) {
    return <LoadingState label="Loading commodity prices and history…" />;
  }
  const error = commodityQuery.error ?? currentQuery.error ?? historyQuery.error;
  if (error) {
    return <ErrorState error={error} onRetry={() => void Promise.all([commodityQuery.refetch(), currentQuery.refetch(), historyQuery.refetch()])} title="Could not load commodity information" />;
  }
  if (!commodityQuery.data || !currentQuery.data || !historyQuery.data) {
    return <LoadingState label="Preparing commodity details…" />;
  }
  const commodity = commodityQuery.data.find((item) => item.id === id);
  if (!commodity) {
    return <EmptyState title="Commodity not found" description="This commodity is no longer available in the market service." action={<Link className="button button-secondary button-compact" to="/markets"><ArrowLeft size={15} /> Back to markets</Link>} />;
  }
  const prices = currentQuery.data.prices;
  const history = historyQuery.data.data;

  return (
    <>
      <Link className="back-link page-back" to="/markets"><ArrowLeft size={16} aria-hidden="true" /> All markets</Link>
      <PageHeader eyebrow={commodity.category} title={commodity.name} description={`Market prices per ${commodity.unit}, based on reports returned by AgriSmart.`} />
      <section className="content-section" aria-labelledby="current-prices-heading">
        <div className="section-heading"><div><p className="eyebrow">CURRENT MARKET REPORTS</p><h2 id="current-prices-heading">Latest available prices</h2></div><span className="record-count">{currentQuery.data.total_markets} markets reported</span></div>
        {prices.length === 0 ? (
          <EmptyState title="No recent prices" description="The market service has no current records for this commodity." />
        ) : (
          <div className="market-price-grid">
            {prices.map((price) => (
              <article className="market-price-card" key={`${price.market_id}-${price.recorded_date}`}>
                <div className="market-price-card-top"><span className="commodity-icon"><Leaf size={17} aria-hidden="true" /></span><span className="category-badge">{price.district}</span></div>
                <h3>{price.market_name}</h3>
                <p className="market-price-value"><Currency value={price.price_per_unit} unit={price.unit} /></p>
                <div className="market-price-meta">
                  <span>{formatDate(price.recorded_date)}</span>
                  <span>{price.change_percent == null ? <Minus size={14} /> : <><ArrowUpRight size={14} /> {price.change_percent}%</>}</span>
                </div>
                <p className="table-subtext">Source: {price.source || 'Not specified'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="content-section history-section" aria-labelledby="price-history-heading">
        <div className="section-heading"><div><p className="eyebrow">TRENDS</p><h2 id="price-history-heading">Weekly price history</h2></div><span className="record-count">Last {historyQuery.data.period_months} months</span></div>
        {history.length === 0 ? (
          <EmptyState title="History not available" description="There are no historical market records for the selected period." />
        ) : (
          <div className="table-card">
            <table className="data-table">
              <caption className="sr-only">Weekly history for {commodity.name}</caption>
              <thead><tr><th scope="col">Week starting</th><th scope="col">Average price</th><th scope="col">Lowest reported</th><th scope="col">Highest reported</th><th scope="col">Market records</th></tr></thead>
              <tbody>
                {history.map((row, index) => (
                  <tr key={`${row.date ?? 'week'}-${index}`}>
                    <td>{formatDate(row.date)}</td>
                    <td className="price-cell">{row.avg_price == null ? '—' : <Currency value={row.avg_price} />}</td>
                    <td>{row.min_price == null ? '—' : <Currency value={row.min_price} />}</td>
                    <td>{row.max_price == null ? '—' : <Currency value={row.max_price} />}</td>
                    <td>{row.sample_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="data-note">Market values are historical reports, not guaranteed offers. Confirm current availability and quality directly with the market.</p>
      </section>
    </>
  );
}
