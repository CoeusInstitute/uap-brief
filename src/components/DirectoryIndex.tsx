"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import DecoderText from "@/components/DecoderText";
import { useDeskWindowsOptional } from "@/components/DeskWindows";
import { DetailItem, DetailList } from "@/components/DetailList";
import type { FactItem } from "@/components/FactSheet";
import { personWindowSpec } from "@/components/PersonDeskRecord";

export type DirectoryFilter = {
  id: string;
  label: string;
};

export type DirectoryRow = {
  href: string;
  key: string;
  searchText: string;
  filters: string[];
  id: string;
  title: string;
  summary: string;
  group?: string;
  mark?: string;
  facts: FactItem[];
};

const ROW_HEIGHT = 40;
const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

export function letterOf(title: string): string {
  const match = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : "#";
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return text;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="directory-index__hit">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  );
}

function groupOf(row: DirectoryRow, rail: "letter" | "year"): string {
  if (rail === "year") return row.group || "undated";
  return letterOf(row.title);
}

function railOrder(keys: string[], rail: "letter" | "year"): string[] {
  if (rail === "letter") return LETTERS.filter((item) => keys.includes(item));
  return keys.slice().sort((a, b) => {
    if (a === "undated") return 1;
    if (b === "undated") return -1;
    return b.localeCompare(a);
  });
}

function DirectoryRecord({
  row,
  headingId,
  animate = false,
}: {
  row: DirectoryRow;
  headingId?: string;
  animate?: boolean;
}) {
  return (
    <>
      <div className="directory-index__dossier-head">
        {row.mark ? <span className="g-badge">{row.mark}</span> : null}
        <h2 id={headingId} className="directory-index__dossier-name">
          {animate ? <DecoderText key={row.key} text={row.title} duration={280} /> : row.title}
        </h2>
        <p className="g-caption">{row.summary}</p>
        <p className="g-mono g-terminal__dim">{row.id}</p>
      </div>
      <DetailList>
        {row.facts
          .filter((fact) => fact.label.toLowerCase() !== "id")
          .map((fact) => (
            <DetailItem key={fact.label} label={fact.label} value={fact.value} />
          ))}
      </DetailList>
    </>
  );
}

export default function DirectoryIndex({
  noun,
  rows,
  filters = [],
  placeholder,
  emptyLabel,
  starterFilter,
  starterLabel,
  notice,
  rail = "letter",
  windowKind = "dossier",
}: {
  noun: string;
  rows: DirectoryRow[];
  filters?: DirectoryFilter[];
  placeholder: string;
  emptyLabel: string;
  starterFilter?: string;
  starterLabel?: string;
  notice?: string;
  rail?: "letter" | "year";
  windowKind?: "dossier" | "person";
}) {
  const router = useRouter();
  const desk = useDeskWindowsOptional();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);

  const needle = query.trim().toLowerCase();
  const hasQuery = needle.length > 0;
  const hasGroup = group !== "";
  const hasFacet = activeFilters.length > 0;
  const starterAvailable = Boolean(
    starterFilter && rows.some((row) => row.filters.includes(starterFilter)),
  );
  const implicitStarter = starterAvailable && !hasQuery && !hasGroup && !hasFacet;

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (hasQuery && !row.searchText.includes(needle)) return false;
      if (hasGroup && groupOf(row, rail) !== group) return false;
      if (hasFacet && !activeFilters.some((id) => row.filters.includes(id))) return false;
      if (implicitStarter && starterFilter && !row.filters.includes(starterFilter)) return false;
      return true;
    });
  }, [rows, hasQuery, needle, hasGroup, group, rail, hasFacet, activeFilters, implicitStarter, starterFilter]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (hasQuery && !row.searchText.includes(needle)) continue;
      if (hasFacet && !activeFilters.some((id) => row.filters.includes(id))) continue;
      const key = groupOf(row, rail);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [rows, hasQuery, needle, hasFacet, activeFilters, rail]);

  const visibleGroups = railOrder([...groupCounts.keys()], rail);

  useEffect(() => {
    setCursor(0);
  }, [query, group, activeFilters]);

  const selected = filtered[cursor] ?? null;

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    if (filtered.length === 0) return;
    virtualizer.scrollToIndex(cursor, { align: "auto" });
  }, [cursor, filtered.length, virtualizer]);

  function reset() {
    setQuery("");
    setGroup("");
    setActiveFilters([]);
  }

  function toggleFilter(id: string) {
    setActiveFilters((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleGroup(next: string) {
    setGroup((current) => (current === next ? "" : next));
  }

  function move(delta: number) {
    if (filtered.length === 0) return;
    setCursor((current) => Math.max(0, Math.min(filtered.length - 1, current + delta)));
  }

  function openRow(row: DirectoryRow | null) {
    if (!row) return;
    if (desk) {
      if (windowKind === "person") {
        desk.open(personWindowSpec(row.id, row.title));
        return;
      }
      desk.open({
        id: `dir-${row.key}`,
        title: row.title,
        meta: row.id,
        href: row.href,
        content: <DirectoryRecord row={row} />,
      });
      return;
    }
    router.push(row.href);
  }

  function onStationKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const inField = event.target instanceof HTMLInputElement;

    if (event.key === "/" && !inField) {
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      reset();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setCursor(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setCursor(Math.max(0, filtered.length - 1));
      return;
    }
    if (event.key === "ArrowDown" || (!inField && event.key === "j")) {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === "ArrowUp" || (!inField && event.key === "k")) {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === "Enter") {
      if (event.target instanceof HTMLAnchorElement) return;
      event.preventDefault();
      openRow(selected);
      return;
    }
    if (rail === "letter" && !inField && /^[a-z]$/i.test(event.key)) {
      const next = event.key.toUpperCase();
      if ((groupCounts.get(next) ?? 0) > 0) {
        event.preventDefault();
        toggleGroup(next);
      }
    }
  }

  const railNoun = rail === "year" ? "decade" : "letter";
  const status = hasQuery
    ? `${filtered.length} matches`
    : hasGroup
      ? `${group} · ${filtered.length}`
      : hasFacet
        ? `${filtered.length} in view`
        : `${starterLabel ?? "Index"} · ${filtered.length}`;

  return (
    <div
      className="g-terminal directory-index"
      tabIndex={0}
      onKeyDown={onStationKeyDown}
      aria-label={`${noun} index`}
    >
      <header className="g-terminal__toolbar">
        <span className="g-terminal__command">{noun}</span>
        <span className="g-terminal__dim">
          {status}
          {filtered.length !== rows.length ? ` · ${rows.length} listed` : ""}
        </span>
      </header>

      <div className="directory-index__prompt">
        <span className="g-terminal__prompt" aria-hidden="true">
          ❯
        </span>
        <label className="sr-only" htmlFor={`${listId}-find`}>
          Find {noun}
        </label>
        <input
          id={`${listId}-find`}
          ref={inputRef}
          className="directory-index__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button type="button" className="g-terminal__dim directory-index__clear" onClick={() => setQuery("")}>
            clear
          </button>
        ) : (
          <span className="g-terminal__dim directory-index__hint">/ find</span>
        )}
      </div>

      {rail === "year" || filters.length > 0 ? (
        <div className="directory-index__scopes">
          {rail === "year" ? (
            <div className="g-segmented" role="group" aria-label="Decades">
              {visibleGroups.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="g-button"
                  data-size="sm"
                  aria-pressed={group === item}
                  onClick={() => toggleGroup(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
          {filters.length > 0 ? (
            <div className="g-segmented" role="group" aria-label="Scopes">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className="g-button"
                  data-size="sm"
                  aria-pressed={activeFilters.includes(filter.id)}
                  onClick={() => toggleFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="directory-index__workstation">
        <div className="directory-index__stream">
          <p className="directory-index__scope-line g-terminal__dim">
            {implicitStarter
              ? `${starterLabel ?? "Starter set"}. Type to search all ${rows.length}.`
              : hasQuery
                ? `Results for “${query.trim()}”.`
                : hasGroup
                  ? rail === "year"
                    ? `Records in the ${group}.`
                    : `Names beginning with ${group}.`
                  : "Scoped set."}
            {desk?.limitMessage ? ` ${desk.limitMessage}` : ""}
          </p>
          <div
            className="directory-index__list"
            ref={listRef}
            role="listbox"
            aria-label={noun}
            aria-activedescendant={selected ? `${listId}-${selected.key}` : undefined}
          >
            {filtered.length === 0 ? (
              <div className="directory-index__empty">
                <p className="g-terminal__dim">{emptyLabel}</p>
                <p className="g-caption">Esc clears the find line.</p>
              </div>
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((item) => {
                  const row = filtered[item.index];
                  const active = item.index === cursor;
                  return (
                    <button
                      key={row.key}
                      id={`${listId}-${row.key}`}
                      type="button"
                      className="g-option directory-index__row"
                      role="option"
                      aria-selected={active}
                      data-highlighted={active ? "true" : undefined}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: item.size,
                        transform: `translateY(${item.start}px)`,
                      }}
                      onClick={() => {
                        setCursor(item.index);
                        openRow(row);
                      }}
                    >
                      <span className="directory-index__caret" aria-hidden="true">
                        {active ? "›" : ""}
                      </span>
                      <span className="directory-index__name">
                        <Highlight text={row.title} query={query} />
                      </span>
                      {active ? <span className="directory-index__sid">{row.id}</span> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <section className="directory-index__dossier" aria-labelledby={`${listId}-dossier-title`}>
          {selected ? (
            <div className="directory-index__dossier-body">
              <DirectoryRecord
                row={selected}
                headingId={`${listId}-dossier-title`}
                animate
              />
              <div className="directory-index__dossier-action">
                {desk && windowKind === "person" ? (
                  <button type="button" className="g-button g-button--primary" onClick={() => openRow(selected)}>
                    Full record
                  </button>
                ) : (
                  <Link href={selected.href} className="g-button g-button--primary">
                    Full record
                  </Link>
                )}
                {notice ? <p className="g-meta">{notice}</p> : null}
              </div>
            </div>
          ) : (
            <div className="directory-index__dossier-empty">
              <p className="g-terminal__dim">
                {rail === "year" ? `Type a name or pick a ${railNoun}.` : "Type a name."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
