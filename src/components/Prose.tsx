export function Prose({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="prose-block">
      <p className="g-eyebrow">{label}</p>
      <p className="g-body">{value}</p>
    </div>
  );
}

export function ProseSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-copy`;
  return (
    <section className="g-card" data-hover="none" aria-labelledby={headingId}>
      <header className="g-card__header">
        <h2 className="g-heading" id={headingId}>
          {title}
        </h2>
      </header>
      <div className="g-card__body">{children}</div>
    </section>
  );
}
