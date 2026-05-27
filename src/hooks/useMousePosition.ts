"use client";

import { useEffect, useRef } from "react";

/**
 * Tracks the cursor in normalised device coordinates (−1 → +1 across the
 * viewport, Y inverted to match GLSL/Three.js conventions). Exposing it as
 * a ref keeps re-renders out of the hot path — consumers read .current in
 * a useFrame loop or rAF tick.
 */
export function useMousePosition() {
  const ref = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      ref.current.x = (e.clientX / w) * 2 - 1;
      ref.current.y = -((e.clientY / h) * 2 - 1);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return ref;
}
