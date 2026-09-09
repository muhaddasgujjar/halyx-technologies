"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

export type RevealVariant =
  | "rise"
  | "slideL"
  | "slideR"
  | "scale"
  | "mask"
  | "blur"
  | "tilt"
  | "letter";

/**
 * One animation family per section, so adjacent sections never enter the same
 * way. `<RevealScope>` publishes the section's variant and every `<Reveal>`
 * inside inherits it.
 */
const VariantContext = createContext<RevealVariant>("rise");

export function RevealScope({
  variant,
  children,
}: {
  variant: RevealVariant;
  children: ReactNode;
}) {
  return <VariantContext.Provider value={variant}>{children}</VariantContext.Provider>;
}

/* --------------------------------------------------------------------------
   A single observer for the whole page, shared by every reveal target.
   Per-element observers do not scale to a page this long.
   -------------------------------------------------------------------------- */

interface Manager {
  io: IntersectionObserver;
  els: Set<HTMLElement>;
  detach: () => void;
}

let manager: Manager | null = null;
let refCount = 0;

function show(el: HTMLElement) {
  if (el.dataset.shown === "1") return;
  el.dataset.shown = "1";
  el.classList.add("hx-in");
  manager?.io.unobserve(el);
}

function hide(el: HTMLElement) {
  if (el.dataset.shown !== "1") return;
  el.dataset.shown = "0";
  el.classList.remove("hx-in", "hx-settled");
  manager?.io.observe(el);
}

/**
 * The observer alone misses elements that are already past the fold on load or
 * scrolled past in one flick, so a cheap rAF-throttled sweep backs it up and
 * also resets elements that have left the viewport entirely.
 */
function sweep() {
  if (!manager) return;
  const vh = window.innerHeight || 800;
  for (const el of manager.els) {
    const r = el.getBoundingClientRect();
    if (el.dataset.shown === "1") {
      if (r.top > vh * 1.05 || r.bottom < -vh * 0.35) hide(el);
    } else if (r.top < vh * 0.9 && r.bottom > -vh * 0.12) {
      show(el);
    }
  }
}

function ensureManager(): Manager {
  if (manager) return manager;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement);
    },
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
  );

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      sweep();
    });
  };

  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll);
  const timer = setInterval(sweep, 300);

  manager = {
    io,
    els: new Set(),
    detach() {
      io.disconnect();
      clearInterval(timer);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    },
  };

  return manager;
}

/** Drops the compositor hint once an element has finished settling. */
function onSettled(e: TransitionEvent) {
  const el = e.currentTarget as HTMLElement;
  if (e.propertyName === "transform" && el.dataset.shown === "1") {
    el.classList.add("hx-settled");
  }
}

export interface RevealProps {
  children: ReactNode;
  /** Staggers siblings. Typical steps: 60 / 80 / 120 / 140 / 160 / 220 / 320 / 400. */
  delay?: number;
  /** Overrides the section family — only the footer wordmark needs this. */
  variant?: RevealVariant;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  id?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Mirrored onto the element as `data-open`, for open/closed styling. */
  dataOpen?: boolean;
}

export function Reveal({
  children,
  delay = 0,
  variant,
  as: Tag = "div",
  className,
  style,
  id,
  onMouseEnter,
  onMouseLeave,
  dataOpen,
}: RevealProps) {
  const inherited = useContext(VariantContext);
  const v = variant ?? inherited;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const m = ensureManager();
    refCount += 1;
    m.els.add(el);
    m.io.observe(el);
    el.addEventListener("transitionend", onSettled);

    // Elements already in view on mount should not wait for a scroll event.
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    if (r.top < vh * 0.9 && r.bottom > -vh * 0.12) show(el);

    return () => {
      el.removeEventListener("transitionend", onSettled);
      m.els.delete(el);
      m.io.unobserve(el);
      refCount -= 1;
      if (refCount <= 0) {
        m.detach();
        manager = null;
      }
    };
  }, []);

  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-open={dataOpen === undefined ? undefined : dataOpen}
      data-reveal=""
      data-variant={v}
      style={{ ...style, "--hx-rdelay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
