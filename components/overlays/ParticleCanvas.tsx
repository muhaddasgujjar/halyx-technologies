"use client";

import { useEffect, useRef } from "react";
import { useSite } from "@/components/SiteProvider";
import { SHAPES } from "@/lib/services";
import { clamp01, initAssembler, initCloud, type Assembler, type Cloud } from "@/lib/particles";

/**
 * The page's only requestAnimationFrame loop.
 *
 * It drives both particle instances: the backdrop cloud that travels from the
 * hero dock down to the services dock — reforming from a sphere into the active
 * service's glyph on the way — and the assembler behind the closing CTA.
 *
 * The canvas is absolutely positioned at the top of the page and translated by
 * the scroll offset each frame, which pins it to the viewport without paying
 * for a `position: fixed` layer that the browser has to composite separately.
 */
export function ParticleCanvas() {
  const { motion, particleDensity, rootRef, heroDockRef, svcDockRef, ctaCanvasRef, svc } =
    useSite();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Read inside the loop without restarting it every time the row changes.
  const svcRef = useRef(svc);
  svcRef.current = svc;

  useEffect(() => {
    if (!motion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1500 points is the design default; small viewports get proportionally
    // fewer so the fill cost stays flat.
    const base = Math.max(300, Math.min(3500, particleDensity));
    const viewportScale = Math.min(1, (window.innerWidth || 1280) / 1280);
    const n = Math.max(300, Math.round(base * Math.max(0.45, viewportScale)));

    const cloud: Cloud | null = initCloud(canvas, n, "sphere");
    let assembler: Assembler | null = null;
    const ctaCanvas = ctaCanvasRef.current;
    if (ctaCanvas) assembler = initAssembler(ctaCanvas, Math.round(n * 0.9));

    if (!cloud) return;

    const onResize = () => {
      cloud.resize();
      assembler?.resize();
    };
    const onMove = (e: PointerEvent) => {
      cloud.px = e.clientX;
      cloud.py = e.clientY;
      cloud.seen = true;
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("pointermove", onMove, true);

    let raf = 0;
    let last = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);

      const root = rootRef.current;
      const hero = heroDockRef.current;
      const dock = svcDockRef.current;
      if (!root || !hero || !dock) return;

      const now = performance.now();
      const dt = Math.min(48, now - (last || now));
      last = now;

      // Nothing is visible on a background tab; skip the whole frame.
      if (document.hidden) return;

      const rr = root.getBoundingClientRect();
      const scrollTop = -rr.top;
      const vh = window.innerHeight || 800;

      canvas.style.transform = `translate3d(0,${scrollTop}px,0)`;
      if (
        Math.abs(cloud.h - canvas.clientHeight) > 2 ||
        Math.abs(cloud.w - canvas.clientWidth) > 2
      ) {
        cloud.resize();
      }

      const hr = hero.getBoundingClientRect();
      const sr = dock.getBoundingClientRect();
      const hx = hr.left + hr.width / 2;
      const hy = hr.top + hr.height / 2 + scrollTop;
      const sx = sr.left + sr.width / 2;
      const sy = sr.top + sr.height / 2 + scrollTop;

      const D = Math.max(1, sy - hy);
      const p = clamp01(scrollTop / (D * 0.72));
      const e = p * p * (3 - 2 * p); // smoothstep

      const docX = hx + (sx - hx) * e;
      const docY = hy + (sy - hy) * e;
      const Rh = Math.min(hr.width, hr.height) * 0.42;
      const Rs = Math.min(sr.width, sr.height) * 0.46;
      const R = Rh + (Rs - Rh) * e;

      // Past the halfway point of the travel, the sphere becomes the glyph for
      // whichever service row is active.
      const want = e > 0.45 ? SHAPES[svcRef.current] : "sphere";
      if (want !== cloud.kind) cloud.setShape(want);

      cloud.draw(dt, docX, docY - scrollTop, R, e);

      if (assembler && ctaCanvas) {
        if (
          Math.abs(assembler.w - ctaCanvas.clientWidth) > 2 ||
          Math.abs(assembler.h - ctaCanvas.clientHeight) > 2
        ) {
          assembler.resize();
        }
        const ar = ctaCanvas.getBoundingClientRect();
        assembler.draw(ar.top < vh * 0.85 && ar.bottom > vh * 0.15);
      }
    };

    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointermove", onMove, true);
    };
  }, [motion, particleDensity, rootRef, heroDockRef, svcDockRef, ctaCanvasRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100vh",
        pointerEvents: "none",
      }}
    />
  );
}
