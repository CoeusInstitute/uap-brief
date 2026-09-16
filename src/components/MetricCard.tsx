import Link from "next/link";

export function MetricStrip({ children }: { children: React.ReactNode }) {
  return <div className="metric-strip">{children}</div>;
}

export default function MetricCard({
  label,
  value,
  href,
  featured = false,
}: {
  label: string;
  value: number | string;
  href?: string;
  featured?: boolean;
}) {
  return (
    <article
      className="g-card g-card--metric"
      data-material={featured ? "gradient" : "flat"}
      data-edge={featured ? undefined : "quiet"}
      data-hover="none"
    >
      {href ? (
        <Link href={href} className="g-link">
          {label}
        </Link>
      ) : (
        <p className="g-caption">{label}</p>
      )}
      <p className="g-number">{value}</p>
    </article>
  );
}
