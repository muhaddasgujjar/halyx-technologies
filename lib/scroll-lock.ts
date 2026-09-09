/**
 * Refcounted page scroll lock.
 *
 * Three things can cover the page — the mobile nav menu, the case modal and the
 * video modal — and on a phone any of them is full-bleed. Without a lock the
 * page scrolls behind the overlay under the finger, which on iOS also drags the
 * overlay itself around. A plain `overflow: hidden` on <body> is not enough on
 * its own because the two modals can be open at once (Escape closes both), so
 * whichever closed first would release the lock the other still needs. Hence
 * the count.
 *
 * The scrollbar's width is handed to CSS as `--hx-lock-pad` so removing the
 * scrollbar does not shift the whole layout sideways; on mobile, where the
 * scrollbar is an overlay, that value is 0 and nothing moves.
 */

let count = 0;

export function lockScroll(): void {
  count += 1;
  if (count > 1) return;

  const gap = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty("--hx-lock-pad", `${Math.max(0, gap)}px`);
  document.body.dataset.locked = "true";
}

export function unlockScroll(): void {
  count = Math.max(0, count - 1);
  if (count > 0) return;

  delete document.body.dataset.locked;
  document.documentElement.style.removeProperty("--hx-lock-pad");
}

/**
 * `useEffect`-friendly form: pass whether the caller currently wants the lock,
 * and the returned cleanup releases it. Safe against React's double-invoked
 * effects in development, since lock and unlock are always paired.
 */
export function applyScrollLock(active: boolean): () => void {
  if (!active) return () => {};
  lockScroll();
  return unlockScroll;
}
