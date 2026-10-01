import type { ReactNode } from "react";

export function DossierBlock({
  index,
  title,
  extra,
  children,
}: {
  index: string;
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-desk`;
  return (
    <section className="dossier-window__block" aria-labelledby={headingId}>
      <header className="dossier-window__index">
        <span className="dossier-window__n" aria-hidden="true">
          {index}
        </span>
        <h3 className="dossier-window__heading" id={headingId}>
          {title}
        </h3>
        <span className="dossier-window__hairline" aria-hidden="true" />
        {extra}
      </header>
      <div className="dossier-window__panel">{children}</div>
    </section>
  );
}
