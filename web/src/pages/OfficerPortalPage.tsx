import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, MapPin, Send, Sprout, UsersRound, Wheat } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { getApiErrorMessage, officerApi } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/Feedback';

export function OfficerPortalPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [districtInput, setDistrictInput] = useState('');
  const [district, setDistrict] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ['officer-dashboard', district],
    queryFn: () => officerApi.getDashboard(district),
  });
  const advisoryMutation = useMutation({
    mutationFn: () => officerApi.sendAdvisory({
      title: title.trim(),
      message: message.trim(),
      ...(isAdmin && district ? { district } : {}),
    }),
    onSuccess: async (result) => {
      setTitle('');
      setMessage('');
      setDeliveryMessage(
        `Advisory delivered to ${result.notified} farmers. ${result.skipped_by_preferences} farmers have advisories disabled.`,
      );
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="FIELD OPERATIONS"
        title="Extension officer portal"
        description="Support farmers in your district and review verified disease reports."
      />

      {isAdmin ? (
        <form
          className="officer-district-filter"
          onSubmit={(event) => {
            event.preventDefault();
            setDistrict(districtInput.trim());
          }}
        >
          <label htmlFor="officer-district">District filter</label>
          <input
            id="officer-district"
            onChange={(event) => setDistrictInput(event.target.value)}
            placeholder="All districts"
            value={districtInput}
          />
          <button className="button button-secondary button-compact" type="submit">Apply</button>
          {district ? (
            <button
              className="text-link officer-clear-filter"
              onClick={() => {
                setDistrict('');
                setDistrictInput('');
              }}
              type="button"
            >
              Clear filter
            </button>
          ) : null}
        </form>
      ) : null}

      {dashboardQuery.isPending ? <LoadingState label="Loading district operations…" /> : dashboardQuery.isError ? (
        <ErrorState
          error={dashboardQuery.error}
          onRetry={() => void dashboardQuery.refetch()}
          title="Officer dashboard unavailable"
        />
      ) : (
        <>
          <div className="officer-stats" aria-label="District summary">
            <StatCard icon={<UsersRound size={19} />} label="Farmers" value={dashboardQuery.data.farmer_count} />
            <StatCard icon={<Sprout size={19} />} label="Registered farms" value={dashboardQuery.data.farm_count} />
            <StatCard icon={<Wheat size={19} />} label="Active produce listings" value={dashboardQuery.data.active_listing_count} />
          </div>

          <div className="officer-columns">
            <section className="content-section officer-panel" aria-labelledby="bulk-advisory-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">DISTRICT MESSAGING</p>
                  <h2 id="bulk-advisory-heading">Send farmer advisory</h2>
                </div>
                <BellRing size={19} aria-hidden="true" />
              </div>
              <p className="officer-help">
                This creates an in-app notification for farmers in {dashboardQuery.data.district || 'all districts'}.
                Farmers who disabled advisories will be skipped.
              </p>
              <form
                className="officer-advisory-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  advisoryMutation.mutate();
                }}
              >
                <label htmlFor="advisory-title">Title</label>
                <input
                  id="advisory-title"
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  value={title}
                />
                <label htmlFor="advisory-message">Message</label>
                <textarea
                  id="advisory-message"
                  maxLength={5000}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  rows={5}
                  value={message}
                />
                {advisoryMutation.isError ? (
                  <p className="inline-error" role="alert">{getApiErrorMessage(advisoryMutation.error)}</p>
                ) : null}
                {deliveryMessage ? <p className="form-success" role="status">{deliveryMessage}</p> : null}
                <button
                  className="button button-primary"
                  disabled={advisoryMutation.isPending || !title.trim() || !message.trim()}
                  type="submit"
                >
                  <Send size={16} aria-hidden="true" />
                  {advisoryMutation.isPending ? 'Sending…' : 'Send advisory'}
                </button>
              </form>
            </section>

            <section className="content-section officer-panel" aria-labelledby="outbreaks-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">LAST 30 DAYS · 10+ FARMERS</p>
                  <h2 id="outbreaks-heading">Disease outbreak reports</h2>
                </div>
                <MapPin size={19} aria-hidden="true" />
              </div>
              {dashboardQuery.data.outbreaks.length ? (
                <ul className="officer-outbreaks">
                  {dashboardQuery.data.outbreaks.map((outbreak) => (
                    <li key={`${outbreak.district}:${outbreak.crop_type}:${outbreak.disease}`}>
                      <span className="outbreak-location"><MapPin size={14} />{outbreak.district}</span>
                      <strong>{outbreak.disease}</strong>
                      <span>{outbreak.crop_type} · {outbreak.farmers_affected} farmers · {outbreak.reports} reports</span>
                      {outbreak.latitude !== null && outbreak.longitude !== null ? (
                        <a
                          className="outbreak-map-link"
                          href={`https://www.openstreetmap.org/?mlat=${outbreak.latitude}&mlon=${outbreak.longitude}#map=10/${outbreak.latitude}/${outbreak.longitude}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open district hotspot map
                        </a>
                      ) : <span className="outbreak-no-map">Map coordinates are not available for this district.</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No confirmed hotspots"
                  description="A hotspot appears when at least 10 distinct farmers report the same crop disease in the same district during the last 30 days."
                />
              )}
            </section>
          </div>

          <section className="content-section officer-farmers" aria-labelledby="farmers-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{dashboardQuery.data.district || 'ALL DISTRICTS'}</p>
                <h2 id="farmers-heading">Farmers in your service area</h2>
              </div>
              <span className="result-count">{dashboardQuery.data.farmer_count} farmers</span>
            </div>
            {dashboardQuery.data.farmers.length ? (
              <div className="officer-table-wrap">
                <table className="officer-table">
                  <thead>
                    <tr><th>Farmer</th><th>Farm size</th><th>Farms</th><th>Active listings</th><th>Primary crops</th></tr>
                  </thead>
                  <tbody>
                    {dashboardQuery.data.farmers.map((farmer) => (
                      <tr key={farmer.id}>
                        <td><strong>{farmer.full_name || farmer.phone_number}</strong><small>{farmer.phone_number}</small></td>
                        <td>{farmer.farm_size_acres ? `${farmer.farm_size_acres} acres` : 'Not provided'}</td>
                        <td>{farmer.farm_count}</td>
                        <td>{farmer.active_listing_count}</td>
                        <td>{farmer.primary_crops.length ? farmer.primary_crops.join(', ') : 'Not provided'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dashboardQuery.data.farmers_truncated ? (
                  <p className="data-note">Showing the first 100 farmers. Use the district filter to narrow this list.</p>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No farmers found" description="No farmer profiles match this service area yet." />
            )}
          </section>
        </>
      )}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="officer-stat-card">
      <span>{icon}</span>
      <div><strong>{value.toLocaleString()}</strong><small>{label}</small></div>
    </article>
  );
}
