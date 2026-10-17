export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}
