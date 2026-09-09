import { ACCENT } from "./config";
import type { ShapeKind } from "./services";

/**
 * The page's point cloud. Two instances exist: one travelling backdrop cloud
 * that assembles into service glyphs as you scroll, and one assembler on the
 * closing CTA that pulls a scatter into the wordmark.
 *
 * Both are plain factories driven by a single shared rAF loop — never one loop
 * per instance.
 */

export function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

type Ctx2D = CanvasRenderingContext2D;

/* --------------------------------------------------------------------------
   Glyphs. No icon library — every mark is drawn from canvas paths, then
   rasterised and sampled into points.
   -------------------------------------------------------------------------- */

const GLYPHS: Record<ShapeKind, (x: Ctx2D, S: number) => void> = {
  code(x, S) {
    x.strokeStyle = "#fff";
    x.lineWidth = S * 0.075;
    x.lineCap = "round";
    x.lineJoin = "round";
    x.beginPath();
    x.moveTo(S * 0.34, S * 0.3);
    x.lineTo(S * 0.16, S * 0.5);
    x.lineTo(S * 0.34, S * 0.7);
    x.stroke();
    x.beginPath();
    x.moveTo(S * 0.66, S * 0.3);
    x.lineTo(S * 0.84, S * 0.5);
    x.lineTo(S * 0.66, S * 0.7);
    x.stroke();
    x.beginPath();
    x.moveTo(S * 0.56, S * 0.24);
    x.lineTo(S * 0.44, S * 0.76);
    x.stroke();
  },

  chip(x, S) {
    x.strokeStyle = "#fff";
    x.lineWidth = S * 0.05;
    x.strokeRect(S * 0.28, S * 0.28, S * 0.44, S * 0.44);
    x.strokeRect(S * 0.42, S * 0.42, S * 0.16, S * 0.16);
    for (let i = 0; i < 4; i++) {
      const o = S * (0.36 + i * 0.095);
      x.beginPath(); x.moveTo(o, S * 0.28); x.lineTo(o, S * 0.16); x.stroke();
      x.beginPath(); x.moveTo(o, S * 0.72); x.lineTo(o, S * 0.84); x.stroke();
      x.beginPath(); x.moveTo(S * 0.28, o); x.lineTo(S * 0.16, o); x.stroke();
      x.beginPath(); x.moveTo(S * 0.72, o); x.lineTo(S * 0.84, o); x.stroke();
    }
  },

  network(x, S) {
    const nodes: [number, number][] = [
      [0.5, 0.16], [0.2, 0.38], [0.8, 0.38], [0.32, 0.74], [0.68, 0.74], [0.5, 0.5],
    ];
    const links: [number, number][] = [
      [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [1, 3], [2, 4], [0, 1], [0, 2],
    ];
    x.strokeStyle = "#fff";
    x.lineWidth = S * 0.022;
    for (const [a, b] of links) {
      x.beginPath();
      x.moveTo(nodes[a][0] * S, nodes[a][1] * S);
      x.lineTo(nodes[b][0] * S, nodes[b][1] * S);
      x.stroke();
    }
    x.fillStyle = "#fff";
    nodes.forEach((nd, i) => {
      x.beginPath();
      x.arc(nd[0] * S, nd[1] * S, S * (i === 5 ? 0.075 : 0.055), 0, 6.2832);
      x.fill();
    });
  },

  cloud(x, S) {
    x.fillStyle = "#fff";
    for (const [cx, cy, r] of [
      [0.36, 0.54, 0.15],
      [0.52, 0.46, 0.19],
      [0.68, 0.56, 0.14],
    ]) {
      x.beginPath();
      x.arc(cx * S, cy * S, r * S, 0, 6.2832);
      x.fill();
    }
    x.fillRect(S * 0.36, S * 0.54, S * 0.32, S * 0.16);
    x.strokeStyle = "#fff";
    x.lineWidth = S * 0.035;
    x.lineCap = "round";
    for (const px of [0.42, 0.52, 0.62]) {
      x.beginPath();
      x.moveTo(px * S, S * 0.74);
      x.lineTo(px * S - S * 0.03, S * 0.86);
      x.stroke();
    }
  },

  database(x, S) {
    x.strokeStyle = "#fff";
    x.lineWidth = S * 0.045;
    for (let i = 0; i < 3; i++) {
      const y = S * (0.34 + i * 0.16);
      x.beginPath();
      x.ellipse(S * 0.5, y, S * 0.24, S * 0.075, 0, 0, 6.2832);
      x.stroke();
    }
    x.beginPath(); x.moveTo(S * 0.26, S * 0.34); x.lineTo(S * 0.26, S * 0.66); x.stroke();
    x.beginPath(); x.moveTo(S * 0.74, S * 0.34); x.lineTo(S * 0.74, S * 0.66); x.stroke();
  },
};

function glyphPoints(kind: ShapeKind, n: number): Float32Array {
  const S = 150;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const out = new Float32Array(n * 3);
  if (!x) return out;

  GLYPHS[kind](x, S);
  const d = x.getImageData(0, 0, S, S).data;

  const src: number[] = [];
  for (let y = 0; y < S; y++) {
    for (let px = 0; px < S; px++) {
      if (d[(y * S + px) * 4 + 3] > 110) src.push(px, y);
    }
  }

  const count = src.length / 2;
  if (!count) return out;

  for (let i = 0; i < n; i++) {
    const k = ((Math.random() * count) | 0) * 2;
    out[i * 3] = (src[k] / S - 0.5) * 2.15 + rnd(-0.012, 0.012);
    out[i * 3 + 1] = (src[k + 1] / S - 0.5) * 2.15 + rnd(-0.012, 0.012);
    out[i * 3 + 2] = rnd(-0.14, 0.14);
  }
  return out;
}

export type CloudShape = ShapeKind | "sphere" | "cube" | "octa" | "torus" | "helix";

export function makeShape(kind: CloudShape, n: number): Float32Array {
  if (kind in GLYPHS) return glyphPoints(kind as ShapeKind, n);

  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;

    if (kind === "sphere") {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u) * rnd(0.92, 1.0);
      x = r * Math.cos(t);
      y = u * rnd(0.92, 1.0);
      z = r * Math.sin(t);
    } else if (kind === "cube") {
      const fc = i % 6;
      const a = rnd(-1, 1);
      const b = rnd(-1, 1);
      if (fc === 0) { x = a; y = b; z = 1; }
      else if (fc === 1) { x = a; y = b; z = -1; }
      else if (fc === 2) { x = 1; y = a; z = b; }
      else if (fc === 3) { x = -1; y = a; z = b; }
      else if (fc === 4) { x = a; y = 1; z = b; }
      else { x = a; y = -1; z = b; }
      x *= 0.78; y *= 0.78; z *= 0.78;
    } else if (kind === "octa") {
      let a = -Math.log(1 - Math.random());
      let b = -Math.log(1 - Math.random());
      let c = -Math.log(1 - Math.random());
      const s = a + b + c;
      a /= s; b /= s; c /= s;
      x = a * (Math.random() < 0.5 ? 1 : -1) * 1.25;
      y = b * (Math.random() < 0.5 ? 1 : -1) * 1.25;
      z = c * (Math.random() < 0.5 ? 1 : -1) * 1.25;
    } else if (kind === "torus") {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const R = 0.78;
      const r = 0.3;
      x = (R + r * Math.cos(v)) * Math.cos(u);
      y = r * Math.sin(v);
      z = (R + r * Math.cos(v)) * Math.sin(u);
    } else {
      const t = (i / n) * Math.PI * 8;
      x = Math.cos(t) * 0.62 + rnd(-0.05, 0.05);
      y = (i / n) * 2 - 1 + rnd(-0.02, 0.02);
      z = Math.sin(t) * 0.62 + rnd(-0.05, 0.05);
    }

    p[i * 3] = x;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = z;
  }
  return p;
}

/* --------------------------------------------------------------------------
   The travelling cloud.
   -------------------------------------------------------------------------- */

export interface Cloud {
  kind: CloudShape;
  w: number;
  h: number;
  /** Pointer position in viewport space; the cloud repels around it. */
  px: number;
  py: number;
  seen: boolean;
  resize(): void;
  setShape(k: CloudShape): void;
  draw(dt: number, cx: number, cy: number, R: number, glow: number): void;
}

export function initCloud(canvas: HTMLCanvasElement, n: number, kind: CloudShape): Cloud | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cloud = {
    n,
    kind,
    cur: makeShape(kind, n).slice(),
    target: makeShape(kind, n),
    rot: 0,
    w: 0,
    h: 0,
    dpr: 1,
    px: -9999,
    py: -9999,
    seen: false,
    hover: false,
    mvx: 0,
    tiltY: 0,
    tTilt: 0,
    lastPx: -9999,

    resize() {
      const r = canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      canvas.width = this.w * this.dpr;
      canvas.height = this.h * this.dpr;
    },

    setShape(k: CloudShape) {
      this.kind = k;
      this.target = makeShape(k, this.n);
    },

    draw(dt: number, cx: number, cy: number, R: number, glow: number) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      // Nothing to draw once the cloud has travelled off-canvas.
      if (cx < -R * 2 || cy < -R * 2.2 || cy > this.h + R * 2.2) return;

      const dxm = this.px - cx;
      const dym = this.py - cy;
      this.hover = this.seen && dxm * dxm + dym * dym < R * 1.45 * (R * 1.45);
      this.tTilt = this.hover ? clamp01((this.py - cy) / (R * 2) + 0.5) * -0.9 + 0.45 : 0;
      if (this.hover) this.mvx += (this.px - this.lastPx) * 0.012;
      this.lastPx = this.px;
      this.tiltY += (this.tTilt - this.tiltY) * 0.07;
      this.rot += dt * (this.hover ? 0.00058 : 0.00022) + this.mvx * 0.0004;
      this.mvx *= 0.9;

      if (glow > 0.01) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.1);
        g.addColorStop(0, `rgba(150,136,255,${(0.3 * glow).toFixed(3)})`);
        g.addColorStop(0.45, `rgba(122,108,240,${(0.12 * glow).toFixed(3)})`);
        g.addColorStop(1, "rgba(107,92,240,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 2.1, 0, 6.2832);
        ctx.fill();
      }

      const cyr = Math.cos(this.rot);
      const syr = Math.sin(this.rot);
      const tilt = -0.34 + this.tiltY;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const cur = this.cur;
      const tgt = this.target;
      const rad = R * 0.62;
      const rad2 = rad * rad;

      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < this.n; i++) {
        const i3 = i * 3;
        // Ease each point toward its target so shape swaps morph rather than cut.
        cur[i3] += (tgt[i3] - cur[i3]) * 0.055;
        cur[i3 + 1] += (tgt[i3 + 1] - cur[i3 + 1]) * 0.055;
        cur[i3 + 2] += (tgt[i3 + 2] - cur[i3 + 2]) * 0.055;

        const x = cur[i3];
        const y = cur[i3 + 1];
        const z = cur[i3 + 2];
        const X = x * cyr + z * syr;
        let Z = z * cyr - x * syr;
        const Y = y * ct - Z * st;
        Z = y * st + Z * ct;

        const persp = 2.6 / (2.6 + Z);
        let sx = cx + X * R * persp;
        let sy = cy + Y * R * persp;
        const depth = (Z + 1) / 2;
        let alpha = 0.16 + (1 - depth) * 0.66;
        let size = (0.6 + (1 - depth) * 1.45) * persp;

        if (this.hover) {
          const dx = sx - this.px;
          const dy = sy - this.py;
          const d2 = dx * dx + dy * dy;
          if (d2 < rad2) {
            const d = Math.sqrt(d2) || 1;
            const fq = 1 - d / rad;
            sx += (dx / d) * fq * fq * rad * 0.45;
            sy += (dy / d) * fq * fq * rad * 0.45;
            alpha = Math.min(1, alpha + fq * 0.45);
            size += fq * 1.0;
          }
        }

        ctx.fillStyle = `rgba(${Math.round(ACCENT[0] - depth * 40)},${Math.round(
          ACCENT[1] - depth * 44,
        )},${ACCENT[2]},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    },
  };

  cloud.resize();
  return cloud;
}

/* --------------------------------------------------------------------------
   The closing-CTA assembler: a scatter that resolves into the wordmark as the
   panel scrolls into view, and falls apart again as it leaves.
   -------------------------------------------------------------------------- */

export interface Assembler {
  w: number;
  h: number;
  resize(): void;
  draw(active: boolean): void;
}

export function initAssembler(canvas: HTMLCanvasElement, n: number): Assembler | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const S = 300;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = Math.round(S * 0.42);
  const g = c.getContext("2d");

  const tgt = new Float32Array(n * 2);
  const scat = new Float32Array(n * 2);
  const cur = new Float32Array(n * 2);

  const src: number[] = [];
  if (g) {
    g.fillStyle = "#fff";
    g.font = `700 ${Math.round(S * 0.2)}px 'Instrument Sans', Helvetica, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("HALYX", S / 2, c.height * 0.4);
    g.font = `500 ${Math.round(S * 0.062)}px 'JetBrains Mono', monospace`;
    g.fillText("APPLIED  AI  SYSTEMS", S / 2, c.height * 0.74);

    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < S; x++) {
        if (d[(y * S + x) * 4 + 3] > 110) src.push(x / S - 0.5, y / c.height - 0.5);
      }
    }
  }

  const count = src.length / 2 || 1;
  for (let i = 0; i < n; i++) {
    const k = ((Math.random() * count) | 0) * 2;
    tgt[i * 2] = src[k] || 0;
    tgt[i * 2 + 1] = (src[k + 1] || 0) * 0.42;
    const a = Math.random() * Math.PI * 2;
    const r = 0.45 + Math.random() * 0.7;
    scat[i * 2] = Math.cos(a) * r;
    scat[i * 2 + 1] = Math.sin(a) * r * 0.6;
    cur[i * 2] = scat[i * 2];
    cur[i * 2 + 1] = scat[i * 2 + 1];
  }

  const ob = {
    n,
    w: 0,
    h: 0,
    dpr: 1,
    p: 0,

    resize() {
      const r = canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      canvas.width = this.w * this.dpr;
      canvas.height = this.h * this.dpr;
    },

    draw(active: boolean) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      this.p += ((active ? 1 : 0) - this.p) * 0.035;

      const cx = this.w / 2;
      const cy = this.h / 2;
      const sc = Math.min(this.w, this.h * 2.2) * 0.86;
      const e = this.p * this.p * (3 - 2 * this.p);

      if (e > 0.02) {
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, sc * 0.7);
        gr.addColorStop(0, `rgba(150,136,255,${(0.16 * e).toFixed(3)})`);
        gr.addColorStop(1, "rgba(107,92,240,0)");
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, this.w, this.h);
      }

      ctx.globalCompositeOperation = "lighter";
      const a = 0.2 + e * 0.65;
      ctx.fillStyle = `rgba(${ACCENT[0]},${ACCENT[1]},${ACCENT[2]},${a.toFixed(3)})`;
      const radius = 0.7 + e * 0.7;
      for (let i = 0; i < this.n; i++) {
        const i2 = i * 2;
        const tx = scat[i2] + (tgt[i2] - scat[i2]) * e;
        const ty = scat[i2 + 1] + (tgt[i2 + 1] - scat[i2 + 1]) * e;
        cur[i2] += (tx - cur[i2]) * 0.08;
        cur[i2 + 1] += (ty - cur[i2 + 1]) * 0.08;
        ctx.beginPath();
        ctx.arc(cx + cur[i2] * sc, cy + cur[i2 + 1] * sc, radius, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    },
  };

  ob.resize();
  return ob;
}
