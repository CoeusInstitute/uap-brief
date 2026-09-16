"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { AppearanceNetwork, NetworkLink, NetworkNode } from "@/lib/network";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const ROW = 40;

export default function NetworkDesk({
  network,
  initialQuery = "",
}: {
  network: AppearanceNetwork;
  initialQuery?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<"all" | "person" | "show">("all");
  const [cursor, setCursor] = useState(0);
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [reduce, setReduce] = useState(false);
  const [colors, setColors] = useState({
    bg: "#0e1012",
    person: "#e9e5da",
    show: "#7f9ab8",
    link: "#3a3f45",
    label: "#b8c1cc",
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = document.querySelector(".graphite-ui");
    if (!root) return;
    const style = getComputedStyle(root);
    setColors({
      bg: style.getPropertyValue("--surface-terminal").trim() || "#0e1012",
      person: style.getPropertyValue("--text-heading").trim() || "#e9e5da",
      show: style.getPropertyValue("--accent-primary").trim() || "#7f9ab8",
      link: style.getPropertyValue("--border-default").trim() || "#3a3f45",
      label: style.getPropertyValue("--terminal-output").trim() || "#b8c1cc",
    });
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(320, Math.floor(rect.width)),
        height: Math.max(320, Math.floor(rect.height)),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const needle = query.trim().toLowerCase();

  const visibleNodes = useMemo(() => {
    const matched = network.nodes.filter((node) => {
      if (kind !== "all" && node.kind !== kind) return false;
      if (needle && !`${node.name} ${node.id}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (!needle) return matched;

    const seeds = new Set(matched.map((node) => node.id));
    const keep = new Set(seeds);
    for (const link of network.links) {
      const source = linkSource(link);
      const target = linkTarget(link);
      if (seeds.has(source)) keep.add(target);
      if (seeds.has(target)) keep.add(source);
    }
    return network.nodes.filter((node) => keep.has(node.id));
  }, [network.nodes, network.links, kind, needle]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  const visibleLinks = useMemo(() => {
    if (!needle && kind === "all") return network.links;
    return network.links.filter((link) => visibleIds.has(linkSource(link)) && visibleIds.has(linkTarget(link)));
  }, [network.links, visibleIds, needle, kind]);

  useEffect(() => {
    setCursor(0);
  }, [query, kind]);

  const selected = visibleNodes[cursor] ?? null;
  const neighbors = useMemo(() => {
    if (!selected) return [];
    const next: NetworkNode[] = [];
    for (const link of network.links) {
      const source = linkSource(link);
      const target = linkTarget(link);
      const other = source === selected.id ? target : target === selected.id ? source : null;
      if (!other) continue;
      const node = network.nodes.find((item) => item.id === other);
      if (node) next.push(node);
    }
    return next.sort((a, b) => a.name.localeCompare(b.name));
  }, [selected, network]);

  const graphData = useMemo(
    () => ({
      nodes: visibleNodes.map((node) => ({ ...node })),
      links: visibleLinks.map((link) => ({ ...link })),
    }),
    [visibleNodes, visibleLinks],
  );

  function openNode(node: NetworkNode | null) {
    if (!node) return;
    router.push(node.href);
  }

  return (
    <div
      className="g-terminal network-desk"
      tabIndex={0}
      aria-label="Appearance network"
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLAnchorElement) return;
        event.preventDefault();
        openNode(selected);
      }}
    >
      <header className="g-terminal__toolbar">
        <span className="g-terminal__command">appearances</span>
        <span className="g-terminal__dim">
          {visibleNodes.length} nodes · {visibleLinks.length} edges
          {visibleNodes.length !== network.nodes.length ? ` · ${network.nodes.length} listed` : ""}
        </span>
      </header>

      <div className="directory-index__prompt">
        <span className="g-terminal__prompt" aria-hidden="true">
          ❯
        </span>
        <label className="sr-only" htmlFor={`${listId}-find`}>
          Find a node
        </label>
        <input
          id={`${listId}-find`}
          className="directory-index__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="person or show"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="g-segmented" role="group" aria-label="Node kind">
          {(
            [
              ["all", "All"],
              ["person", "People"],
              ["show", "Shows"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="g-button"
              data-size="sm"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="network-desk__workstation">
        <div className="network-desk__stage" ref={frameRef}>
          {reduce || visibleNodes.length === 0 ? (
            <div className="network-desk__fallback">
              <p className="g-terminal__dim">
                {visibleNodes.length === 0
                  ? "No nodes match that filter."
                  : "Motion is reduced. Use the name list."}
              </p>
            </div>
          ) : (
            <ForceGraph2D
              graphData={graphData}
              width={size.width}
              height={size.height}
              backgroundColor={colors.bg}
              nodeId="id"
              nodeLabel="name"
              nodeVal={(node) => Math.max(1, Number(node.degree) || 1)}
              nodeColor={(node) => (node.kind === "show" ? colors.show : colors.person)}
              linkColor={() => colors.link}
              linkWidth={0.6}
              cooldownTicks={90}
              onNodeClick={(node) => {
                const index = visibleNodes.findIndex((item) => item.id === node.id);
                if (index >= 0) setCursor(index);
                openNode(visibleNodes.find((item) => item.id === node.id) ?? null);
              }}
              nodeCanvasObject={(node, ctx, scale) => {
                const label = String(node.name ?? node.id ?? "");
                const font = Math.max(10, 12 / scale);
                const degree = Number(node.degree) || 1;
                ctx.fillStyle = node.id === selected?.id ? colors.show : node.kind === "show" ? colors.show : colors.person;
                ctx.beginPath();
                ctx.arc(node.x ?? 0, node.y ?? 0, 3 + Math.min(degree, 8) * 0.4, 0, Math.PI * 2);
                ctx.fill();
                if (scale > 1.1 || node.id === selected?.id) {
                  ctx.font = `${font}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-ui") || "Inter, sans-serif"}`;
                  ctx.fillStyle = colors.label;
                  ctx.fillText(label, (node.x ?? 0) + 6, (node.y ?? 0) + 3);
                }
              }}
              nodePointerAreaPaint={(node, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x ?? 0, node.y ?? 0, 8, 0, Math.PI * 2);
                ctx.fill();
              }}
            />
          )}
        </div>

        <section className="directory-index__dossier" aria-labelledby={`${listId}-node`}>
          <div className="network-desk__list" role="listbox" aria-label="Nodes">
            {visibleNodes.map((node, index) => {
              const active = index === cursor;
              return (
                <button
                  key={node.id}
                  type="button"
                  className="g-option directory-index__row"
                  role="option"
                  aria-selected={active}
                  data-highlighted={active ? "true" : undefined}
                  style={{ position: "relative", height: ROW }}
                  onClick={() => {
                    setCursor(index);
                    openNode(node);
                  }}
                >
                  <span className="directory-index__caret" aria-hidden="true">
                    {active ? "›" : ""}
                  </span>
                  <span className="directory-index__name">{node.name}</span>
                  <span className="directory-index__sid">{node.kind}</span>
                </button>
              );
            })}
          </div>
          {selected ? (
            <div className="directory-index__dossier-body">
              <div className="directory-index__dossier-head">
                <span className="g-badge">{selected.kind}</span>
                <h2 id={`${listId}-node`} className="directory-index__dossier-name">
                  {selected.name}
                </h2>
                <p className="g-mono g-terminal__dim">
                  {selected.id} · {selected.degree} edges
                </p>
              </div>
              {neighbors.length > 0 ? (
                <ul className="record-list">
                  {neighbors.slice(0, 12).map((node) => (
                    <li key={node.id} className="record-row">
                      <Link href={node.href} className="g-link">
                        {node.name}
                      </Link>
                      <span className="g-meta">{node.kind}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="g-caption">No neighbors in this slice.</p>
              )}
              <div className="directory-index__dossier-action">
                <Link href={selected.href} className="g-button g-button--primary">
                  Open
                </Link>
              </div>
            </div>
          ) : (
            <div className="directory-index__dossier-empty">
              <p className="g-terminal__dim">Select a person or show.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="g-terminal__footer">
        <span>Appearance edges only.</span>
        <span>{reduce ? "reduced motion · list" : "tap a name to open"}</span>
      </footer>
    </div>
  );
}

function linkSource(link: NetworkLink): string {
  return typeof link.source === "string" ? link.source : String(link.source);
}

function linkTarget(link: NetworkLink): string {
  return typeof link.target === "string" ? link.target : String(link.target);
}
