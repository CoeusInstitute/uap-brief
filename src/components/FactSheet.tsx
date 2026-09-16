import { DetailItem, DetailList } from "@/components/DetailList";

export type FactItem = {
  label: string;
  value?: string | string[] | null;
};

export default function FactSheet({
  title,
  items,
  footer,
}: {
  title: string;
  items: FactItem[];
  footer?: React.ReactNode;
}) {
  const headingId = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-facts`;
  return (
    <section className="g-card" data-hover="none" aria-labelledby={headingId}>
      <header className="g-card__header">
        <h2 className="g-heading" id={headingId}>
          {title}
        </h2>
      </header>
      <div className="g-card__body">
        <DetailList>
          {items.map((item) => (
            <DetailItem key={item.label} label={item.label} value={item.value} />
          ))}
        </DetailList>
      </div>
      {footer ? <footer className="g-card__footer">{footer}</footer> : null}
    </section>
  );
}
