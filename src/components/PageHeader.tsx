export default function PageHeader({
  eyebrow,
  title,
  children,
  meta,
  actions,
  display = false,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  display?: boolean;
}) {
  return (
    <header className="page-header">
      {eyebrow ? <p className="g-eyebrow">{eyebrow}</p> : null}
      <div className="page-header__title-row">
        <h1 className={display ? "g-display" : "g-title"}>{title}</h1>
        {actions}
      </div>
      {children ? <div className="g-subleader page-header__lede">{children}</div> : null}
      {meta ? <div className="page-header__meta g-row">{meta}</div> : null}
      <hr className="g-divider" />
    </header>
  );
}
