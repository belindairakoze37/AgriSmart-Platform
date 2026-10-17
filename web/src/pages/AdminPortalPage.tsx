import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ImagePlus, PackagePlus, Trash2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { adminApi, getApiErrorMessage } from '../api/client';
import type { AdminCommodity } from '../api/types';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Feedback';
import { Currency } from '../components/format';

const categories = [
  ['cereal', 'Cereal'],
  ['legume', 'Legume'],
  ['vegetable', 'Vegetable'],
  ['fruit', 'Fruit'],
  ['root', 'Root / tuber'],
  ['cash_crop', 'Cash crop'],
  ['livestock', 'Livestock'],
  ['other', 'Other'],
] as const;

export function AdminPortalPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminCommodity | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number][0]>('cereal');
  const [unit, setUnit] = useState('kg');
  const [image, setImage] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [csvInputKey, setCsvInputKey] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const metricsQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
  });
  const commoditiesQuery = useQuery({
    queryKey: ['admin-commodities'],
    queryFn: adminApi.getCommodities,
  });
  const saveMutation = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append('name', name.trim());
      data.append('category', category);
      data.append('unit', unit.trim() || 'kg');
      data.append('is_active', String(editing?.is_active ?? true));
      if (image) data.append('image', image);
      return adminApi.saveCommodity(data, editing?.id);
    },
    onSuccess: async (commodity) => {
      setSaveMessage(`${commodity.name} saved.`);
      resetCommodityForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-commodities'] }),
        queryClient.invalidateQueries({ queryKey: ['markets', 'commodities'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ]);
    },
  });
  const deactivateMutation = useMutation({
    mutationFn: adminApi.deactivateCommodity,
    onSuccess: async (_result, id) => {
      setSaveMessage('Commodity deactivated. Historical prices remain available.');
      if (editing?.id === id) resetCommodityForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-commodities'] }),
        queryClient.invalidateQueries({ queryKey: ['markets', 'commodities'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ]);
    },
  });
  const importMutation = useMutation({
    mutationFn: adminApi.importPrices,
    onSuccess: async (result) => {
      setCsvResult(`${result.created} created · ${result.updated} updated · ${result.total_processed} total`);
      setCsvFile(null);
      setCsvInputKey((current) => current + 1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['markets', 'prices'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
      ]);
    },
  });

  function resetCommodityForm() {
    setEditing(null);
    setName('');
    setCategory('cereal');
    setUnit('kg');
    setImage(null);
    setInputKey((current) => current + 1);
  }

  function editCommodity(commodity: AdminCommodity) {
    setEditing(commodity);
    setName(commodity.name);
    setCategory(commodity.category as (typeof categories)[number][0]);
    setUnit(commodity.unit);
    setImage(null);
    setInputKey((current) => current + 1);
    setSaveMessage('');
  }

  return (
    <>
      <PageHeader
        eyebrow="PLATFORM OPERATIONS"
        title="Administrator dashboard"
        description="Review platform activity, maintain the commodity catalogue, and import verified market reports."
      />

      {metricsQuery.isPending ? <LoadingState label="Loading platform analytics…" /> : metricsQuery.isError ? (
        <ErrorState error={metricsQuery.error} onRetry={() => void metricsQuery.refetch()} title="Analytics unavailable" />
      ) : (
        <>
          <div className="admin-stats" aria-label="Platform analytics">
            <AdminStat icon={<BarChart3 size={19} />} label="Registered users" value={metricsQuery.data.total_users.toLocaleString()} />
            <AdminStat icon={<PackagePlus size={19} />} label="Active listings" value={`${metricsQuery.data.active_listings.toLocaleString()} / ${metricsQuery.data.total_listings.toLocaleString()}`} />
            <AdminStat icon={<UploadCloud size={19} />} label="Market price reports" value={metricsQuery.data.market_price_reports.toLocaleString()} />
            <AdminStat icon={<BarChart3 size={19} />} label="Completed transaction records" value={metricsQuery.data.completed_transactions.toLocaleString()} />
          </div>
          <p className="data-note admin-revenue-note">
            Completed transaction volume recorded: <Currency value={metricsQuery.data.completed_transaction_value_ugx} unit="UGX" />.
            This is platform transaction data, not proof of a mobile-money payment; payments and escrow are not yet connected.
          </p>
        </>
      )}

      <div className="admin-workspace">
        <section className="content-section admin-panel" aria-labelledby="commodity-admin-heading">
          <div className="section-heading">
            <div><p className="eyebrow">CATALOGUE</p><h2 id="commodity-admin-heading">Manage commodities</h2></div>
          </div>
          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              setSaveMessage('');
              saveMutation.mutate();
            }}
          >
            <label htmlFor="commodity-name">Commodity name</label>
            <input id="commodity-name" maxLength={100} onChange={(event) => setName(event.target.value)} required value={name} />
            <label htmlFor="commodity-category">Category</label>
            <select id="commodity-category" onChange={(event) => setCategory(event.target.value as (typeof categories)[number][0])} value={category}>
              {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor="commodity-unit">Trading unit</label>
            <input id="commodity-unit" maxLength={20} onChange={(event) => setUnit(event.target.value)} required value={unit} />
            <label htmlFor="commodity-image">Base image {editing?.image ? '(choose a new image to replace)' : ''}</label>
            <input
              accept="image/*"
              id="commodity-image"
              key={inputKey}
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              type="file"
            />
            {editing ? (
              <label className="admin-active-toggle">
                <input checked={editing.is_active} onChange={(event) => setEditing({ ...editing, is_active: event.target.checked })} type="checkbox" />
                Available to farmers and buyers
              </label>
            ) : null}
            {saveMutation.isError ? <p className="inline-error" role="alert">{getApiErrorMessage(saveMutation.error)}</p> : null}
            {saveMessage ? <p className="form-success" role="status">{saveMessage}</p> : null}
            <div className="admin-form-actions">
              <button className="button button-primary" disabled={saveMutation.isPending || !name.trim()} type="submit">
                <PackagePlus size={16} /> {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add commodity'}
              </button>
              {editing ? <button className="button button-secondary" onClick={resetCommodityForm} type="button">Cancel</button> : null}
            </div>
          </form>
        </section>

        <section className="content-section admin-panel" aria-labelledby="price-import-heading">
          <div className="section-heading">
            <div><p className="eyebrow">MAAIF PRICE DATA</p><h2 id="price-import-heading">Import market prices</h2></div>
            <UploadCloud size={19} aria-hidden="true" />
          </div>
          <p className="admin-help">Upload UTF-8 CSV data. Required headers: <code>market, commodity, price_per_unit, recorded_date</code>. Optional: <code>unit, price_type, source</code>. Market and commodity names must match active catalogue entries. Rows are validated before any changes are applied.</p>
          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (csvFile) importMutation.mutate(csvFile);
            }}
          >
            <label htmlFor="market-prices-csv">CSV file</label>
            <input accept=".csv,text/csv" id="market-prices-csv" key={csvInputKey} onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} required type="file" />
            {importMutation.isError ? <p className="inline-error" role="alert">{getApiErrorMessage(importMutation.error)}</p> : null}
            {importMutation.isSuccess ? <p className="form-success" role="status">{csvResult}</p> : null}
            <button className="button button-primary" disabled={!csvFile || importMutation.isPending} type="submit">
              <UploadCloud size={16} /> {importMutation.isPending ? 'Validating and importing…' : 'Import price CSV'}
            </button>
          </form>
        </section>
      </div>

      <section className="content-section admin-commodity-list" aria-labelledby="commodity-list-heading">
        <div className="section-heading">
          <div><p className="eyebrow">CATALOGUE</p><h2 id="commodity-list-heading">All commodities</h2></div>
          {commoditiesQuery.data ? <span className="record-count">{commoditiesQuery.data.length} entries</span> : null}
        </div>
        {commoditiesQuery.isPending ? <LoadingState label="Loading commodity catalogue…" /> : commoditiesQuery.isError ? (
          <ErrorState error={commoditiesQuery.error} onRetry={() => void commoditiesQuery.refetch()} />
        ) : commoditiesQuery.data.length ? (
          <div className="admin-commodity-grid">
            {commoditiesQuery.data.map((commodity) => (
              <article className={`admin-commodity-card${commodity.is_active ? '' : ' admin-commodity-inactive'}`} key={commodity.id}>
                {commodity.image ? <img alt="" loading="lazy" src={commodity.image} /> : <span className="admin-commodity-placeholder"><ImagePlus size={21} /></span>}
                <div className="admin-commodity-copy">
                  <strong>{commodity.name}</strong>
                  <small>{commodity.category.replaceAll('_', ' ')} · per {commodity.unit}</small>
                  <span className={`admin-status${commodity.is_active ? '' : ' admin-status-inactive'}`}>{commodity.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="admin-commodity-actions">
                  <button className="button button-secondary button-compact" onClick={() => editCommodity(commodity)} type="button">Edit</button>
                  {commodity.is_active ? (
                    <button
                      aria-label={`Deactivate ${commodity.name}`}
                      className="admin-delete-button"
                      disabled={deactivateMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Deactivate ${commodity.name}? Historical price records will be kept.`)) {
                          deactivateMutation.mutate(commodity.id);
                        }
                      }}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No commodities yet" description="Add a commodity to make it available in the farmer and buyer marketplaces." />
        )}
        {deactivateMutation.isError ? <p className="inline-error" role="alert">{getApiErrorMessage(deactivateMutation.error)}</p> : null}
      </section>
    </>
  );
}

function AdminStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="admin-stat">
      <span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div>
    </article>
  );
}
