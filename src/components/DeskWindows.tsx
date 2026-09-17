"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export const DESK_WINDOW_LIMIT = 8;

export type DeskWindowOpen = {
  id: string;
  title: string;
  meta?: string;
  href?: string;
  content: ReactNode;
  width?: number;
  height?: number;
};

type DeskWindowRecord = DeskWindowOpen & {
  z: number;
  seed: number;
};

type DeskWindowsApi = {
  windows: DeskWindowRecord[];
  activeId: string | null;
  limitMessage: string;
  open: (spec: DeskWindowOpen) => boolean;
  close: (id: string) => void;
  focus: (id: string) => void;
};

const DeskWindowsContext = createContext<DeskWindowsApi | null>(null);

const MIN_WIDTH = 360;
const MIN_HEIGHT = 280;
const DEFAULT_WIDTH = 512;
const DEFAULT_HEIGHT = 576;
const EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type Edge = (typeof EDGES)[number];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useDeskWindows(): DeskWindowsApi {
  const value = useContext(DeskWindowsContext);
  if (!value) throw new Error("useDeskWindows requires DeskWindowsProvider");
  return value;
}

export function useDeskWindowsOptional(): DeskWindowsApi | null {
  return useContext(DeskWindowsContext);
}

export function DeskWindowsProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<DeskWindowRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState("");
  const zRef = useRef(0);
  const seedRef = useRef(0);

  const focus = useCallback((id: string) => {
    zRef.current += 1;
    setActiveId(id);
    setWindows((current) => current.map((item) => (item.id === id ? { ...item, z: zRef.current } : item)));
  }, []);

  const close = useCallback((id: string) => {
    setWindows((current) => current.filter((item) => item.id !== id));
    setActiveId((current) => (current === id ? null : current));
    setLimitMessage("");
  }, []);

  const open = useCallback((spec: DeskWindowOpen) => {
    const slot: { result: "created" | "focused" | "limit" } = { result: "created" };
    setWindows((current) => {
      const existing = current.find((item) => item.id === spec.id);
      if (existing) {
        slot.result = "focused";
        zRef.current += 1;
        return current.map((item) =>
          item.id === spec.id
            ? { ...item, z: zRef.current, title: spec.title, meta: spec.meta, href: spec.href, content: spec.content }
            : item,
        );
      }
      if (current.length >= DESK_WINDOW_LIMIT) {
        slot.result = "limit";
        return current;
      }
      slot.result = "created";
      zRef.current += 1;
      seedRef.current += 1;
      return [
        ...current,
        {
          ...spec,
          z: zRef.current,
          seed: seedRef.current,
        },
      ];
    });
    if (slot.result === "limit") {
      setLimitMessage("8 windows open.");
      return false;
    }
    setActiveId(spec.id);
    setLimitMessage("");
    return true;
  }, []);

  const value = useMemo(
    () => ({ windows, activeId, limitMessage, open, close, focus }),
    [windows, activeId, limitMessage, open, close, focus],
  );

  return (
    <DeskWindowsContext.Provider value={value}>
      {children}
      <DeskWindowLayer />
    </DeskWindowsContext.Provider>
  );
}

function DeskWindowLayer() {
  const { windows, activeId, limitMessage, close, focus } = useDeskWindows();
  if (windows.length === 0 && !limitMessage) return null;

  return (
    <div className="desk-window-layer">
      <p className="sr-only" aria-live="polite">
        {limitMessage || (activeId ? `${windows.length} of ${DESK_WINDOW_LIMIT} windows` : "")}
      </p>
      {windows.map((item) => (
        <DeskWindowFrame
          key={item.id}
          record={item}
          active={item.id === activeId}
          onClose={() => close(item.id)}
          onFocus={() => focus(item.id)}
        />
      ))}
    </div>
  );
}

function DeskWindowFrame({
  record,
  active,
  onClose,
  onFocus,
}: {
  record: DeskWindowRecord;
  active: boolean;
  onClose: () => void;
  onFocus: () => void;
}) {
  const frameRef = useRef<HTMLElement>(null);
  const [rect, setRect] = useState(() => placeWindow(record.seed, record.width, record.height));

  useEffect(() => {
    frameRef.current?.focus();
  }, []);

  function applyRect(next: { x: number; y: number; width: number; height: number }) {
    setRect(next);
    const node = frameRef.current;
    if (!node) return;
    node.style.left = `${next.x}px`;
    node.style.top = `${next.y}px`;
    node.style.width = `${next.width}px`;
    node.style.height = `${next.height}px`;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>, edge: Edge | "move") {
    if (event.button !== 0) return;
    if (edge === "move" && event.target instanceof HTMLElement && event.target.closest("a, button")) return;
    event.preventDefault();
    onFocus();
    const drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.x,
      originY: rect.y,
      originW: rect.width,
      originH: rect.height,
      edge,
    };
    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== drag.pointerId) return;
      applyRect(nextRect(drag, moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY));
    }
    function onUp(upEvent: PointerEvent) {
      if (upEvent.pointerId !== drag.pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <article
      ref={frameRef}
      id={`desk-window-${record.id}`}
      className="g-terminal desk-window"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`desk-window-${record.id}-title`}
      data-active={active ? "true" : undefined}
      tabIndex={-1}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        zIndex: record.z,
      }}
      onPointerDown={() => onFocus()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header
        className="desk-window__titlebar dossier-window__titlebar"
        onPointerDown={(event) => onPointerDown(event, "move")}
      >
        <span className="dossier-window__led" data-active={active ? "true" : undefined} aria-hidden="true" />
        <span className="dossier-window__kicker">Record</span>
        <span id={`desk-window-${record.id}-title`} className="dossier-window__title">
          {record.title}
        </span>
        {record.meta ? <span className="dossier-window__id">{record.meta}</span> : null}
        <span className="dossier-window__actions">
          {record.href ? (
            <Link href={record.href} className="dossier-window__action">
              Page
            </Link>
          ) : null}
          <button type="button" className="dossier-window__action" onClick={onClose}>
            Close
          </button>
        </span>
      </header>

      <div className="desk-window__body dossier-window__body">{record.content}</div>

      {EDGES.map((edge) => (
        <span
          key={edge}
          className="desk-window__handle"
          data-edge={edge}
          aria-hidden={edge === "se" ? undefined : true}
          aria-label={edge === "se" ? "Resize window" : undefined}
          onPointerDown={(event) => onPointerDown(event, edge)}
        />
      ))}
    </article>
  );
}

function placeWindow(seed: number, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
  if (typeof window === "undefined") {
    return { x: 72, y: 72, width, height };
  }
  const view = viewport();
  const slot = (seed - 1) % DESK_WINDOW_LIMIT;
  const nextWidth = clamp(width, MIN_WIDTH, Math.max(MIN_WIDTH, view.width - 16));
  const nextHeight = clamp(height, MIN_HEIGHT, Math.max(MIN_HEIGHT, view.height - 16));
  const cascade = slot * 32;
  const preferRight = nextWidth >= 640;
  const x = preferRight
    ? clamp(view.width - nextWidth - 32 - cascade, 16, Math.max(16, view.width - nextWidth - 16))
    : clamp(72 + cascade, 16, Math.max(16, view.width - nextWidth - 16));
  const y = clamp(96 + cascade, 72, Math.max(72, view.height - nextHeight - 16));
  return { x, y, width: nextWidth, height: nextHeight };
}

function nextRect(
  drag: {
    originX: number;
    originY: number;
    originW: number;
    originH: number;
    edge: Edge | "move";
  },
  dx: number,
  dy: number,
) {
  const view = viewport();
  const maxW = Math.max(MIN_WIDTH, view.width - 16);
  const maxH = Math.max(MIN_HEIGHT, view.height - 16);
  let x = drag.originX;
  let y = drag.originY;
  let width = drag.originW;
  let height = drag.originH;

  if (drag.edge === "move") {
    x = drag.originX + dx;
    y = drag.originY + dy;
  } else {
    if (drag.edge.includes("e")) width = drag.originW + dx;
    if (drag.edge.includes("s")) height = drag.originH + dy;
    if (drag.edge.includes("w")) {
      width = drag.originW - dx;
      x = drag.originX + dx;
    }
    if (drag.edge.includes("n")) {
      height = drag.originH - dy;
      y = drag.originY + dy;
    }
  }

  width = clamp(width, MIN_WIDTH, maxW);
  height = clamp(height, MIN_HEIGHT, maxH);
  if (drag.edge !== "move") {
    if (drag.edge.includes("w")) x = drag.originX + (drag.originW - width);
    if (drag.edge.includes("n")) y = drag.originY + (drag.originH - height);
  }
  x = clamp(x, 8 - width + 96, view.width - 96);
  y = clamp(y, 8, view.height - 40);
  return { x, y, width, height };
}
