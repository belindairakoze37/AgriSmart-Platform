export function Currency({ value, unit }: { value: number | string; unit?: string }) {
  const numeric = Number(value);
  return (
    <span>
      UGX {Number.isFinite(numeric) ? numeric.toLocaleString() : value}
      {unit ? <span className="unit-label"> / {unit}</span> : null}
    </span>
  );
}
