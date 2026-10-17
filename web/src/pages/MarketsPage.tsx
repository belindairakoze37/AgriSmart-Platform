import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowUp, ArrowUpDown, Leaf, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { marketsApi } from '../api/client';
import type { MarketPrice } from '../api/types';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Feedback';
import { Currency } from '../components/format';
import { formatDate } from '../components/formatDate';

export function MarketsPage() {
  const [search, setSearch] = useState('');
  const commoditiesQuery = useQuery({
    queryKey: ['markets', 'commodities'],
    queryFn: marketsApi.getCommodities,
  });
  const pricesQuery = useInfiniteQuery({
    queryKey: ['markets', 'prices'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => marketsApi.getPrices(pageParam),
    getNextPageParam: (lastPage, _pages, pageParam) =>
      lastPage.next ? pageParam + 1 : undefined,
  });
  const latestPrices = useMemo(() => {
    const result = new Map<string, MarketPrice>();
    for (const page of pricesQuery.data?.pages ?? []) {
      for (const price of page.results) {
        if (!result.has(price.commodity)) result.set(price.commodity, price);
      }
    }
    return result;
  }, [pricesQuery.data]);
  const commodities = (commoditiesQuery.data ?? []).filter((commodity) => {
    const normalized = search.trim().toLocaleLowerCase();
    return (
      commodity.name.toLocaleLowerCase().includes(normalized) ||
      commodity.category.toLocaleLowerCase().includes(normalized)
    );
  });

  if (commoditiesQuery.isPending || pricesQuery.isPending) {
    return <LoadingState label="Loading commodities and market records…" />;
  }
  if (commoditiesQuery.isError) {
    return <ErrorState error={commoditiesQuery.error} onRetry={() => void commoditiesQuery.refetch()} title="Could not load commodities" />;
  }

  return (
    <>
      <PageHeader
        eyebrow="LOCAL MARKET INFORMATION"
        title="Markets"
        description="Explore commodity prices reported across active markets."
        action={<span className="record-count">{commoditiesQuery.data.length} commodities</span>}
      />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search commodities</span>
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or category" value={search} />
        </label>
      </div>
      {pricesQuery.isError && !pricesQuery.data?.pages.length ? (
        <ErrorState error={pricesQuery.error} onRetry={() => void pricesQuery.refetch()} title="Market prices unavailable" />
      ) : commodities.length === 0 ? (
        <EmptyState title={search ? 'No matching commodities' : 'No commodities available'} description={search ? 'Try a different search term.' : 'The market service has not returned any commodities yet.'} />
      ) : (
        <>
          {pricesQuery.isError ? <p className="inline-error" role="status">Some market price records could not be loaded. The displayed records may be incomplete.</p> : null}
          <div className="table-card">
            <table className="data-table market-table">
              <caption className="sr-only">Commodity market prices</caption>
              <thead>
                <tr>
                  <th scope="col"><span className="th-label">Commodity <ArrowUpDown size={13} aria-hidden="true" /></span></th>
                  <th scope="col">Category</th>
                  <th scope="col">Latest reported price</th>
                  <th scope="col">Market</th>
                  <th scope="col">Recorded</th>
                  <th scope="col"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody>
                {commodities.map((commodity) => {
                  const price = latestPrices.get(commodity.id);
                  return (
                    <tr key={commodity.id}>
                      <th scope="row">
                        <Link className="commodity-table-name" to={`/markets/${commodity.id}`}>
                          <span className="commodity-icon"><Leaf size={17} aria-hidden="true" /></span>
                          <span>{commodity.name}<small>per {commodity.unit}</small></span>
                        </Link>
                      </th>
                      <td><span className="category-badge">{commodity.category}</span></td>
                      <td className="price-cell">{price ? <Currency value={price.price_per_unit} unit={price.unit} /> : <span className="muted-text">No recent price</span>}</td>
                      <td>{price?.market_name ?? '—'}{price?.district_name ? <small className="table-subtext">{price.district_name}</small> : null}</td>
                      <td>{price ? formatDate(price.recorded_date) : '—'}</td>
                      <td><Link aria-label={`View ${commodity.name} price details`} className="table-action" to={`/markets/${commodity.id}`}>Details <ArrowUp size={13} aria-hidden="true" /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pricesQuery.hasNextPage ? (
            <div className="load-more-row">
              <button className="button button-secondary" disabled={pricesQuery.isFetchingNextPage} onClick={() => void pricesQuery.fetchNextPage()} type="button">
                {pricesQuery.isFetchingNextPage ? 'Loading records…' : 'Load more price records'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
