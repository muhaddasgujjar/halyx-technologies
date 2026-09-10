import styles from "./Console.module.css";

/**
 * The android face at the top of the console.
 *
 * Drawn rather than photographed, for three reasons. It carries no licence — a
 * stock render of a robot on a studio's own shop window is somebody else's
 * copyright waiting to be noticed. It is built from the site's accent tokens, so
 * it cannot drift out of theme. And, unlike a bitmap, its eyes and throat can be
 * driven by the agent's state: they brighten while listening and pulse while
 * speaking, which is what makes the console feel alive rather than decorated.
 *
 * To swap in real artwork later, drop a portrait at
 * `/public/media/halyx-ai-portrait.png` and render an `<img>` in place of this
 * component — the slat overlay and parallax wrapper in `Console.tsx` sit above
 * it and do not care what is underneath.
 */
export function AndroidPortrait({ state }: { state: "idle" | "listening" | "thinking" | "speaking" }) {
  return (
    <svg
      className={styles.android}
      data-state={state}
      viewBox="0 0 300 380"
      role="img"
      aria-label="Stylised android face representing the Halyx AI agent"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id="hxSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9e7f6" />
          <stop offset="42%" stopColor="#a9a5c4" />
          <stop offset="100%" stopColor="#3c3a52" />
        </linearGradient>
        <linearGradient id="hxPlate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cfcbe6" />
          <stop offset="100%" stopColor="#615d80" />
        </linearGradient>
        <radialGradient id="hxEye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#bcb2ff" />
          <stop offset="100%" stopColor="#5647d6" />
        </radialGradient>
        <filter id="hxGlow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Neck and shoulder mass, so the head is not floating. */}
      <path d="M112 300 L112 268 Q150 292 188 268 L188 300 Q188 318 214 330 L226 380 L74 380 L86 330 Q112 318 112 300 Z" fill="url(#hxSkin)" opacity="0.85" />
      <path className={styles.androidThroat} d="M126 314 Q150 328 174 314 L174 340 Q150 352 126 340 Z" fill="url(#hxEye)" />

      {/* Cranium. */}
      <path d="M150 34 Q214 34 224 108 Q230 158 218 204 Q206 258 150 286 Q94 258 82 204 Q70 158 76 108 Q86 34 150 34 Z" fill="url(#hxSkin)" />

      {/* Skull-plate seams — the panel lines that read as machine, not mask. */}
      <path d="M150 34 L150 286" stroke="rgba(20,18,34,0.45)" strokeWidth="1.2" fill="none" />
      <path d="M92 96 Q150 78 208 96" stroke="rgba(20,18,34,0.4)" strokeWidth="1.2" fill="none" />
      <path d="M84 150 Q150 138 216 150" stroke="rgba(20,18,34,0.3)" strokeWidth="1" fill="none" />
      <path d="M104 232 Q150 246 196 232" stroke="rgba(20,18,34,0.35)" strokeWidth="1" fill="none" />

      {/* Temple plates. */}
      <path d="M76 120 Q62 140 66 176 Q70 204 84 214 L84 120 Z" fill="url(#hxPlate)" />
      <path d="M224 120 Q238 140 234 176 Q230 204 216 214 L216 120 Z" fill="url(#hxPlate)" />

      {/* Brow ridge. */}
      <path d="M96 148 Q150 136 204 148" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" />

      {/* Eyes — the part the state drives. */}
      <g className={styles.androidEyes} filter="url(#hxGlow)">
        <ellipse cx="117" cy="168" rx="16" ry="9" fill="url(#hxEye)" />
        <ellipse cx="183" cy="168" rx="16" ry="9" fill="url(#hxEye)" />
      </g>
      <ellipse cx="117" cy="168" rx="4" ry="4" fill="#ffffff" opacity="0.9" />
      <ellipse cx="183" cy="168" rx="4" ry="4" fill="#ffffff" opacity="0.9" />

      {/* Nose bridge and mouth vent. */}
      <path d="M150 180 L150 212 Q142 218 150 222" stroke="rgba(20,18,34,0.4)" strokeWidth="1.4" fill="none" />
      <g className={styles.androidVent}>
        <rect x="126" y="238" width="48" height="2.4" rx="1.2" fill="rgba(188,178,255,0.85)" />
        <rect x="132" y="245" width="36" height="2.4" rx="1.2" fill="rgba(188,178,255,0.6)" />
        <rect x="138" y="252" width="24" height="2.4" rx="1.2" fill="rgba(188,178,255,0.4)" />
      </g>

      {/* Jaw hinge dots. */}
      <circle cx="90" cy="216" r="3.4" fill="rgba(188,178,255,0.8)" />
      <circle cx="210" cy="216" r="3.4" fill="rgba(188,178,255,0.8)" />
    </svg>
  );
}
