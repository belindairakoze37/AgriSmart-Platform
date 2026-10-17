import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { getApiErrorMessage } from '../api/client';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading AgriSmart data…' }: { label?: string }) {
  return (
    <div className="state-card" aria-live="polite" role="status">
      <LoaderCircle className="spin" size={23} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = 'Could not load this information',
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="state-card state-error" role="alert">
      <AlertTriangle size={23} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{getApiErrorMessage(error)}</p>
        <button className="button button-secondary button-compact" onClick={onRetry} type="button">
          <RefreshCw size={15} aria-hidden="true" /> Try again
        </button>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark"><AlertTriangle size={20} aria-hidden="true" /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
