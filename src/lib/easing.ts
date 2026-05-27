/**
 * Lightweight, dependency-free easing helpers used across the scroll-driven
 * cinematic timeline. Kept as pure functions so they can run inside R3F's
 * useFrame loop without allocating anything.
 */

export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Maps an input `p` from the range [a, b] to [0, 1], clamped at both ends. */
export function ramp(p: number, a: number, b: number) {
  if (p <= a) return 0;
  if (p >= b) return 1;
  return (p - a) / (b - a);
}

export const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/** Smoothstep — classic GLSL-style 3t² − 2t³ */
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
