import Link from "next/link";

export type RecordItem = {
  href?: string;
  title: string;
  meta?: string;
  date?: string;
};

export function RecordRow({
  href,
  title,
  meta,
  date,
  children,
}: RecordItem & { children?: React.ReactNode }) {
  return (
    <li className="record-row">
      <div className="record-row__main">
        {children ??
          (href ? (
            href.startsWith("http://") || href.startsWith("https://") ? (
              <a href={href} className="g-link">
                {title}
              </a>
            ) : (
              <Link href={href} className="g-link">
                {title}
              </Link>
            )
          ) : (
            <span className="g-body">{title}</span>
          ))}
      </div>
      {date || meta ? (
        <div className="record-row__meta">
          {date ? <span className="g-meta g-mono">{date}</span> : null}
          {meta ? <span className="g-meta">{meta}</span> : null}
        </div>
      ) : null}
    </li>
  );
}

export default function RecordList({
  items,
  empty,
  children,
}: {
  items?: RecordItem[];
  empty?: string;
  children?: React.ReactNode;
}) {
  if (children) {
    return <ul className="record-list">{children}</ul>;
  }
  if (!items || items.length === 0) {
    return empty ? <p className="g-caption">{empty}</p> : null;
  }
  return (
    <ul className="record-list">
      {items.map((item, index) => (
        <RecordRow key={`${item.href ?? item.title}-${index}`} {...item} />
      ))}
    </ul>
  );
}
