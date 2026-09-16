export function DetailList({ children }: { children: React.ReactNode }) {
  return <dl className="g-detail-list">{children}</dl>;
}

export function DetailItem({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const text = Array.isArray(value) ? value.join(" · ") : value;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{text}</dd>
    </div>
  );
}

export function CopyBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="g-eyebrow">{label}</p>
      <p className="g-body">{value}</p>
    </div>
  );
}
