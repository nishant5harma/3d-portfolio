"use client";

import { useEffect } from "react";
import {
  isTouchDevice,
  prefersReducedMotion,
} from "@/lib/device";

/**
 * Bridges Lenis' smooth scrolling with GSAP's ScrollTrigger on the
 * desktop. On touch devices we intentionally do NOT run Lenis: native
 * iOS/Android momentum scroll is hardware-accelerated and feels far
 * smoother than any JS rAF loop driving `transform: translate3d` on
 * the body. Lenis fighting iOS overscroll is the #1 source of mobile
 * "lag" on this site.
 *
 * Touch devices still get a synchronised ScrollTrigger via the standard
 * `scroll` event — that's enough for pinned sections to feel tight
 * because the native scroller is already 120Hz on most phones.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (prefersReducedMotion()) return;

    let cleanup: (() => void) | null = null;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      gsap.registerPlugin(ScrollTrigger);

      // ---- Touch path: native scroll + cheap rAF-throttled ST update ----
      if (isTouchDevice()) {
        // Let ScrollTrigger drive ticks from native scroll. ST already
        // does this when it's added to the page; the explicit `refresh`
        // ensures pinned starts are recomputed for the actual viewport.
        ScrollTrigger.refresh();

        // Recalculate on orientation/keyboard show so iOS Safari's
        // collapsing toolbar doesn't desync pinned sections.
        const onResize = () => ScrollTrigger.refresh();
        window.addEventListener("orientationchange", onResize, {
          passive: true,
        });
        cleanup = () => {
          window.removeEventListener("orientationchange", onResize);
        };
        return;
      }

      // ---- Desktop path: Lenis driven by GSAP ticker ----
      const { default: Lenis } = await import("lenis");

      const lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        // We never reach this branch on touch, but keep sane defaults.
        touchMultiplier: 1.4,
        syncTouch: false,
      });

      lenis.on("scroll", ScrollTrigger.update);

      const tick = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    })();

    return () => {
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}
