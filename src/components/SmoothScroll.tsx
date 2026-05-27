"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Bridges Lenis' smooth scrolling with GSAP's ScrollTrigger so every
 * pinned section, scrub timeline, and parallax animation stays perfectly
 * in sync with the inertia-based scroll position.
 *
 * Mount once, near the root of the client tree.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Bail out early in reduced-motion contexts — native scroll is faster
    // and lets users opt out of the cinematic experience.
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      syncTouch: false,
    });

    // Lenis emits a "scroll" event every animation frame — feeding it
    // straight into ScrollTrigger is the cheapest way to keep them locked.
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      // GSAP's ticker hands us seconds; Lenis wants milliseconds.
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
