"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Globe, Lock } from "lucide-react";

interface LiveSiteShowcaseProps {
  /** Fully-qualified URL to embed inside the laptop frame. */
  url?: string;
  /** Short host (e.g. "alwaysdry.com") shown in the browser chrome. */
  host?: string;
  /** Section eyebrow label. */
  eyebrow?: string;
  /** Section title (supports a highlighted span via {em}). */
  title?: string;
  /** Section sub-copy under the title. */
  description?: string;
  /** Width the embedded site renders at before being scaled to fit. */
  renderWidth?: number;
  /** Height the embedded site renders at before being scaled to fit. */
  renderHeight?: number;
}

const DEFAULT_URL = "https://www.alwaysdry.com/";
const DEFAULT_HOST = "alwaysdry.com";

export default function LiveSiteShowcase({
  url = DEFAULT_URL,
  host = DEFAULT_HOST,
  eyebrow = "CHAPTER 03 — LIVE IN PRODUCTION",
  title = "A real site, rendered live.",
  description = "No screenshots, no mockups — that’s the actual production website running inside the laptop below. Click the address bar to open it in a new tab.",
  renderWidth = 1440,
  renderHeight = 900,
}: LiveSiteShowcaseProps = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Keep the rendered viewport (renderWidth × renderHeight) perfectly
  // scaled to whatever real width the laptop screen ends up at. A single
  // ResizeObserver beats listening to window resize because the laptop
  // also reflows when its parent grid changes.
  const recomputeScale = useCallback(() => {
    const node = screenRef.current;
    if (!node) return;
    const w = node.clientWidth;
    if (w > 0) setScale(w / renderWidth);
  }, [renderWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    recomputeScale();
    const node = screenRef.current;
    if (!node) return;
    const ro = new ResizeObserver(() => recomputeScale());
    ro.observe(node);
    return () => ro.disconnect();
  }, [recomputeScale]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.18 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  // Subtle mouse-driven 3D tilt on the laptop. Disabled when the user
  // prefers reduced motion or on coarse-pointer devices (touch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    if (mql.matches || coarse.matches) return;

    const node = sectionRef.current;
    if (!node) return;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMove = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Normalised -1..1, then dampened.
      targetX = ((e.clientX - cx) / rect.width) * 2;
      targetY = ((e.clientY - cy) / rect.height) * 2;
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      node.style.setProperty("--lss-rx", (currentY * -3).toFixed(3));
      node.style.setProperty("--lss-ry", (currentX * 4).toFixed(3));
      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`lss-section ${inView ? "is-in-view" : ""}`}
      aria-labelledby="lss-heading"
    >
      <div className="lss-bg" aria-hidden="true">
        <span className="lss-bg-glow lss-bg-glow-1" />
        <span className="lss-bg-glow lss-bg-glow-2" />
        <span className="lss-bg-grid" />
      </div>

      <div className="lss-inner">
        <header className="lss-header">
          <span className="lss-eyebrow">
            <span className="lss-eyebrow-dot" />
            {eyebrow}
          </span>
          <h2 id="lss-heading" className="lss-title">
            {title}
          </h2>
          <p className="lss-sub">{description}</p>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="lss-visit"
          >
            <Globe size={14} />
            <span>Visit live site</span>
            <ArrowUpRight size={14} className="lss-visit-arrow" />
          </a>
        </header>

        {/* ============================== LAPTOP ============================ */}
        <div className="lss-stage">
          <div className="lss-laptop">
            {/* ----- Lid + screen ----- */}
            <div className="lss-lid">
              <div className="lss-bezel">
                <span className="lss-notch" aria-hidden="true">
                  <span className="lss-notch-cam" />
                </span>

                {/* Browser-style chrome above the iframe */}
                <div className="lss-chrome" aria-hidden="true">
                  <span className="lss-traffic lss-traffic-r" />
                  <span className="lss-traffic lss-traffic-y" />
                  <span className="lss-traffic lss-traffic-g" />
                  <div className="lss-urlbar">
                    <Lock size={11} className="lss-urlbar-lock" />
                    <span className="lss-urlbar-host">{host}</span>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lss-chrome-open"
                    aria-label="Open live site in new tab"
                  >
                    <ArrowUpRight size={13} />
                  </a>
                </div>

                {/* Actual screen — iframe is rendered at desktop size and
                    scaled to fit, so the site sees a real desktop viewport
                    rather than a cramped mobile one. */}
                <div className="lss-screen" ref={screenRef}>
                  {!loaded && (
                    <div className="lss-screen-loader" aria-hidden="true">
                      <span className="lss-screen-loader-bar" />
                      <span className="lss-screen-loader-label">
                        Loading {host}…
                      </span>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src={url}
                    title={`${host} — live preview`}
                    className={`lss-iframe ${loaded ? "is-loaded" : ""}`}
                    style={{
                      width: `${renderWidth}px`,
                      height: `${renderHeight}px`,
                      transform: `scale(${scale})`,
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    onLoad={() => setLoaded(true)}
                  />
                </div>

                {/* Subtle screen glare swept across the glass */}
                <span className="lss-glare" aria-hidden="true" />
              </div>
            </div>

            {/* ----- Hinge + base ----- */}
            <div className="lss-hinge" aria-hidden="true" />
            <div className="lss-base" aria-hidden="true">
              <span className="lss-base-cutout" />
            </div>

            {/* ----- Ground shadow ----- */}
            <span className="lss-shadow" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
