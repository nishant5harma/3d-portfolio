import type { MutableRefObject } from "react";

/** Shared mutable-ref types used to bridge scroll/input state into
 *  animation loops (R3F useFrame / raf-driven CSS) without re-renders. */
export type ProgressRef = MutableRefObject<number>;
export type Vec2Ref = MutableRefObject<{ x: number; y: number }>;
