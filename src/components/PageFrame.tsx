export default function PageFrame({
  children,
  layout = "single",
  header,
  aside,
}: {
  children: React.ReactNode;
  layout?: "single" | "main-aside" | "wide" | "front";
  header?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const split = layout === "main-aside" || layout === "front";
  return (
    <main className="page-shell">
      {header ? <div className="page-shell__header">{header}</div> : null}
      <div className="page-frame" data-layout={layout} data-aside={aside ? "true" : undefined}>
        {split ? (
          <>
            <div className="page-frame__main">{children}</div>
            {aside ? <aside className="page-frame__aside">{aside}</aside> : null}
          </>
        ) : (
          children
        )}
      </div>
    </main>
  );
}
