export default function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const headingId = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-empty`;
  return (
    <section className="g-card" data-edge="dashed" data-hover="none" aria-labelledby={headingId}>
      <header className="g-card__header">
        <h2 className="g-heading" id={headingId}>
          {title}
        </h2>
      </header>
      <div className="g-card__body">
        <div className="g-body">{children}</div>
      </div>
      {action ? <footer className="g-card__footer">{action}</footer> : null}
    </section>
  );
}
