/**
 * Centralised, SSR-safe device & connection capability detection.
 *
 * Keep this cheap — every helper is sync, reads no network APIs, and
 * caches results so it can be called from render paths without
 * re-querying the DOM.
 *
 * Used by SmoothScroll, lazy-section loaders, and individual heavy
 * components to skip expensive work on mobile / reduced-motion /
 * Save-Data / slow connections.
 */

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
    effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  };
  deviceMemory?: number;
};

const cache = {
  isTouch: undefined as boolean | undefined,
  isMobile: undefined as boolean | undefined,
  reducedMotion: undefined as boolean | undefined,
  saveData: undefined as boolean | undefined,
  lowEnd: undefined as boolean | undefined,
};

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Returns true on any touch-primary device (phones, most tablets). */
export function isTouchDevice(): boolean {
  if (!isBrowser()) return false;
  if (cache.isTouch !== undefined) return cache.isTouch;
  cache.isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  return cache.isTouch;
}

/** Mobile viewport — width-based, cached per page load. */
export function isMobileViewport(): boolean {
  if (!isBrowser()) return false;
  if (cache.isMobile !== undefined) return cache.isMobile;
  cache.isMobile = window.matchMedia("(max-width: 768px)").matches;
  return cache.isMobile;
}

export function prefersReducedMotion(): boolean {
  if (!isBrowser()) return false;
  if (cache.reducedMotion !== undefined) return cache.reducedMotion;
  cache.reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  return cache.reducedMotion;
}

/** User has Data Saver on — skip video/large assets. */
export function isSaveData(): boolean {
  if (!isBrowser()) return false;
  if (cache.saveData !== undefined) return cache.saveData;
  const conn = (navigator as NavigatorWithConnection).connection;
  cache.saveData = Boolean(conn?.saveData);
  return cache.saveData;
}

/**
 * Heuristic for "low-end device" — true when:
 *   - Save-Data is on, OR
 *   - effectiveType is 2g/slow-2g, OR
 *   - deviceMemory <= 2 GB, OR
 *   - hardwareConcurrency <= 2 cores
 * Use to gate heavy WebGL/particle effects.
 */
export function isLowEndDevice(): boolean {
  if (!isBrowser()) return false;
  if (cache.lowEnd !== undefined) return cache.lowEnd;
  const nav = navigator as NavigatorWithConnection;
  const conn = nav.connection;
  const slowNet =
    conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g";
  const lowMem = (nav.deviceMemory ?? 8) <= 2;
  const lowCpu = (navigator.hardwareConcurrency ?? 8) <= 2;
  cache.lowEnd = Boolean(conn?.saveData) || slowNet || lowMem || lowCpu;
  return cache.lowEnd;
}

/** Heavy-effects (WebGL, big blurs) should run? */
export function shouldRunHeavyEffects(): boolean {
  return (
    isBrowser() &&
    !prefersReducedMotion() &&
    !isLowEndDevice() &&
    !isMobileViewport()
  );
}
