"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Mounts its children only when the placeholder enters (or is about to
 * enter) the viewport. This is the single biggest mobile-perf lever in
 * the app — heavy sections (Three.js, GSAP timelines, image canvases)
 * never boot until the user is actually scrolling toward them.
 *
 * Strategy:
 *   - Server-render an empty placeholder with a `minHeight` so layout
 *     is stable and ScrollTrigger doesn't get confused on refresh.
 *   - IntersectionObserver fires with a generous rootMargin so the
 *     section is fully mounted + animation-warm before it scrolls in.
 *   - Once mounted, the observer disconnects and never re-runs.
 *   - For browsers without IO (none we care about), we fall back to
 *     immediate mount.
 */
export default function LazySection({
  children,
  rootMargin = "600px 0px",
  minHeight = "100vh",
  id,
}: {
  children: ReactNode;
  /** How early to mount before scrolling in (default ~6 viewports). */
  rootMargin?: string;
  /** Reserve vertical space so layout doesn't jump when unmounted. */
  minHeight?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    if (typeof window === "undefined") return;

    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShow(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, show]);

  return (
    <div
      ref={ref}
      id={id}
      style={
        show
          ? undefined
          : {
              minHeight,
              // content-visibility lets the browser skip rendering
              // off-screen content entirely until intersection fires.
              contentVisibility: "auto",
              containIntrinsicSize: "1px 100vh",
            }
      }
    >
      {show ? children : null}
    </div>
  );
}
