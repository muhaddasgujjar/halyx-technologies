"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { SITE_CONFIG } from "@/lib/config";
import { applyScrollLock } from "@/lib/scroll-lock";

/**
 * One store for the state that crosses section boundaries:
 *  - `svc` drives both the Services accordion and the shape the travelling
 *    particle cloud assembles into,
 *  - the case modal is opened from two different columns,
 *  - the scroll toast can hand off to the chat dock.
 * Everything else stays local to its own component.
 */

export interface BotState {
  open: boolean;
  min: boolean;
  max: boolean;
  dock: boolean;
}

interface SiteContextValue {
  /** Resolved motion switch: config flag AND not `prefers-reduced-motion`. */
  motion: boolean;
  particleDensity: number;

  /** Docks the particle cloud travels between. */
  heroDockRef: RefObject<HTMLDivElement | null>;
  svcDockRef: RefObject<HTMLDivElement | null>;
  /** The second assembler instance, on the closing CTA panel. */
  ctaCanvasRef: RefObject<HTMLCanvasElement | null>;
  rootRef: RefObject<HTMLDivElement | null>;

  svc: number;
  setSvc: (i: number) => void;
  pauseCarousel: () => void;
  resumeCarousel: () => void;

  caseIdx: number;
  openCase: (i: number) => void;
  closeCase: () => void;

  videoOpen: boolean;
  openVideo: () => void;
  closeVideo: () => void;

  bot: BotState;
  toggleBot: () => void;
  toggleBotMin: () => void;
  toggleBotMax: () => void;
  closeBot: () => void;
  openBotFromToast: () => void;

  toast: boolean;
  closeToast: () => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside <SiteProvider>");
  return ctx;
}

const SERVICE_COUNT = 5;
const CAROUSEL_MS = 4200;
/** The toast runs itself out after this long. */
const TOAST_MS = 9000;

export function SiteProvider({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroDockRef = useRef<HTMLDivElement | null>(null);
  const svcDockRef = useRef<HTMLDivElement | null>(null);
  const ctaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [motion, setMotion] = useState<boolean>(SITE_CONFIG.enableMotion);
  const [svc, setSvcState] = useState(0);
  const [caseIdx, setCaseIdx] = useState(-1);
  const [videoOpen, setVideoOpen] = useState(false);
  const [bot, setBot] = useState<BotState>({ open: false, min: false, max: false, dock: false });
  const [toast, setToast] = useState(false);

  const pausedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastFired = useRef(false);

  /* Reduced motion is a runtime override on top of the config flag. */
  useEffect(() => {
    if (!SITE_CONFIG.enableMotion) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setSvc = useCallback((i: number) => setSvcState(i), []);
  const pauseCarousel = useCallback(() => {
    pausedRef.current = true;
  }, []);
  const resumeCarousel = useCallback(() => {
    pausedRef.current = false;
  }, []);

  /*
   * The services row auto-advances until the visitor takes over by hovering.
   *
   * There is no hovering on a touchscreen, so the pause never fires there and the
   * carousel would move the selection out from under a visitor four seconds after
   * they tapped a card open. On a coarse pointer the tap is the only way to
   * choose, so it wins outright and the auto-advance never starts.
   */
  useEffect(() => {
    if (!motion) return;

    const coarse = window.matchMedia("(hover: none), (pointer: coarse)");
    let id: ReturnType<typeof setInterval> | null = null;

    const sync = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
      if (coarse.matches) return;
      id = setInterval(() => {
        if (pausedRef.current || document.hidden) return;
        setSvcState((s) => (s + 1) % SERVICE_COUNT);
      }, CAROUSEL_MS);
    };

    sync();
    coarse.addEventListener("change", sync);

    return () => {
      if (id) clearInterval(id);
      coarse.removeEventListener("change", sync);
    };
  }, [motion]);

  /*
   * The control that opened the current overlay.
   *
   * Both modals are `inert` while closed, and the browser's response to a
   * subtree becoming inert is to move focus out of it — to `<body>`. That is the
   * right thing for the modal and the wrong thing for the visitor, who is
   * dropped at the top of the document instead of on the row they opened. It is
   * captured in the handler rather than in an effect on purpose: child effects
   * run before the parent's, so by the time this component's effect ran the
   * modal would already have moved focus onto its own Close button.
   */
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const rememberFocus = () => {
    const el = document.activeElement;
    returnFocusRef.current = el instanceof HTMLElement ? el : null;
  };

  const openCase = useCallback((i: number) => {
    rememberFocus();
    setCaseIdx(i);
  }, []);
  const closeCase = useCallback(() => setCaseIdx(-1), []);
  const openVideo = useCallback(() => {
    rememberFocus();
    setVideoOpen(true);
  }, []);
  const closeVideo = useCallback(() => setVideoOpen(false), []);

  const toggleBot = useCallback(
    () => setBot((b) => ({ ...b, open: !b.open, min: false })),
    [],
  );
  const toggleBotMin = useCallback(() => setBot((b) => ({ ...b, min: !b.min })), []);
  const toggleBotMax = useCallback(
    () => setBot((b) => ({ ...b, max: !b.max, min: false })),
    [],
  );
  const closeBot = useCallback(() => setBot((b) => ({ ...b, open: false, min: false })), []);

  const closeToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(false);
  }, []);

  const openBotFromToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(false);
    setBot({ open: true, min: false, max: false, dock: true });
  }, []);

  /*
   * Scroll gates, independent of the particle loop:
   * the chat dock arrives as the Case Studies section comes into range, and
   * the toast fires exactly once past 20% of the page. Scoping the toast to
   * page progress keeps it from firing on portrait hover or chat open.
   */
  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const progress = clamp01(-rect.top / Math.max(1, rect.height - vh));

      const cs = root.querySelector<HTMLElement>("[data-casestudies]");
      const wantDock = cs ? cs.getBoundingClientRect().top < vh * 0.65 : progress >= 0.3;
      setBot((b) => (b.dock === wantDock ? b : { ...b, dock: wantDock }));

      if (progress >= 0.2 && !toastFired.current) {
        toastFired.current = true;
        setToast(true);
        toastTimer.current = setTimeout(() => setToast(false), TOAST_MS);
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        tick();
      });
    };

    tick();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const interval = setInterval(tick, 400);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearInterval(interval);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  /*
   * A full-bleed overlay on a phone must not let the page scroll behind it —
   * on iOS that also drags the overlay itself around under the finger.
   */
  const overlayOpen = caseIdx >= 0 || videoOpen;

  useEffect(() => applyScrollLock(overlayOpen), [overlayOpen]);

  /* Hand focus back to whatever opened the overlay once it closes. */
  const overlayWasOpen = useRef(false);
  useEffect(() => {
    if (overlayWasOpen.current && !overlayOpen) {
      const el = returnFocusRef.current;
      returnFocusRef.current = null;
      // The element can be gone if the page re-rendered underneath the modal.
      if (el && el.isConnected) el.focus({ preventScroll: true });
    }
    overlayWasOpen.current = overlayOpen;
  }, [overlayOpen]);

  /* Escape closes whichever overlay is open. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setVideoOpen(false);
      setCaseIdx(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<SiteContextValue>(
    () => ({
      motion,
      particleDensity: SITE_CONFIG.particleDensity,
      rootRef,
      heroDockRef,
      svcDockRef,
      ctaCanvasRef,
      svc,
      setSvc,
      pauseCarousel,
      resumeCarousel,
      caseIdx,
      openCase,
      closeCase,
      videoOpen,
      openVideo,
      closeVideo,
      bot,
      toggleBot,
      toggleBotMin,
      toggleBotMax,
      closeBot,
      openBotFromToast,
      toast,
      closeToast,
    }),
    [
      motion,
      svc,
      setSvc,
      pauseCarousel,
      resumeCarousel,
      caseIdx,
      openCase,
      closeCase,
      videoOpen,
      openVideo,
      closeVideo,
      bot,
      toggleBot,
      toggleBotMin,
      toggleBotMax,
      closeBot,
      openBotFromToast,
      toast,
      closeToast,
    ],
  );

  return (
    <SiteContext.Provider value={value}>
      <div ref={rootRef} className={motion ? undefined : "hx-no-motion"} style={{ position: "relative" }}>
        {children}
      </div>
    </SiteContext.Provider>
  );
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
