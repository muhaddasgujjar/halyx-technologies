"use client";

import { useEffect, useRef } from "react";
import { geoInterpolate, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeoPermissibleObjects } from "d3-geo";
import { HUBS, ROUTES } from "@/lib/hubs";
import { useSite } from "./SiteProvider";

/**
 * The Our Story map: landmass rasterised into a dot grid, animated traffic arcs
 * between delivery hubs, and a story card on marker hover.
 *
 * The dot grid is derived once per resize by drawing the countries to an
 * offscreen canvas and sampling its alpha channel on a 7px lattice — far
 * cheaper per frame than path-testing every dot.
 *
 * The loop is gated on visibility, so an off-screen map costs nothing.
 */

const STEP = 7;
const ATLAS_URL = "/media/countries-110m.json";

interface TopoLike {
  objects: { countries: unknown };
}

export function DottedMap() {
  const { motion } = useSite();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let land: GeoPermissibleObjects | null = null;
    let projection: ReturnType<typeof geoNaturalEarth1> | null = null;
    let dots: number[] = [];
    let W = 0;
    let H = 0;
    let DPR = 1;
    let cancelled = false;
    let raf = 0;
    let visible = false;

    // Pointer position in canvas-local space.
    let mx = -9999;
    let my = -9999;
    let hov = 0;
    let hovT = 0;

    /*
     * A touchscreen has no pointer to follow, so on a coarse pointer the map is
     * driven by taps instead of by movement: a tap picks the nearest marker, and
     * a tap on empty ocean clears the card again. Tracking `pointermove` there as
     * well would light the map up every time a finger dragged across it mid-scroll.
     */
    const coarse =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none), (pointer: coarse)").matches;

    /* Fingers are less precise than a cursor, so the markers get a bigger target. */
    const HIT = coarse ? 34 : 26;

    const aim = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      hovT = mx >= 0 && my >= 0 && mx <= r.width && my <= r.height ? 1 : 0;
    };

    const onMove = (e: PointerEvent) => aim(e);

    const onTap = (e: PointerEvent) => {
      aim(e);
      // With motion off there is no loop running to pick the change up.
      if (!motion) frame(Date.now() - t0);
    };

    const onLeave = () => {
      hovT = 0;
      mx = -9999;
      my = -9999;
    };

    const cv = canvas;

    function build() {
      if (!land || !ctx) return;
      const w = Math.max(1, cv.clientWidth);
      const h = Math.max(1, cv.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = w * dpr;
      cv.height = h * dpr;

      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      if (!octx) return;

      const p = geoNaturalEarth1().fitSize([w, h], land);
      projection = p;
      W = w;
      H = h;
      DPR = dpr;

      const path = geoPath(p, octx);
      octx.fillStyle = "#fff";
      octx.beginPath();
      path(land);
      octx.fill();

      const data = octx.getImageData(0, 0, w, h).data;
      dots = [];
      for (let y = STEP / 2; y < h; y += STEP) {
        for (let x = STEP / 2; x < w; x += STEP) {
          const i = ((y | 0) * w + (x | 0)) * 4 + 3;
          if (data[i] > 120) dots.push(x, y);
        }
      }
    }

    function frame(now: number) {
      if (!dots.length || !projection || !ctx) return;
      const proj = projection;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const t = now * 0.001;
      let active = -1;
      hov += (hovT - hov) * 0.08;
      const RAD = Math.min(W, H) * 0.34;
      const RAD2 = RAD * RAD;

      if (hov > 0.01) {
        const gl = ctx.createRadialGradient(mx, my, 0, mx, my, RAD);
        gl.addColorStop(0, `rgba(150,136,255,${(0.22 * hov).toFixed(3)})`);
        gl.addColorStop(1, "rgba(107,92,240,0)");
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.arc(mx, my, RAD, 0, 6.2832);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < dots.length; k += 2) {
        let x = dots[k];
        let y = dots[k + 1];
        const wave = 0.5 + 0.5 * Math.sin(t * 0.8 - (x + y) * 0.012);
        let a = 0.3 + wave * 0.45;
        let rr = 1.1 + wave * 0.35;

        // Dots lean away from the cursor, brighter and larger as they go.
        if (hov > 0.01) {
          const dx = x - mx;
          const dy = y - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < RAD2) {
            const d = Math.sqrt(d2) || 1;
            const fq = (1 - d / RAD) * hov;
            x += (dx / d) * fq * fq * RAD * 0.3;
            y += (dy / d) * fq * fq * RAD * 0.3;
            a = Math.min(1, a + fq * 0.75);
            rr += fq * 1.5;
          }
        }

        ctx.fillStyle = `rgba(${Math.round(132 + wave * 54)},${Math.round(
          120 + wave * 48,
        )},255,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, 6.2832);
        ctx.fill();
      }

      for (let r = 0; r < ROUTES.length; r++) {
        const a0 = HUBS[ROUTES[r][0]].c;
        const b0 = HUBS[ROUTES[r][1]].c;
        const interp = geoInterpolate(a0, b0);
        const phase = (t * 0.22 + r * 0.17) % 1;
        const trail = 0.32;

        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(150,136,255,0.16)";
        ctx.beginPath();
        for (let s = 0; s <= 40; s++) {
          const pt = proj(interp(s / 40));
          if (!pt) continue;
          if (s === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        }
        ctx.stroke();

        // The bright travelling segment.
        ctx.beginPath();
        let started = false;
        for (let s2 = 0; s2 <= 24; s2++) {
          const f2 = phase - trail + (trail * s2) / 24;
          if (f2 < 0 || f2 > 1) continue;
          const p2 = proj(interp(f2));
          if (!p2) continue;
          if (!started) {
            ctx.moveTo(p2[0], p2[1]);
            started = true;
          } else {
            ctx.lineTo(p2[0], p2[1]);
          }
        }
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "rgba(196,186,255,0.75)";
        ctx.stroke();

        const head = proj(interp(Math.min(1, phase)));
        if (head) {
          ctx.fillStyle = "rgba(232,228,255,0.95)";
          ctx.beginPath();
          ctx.arc(head[0], head[1], 2.2, 0, 6.2832);
          ctx.fill();
        }
      }

      for (let hh = 0; hh < HUBS.length; hh++) {
        const hp = proj(HUBS[hh].c);
        if (!hp) continue;
        let near = false;
        if (mx > -999) {
          const ddx = hp[0] - mx;
          const ddy = hp[1] - my;
          near = ddx * ddx + ddy * ddy < HIT * HIT;
        }
        if (near) active = hh;

        const pl = (t * 0.7 + hh * 0.31) % 1;
        ctx.strokeStyle = `rgba(170,158,255,${((near ? 0.85 : 0.5) * (1 - pl)).toFixed(3)})`;
        ctx.lineWidth = near ? 1.8 : 1;
        ctx.beginPath();
        ctx.arc(hp[0], hp[1], 2 + pl * (near ? 26 : 13), 0, 6.2832);
        ctx.stroke();

        if (near) {
          const gh = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 46);
          gh.addColorStop(0, "rgba(170,158,255,0.5)");
          gh.addColorStop(1, "rgba(107,92,240,0)");
          ctx.fillStyle = gh;
          ctx.beginPath();
          ctx.arc(hp[0], hp[1], 46, 0, 6.2832);
          ctx.fill();
        }

        ctx.fillStyle = near ? "#ffffff" : "rgba(238,235,255,0.95)";
        ctx.beginPath();
        ctx.arc(hp[0], hp[1], near ? 3.4 : 2.1, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      if (active >= 0) {
        const hb = HUBS[active];
        const hpp = proj(hb.c);
        if (!hpp) return;

        const bw = Math.min(250, W - 24);
        const pad = 13;

        ctx.font = '500 11px "Instrument Sans", Helvetica, sans-serif';
        const words = hb.t.split(" ");
        const lines: string[] = [];
        let cur = "";
        for (const word of words) {
          const test = cur ? `${cur} ${word}` : word;
          if (ctx.measureText(test).width > bw - pad * 2) {
            lines.push(cur);
            cur = word;
          } else {
            cur = test;
          }
        }
        if (cur) lines.push(cur);

        const bh = pad * 2 + 18 + lines.length * 15;
        const bx = Math.max(8, Math.min(W - bw - 8, hpp[0] - bw / 2));
        // Flip the card above the marker in the lower half of the map.
        let by = hpp[1] > H / 2 ? hpp[1] - bh - 18 : hpp[1] + 18;
        by = Math.max(8, Math.min(H - bh - 8, by));

        ctx.fillStyle = "rgba(14,13,24,0.94)";
        ctx.strokeStyle = "rgba(188,178,255,0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#bcb2ff";
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillText(hb.year.toUpperCase(), bx + pad, by + pad + 9);

        ctx.fillStyle = "#e2e2ea";
        ctx.font = '500 11px "Instrument Sans", Helvetica, sans-serif';
        for (let li = 0; li < lines.length; li++) {
          ctx.fillText(lines[li], bx + pad, by + pad + 28 + li * 15);
        }
      }
    }

    const t0 = Date.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      frame(Date.now() - t0);
    };

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        frame(Date.now() - t0);
      }, 120);
    };

    // Only run while the panel is on screen.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    fetch(ATLAS_URL)
      .then((r) => r.json())
      .then((topo: TopoLike) => {
        if (cancelled) return;
        land = feature(
          topo as never,
          topo.objects.countries as never,
        ) as unknown as GeoPermissibleObjects;
        build();
        frame(0);
        if (motion) loop();
      })
      .catch(() => {
        /* The map is decorative; a failed atlas fetch leaves an empty panel. */
      });

    window.addEventListener("resize", onResize);
    // `orientationchange` on iOS reports the new size a beat after the event, and
    // the resize handler is already debounced, so this just re-triggers it.
    window.addEventListener("orientationchange", onResize);
    if (!coarse) window.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onTap);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (resizeTimer) clearTimeout(resizeTimer);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onTap);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [motion]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Map of Halyx delivery hubs. Hover a marker to read that year's story."
      role="img"
      style={{ display: "block", width: "100%", height: "100%", background: "#08080d" }}
    />
  );
}
