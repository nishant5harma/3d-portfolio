"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FloatingCard, { type FloatingCardData } from "./FloatingCard";
import { useMousePosition } from "@/hooks/useMousePosition";

const ShowcaseBackdrop = dynamic(() => import("./ShowcaseBackdrop"), {
  ssr: false,
  loading: () => null,
});

/**
 * Pre-computed bar heights for the floating panel's "wave" decoration.
 * Computed at module evaluation (once, identically on server and client)
 * and rounded to fixed precision so SSR-rendered HTML matches the client
 * snapshot exactly — avoids the hydration mismatch you get when the
 * server and client stringify floating-point values differently.
 */
const PANEL_WAVE_HEIGHTS: number[] = Array.from({ length: 40 }, (_, i) =>
  Number((20 + Math.abs(Math.sin(i * 0.6)) * 70).toFixed(2)),
);

const CARDS: FloatingCardData[] = [
  {
    index: "01",
    category: "AI Product · 2026",
    title: "Sentient Search",
    description:
      "An agentic, neural search platform that reasons across 40+ data sources in real-time.",
    client: "Helix AI",
    year: "2026",
    accent: "linear-gradient(135deg, #22d3ee, #6366f1)",
    preview:
      "radial-gradient(140% 100% at 0% 0%, rgba(34, 211, 238, 0.45), transparent 60%), radial-gradient(140% 100% at 100% 100%, rgba(99, 102, 241, 0.45), transparent 60%), #050b1a",
  },
  {
    index: "02",
    category: "Brand System",
    title: "Aurora OS",
    description:
      "A fluid identity and a holographic design system built for a post-screen interface era.",
    client: "Aurora Studios",
    year: "2026",
    accent: "linear-gradient(135deg, #f472b6, #818cf8)",
    preview:
      "radial-gradient(120% 80% at 20% 30%, rgba(244, 114, 182, 0.5), transparent 60%), radial-gradient(120% 80% at 80% 70%, rgba(129, 140, 248, 0.5), transparent 65%), #0a0613",
  },
  {
    index: "03",
    category: "WebGL Experience",
    title: "Cortex Atlas",
    description:
      "A real-time 3D atlas that maps your company's intelligence — every signal, decision, person.",
    client: "Cortex Labs",
    year: "2025",
    accent: "linear-gradient(135deg, #34d399, #22d3ee)",
    preview:
      "radial-gradient(120% 80% at 60% 0%, rgba(52, 211, 153, 0.45), transparent 65%), radial-gradient(120% 80% at 40% 100%, rgba(34, 211, 238, 0.45), transparent 65%), #04110d",
  },
  {
    index: "04",
    category: "Spatial UI",
    title: "Helio Cabin",
    description:
      "An ambient cabin OS for next-gen electric vehicles — voice, vision, and motion in one canvas.",
    client: "Helio Motors",
    year: "2026",
    accent: "linear-gradient(135deg, #facc15, #fb7185)",
    preview:
      "radial-gradient(120% 90% at 0% 100%, rgba(250, 204, 21, 0.4), transparent 60%), radial-gradient(120% 90% at 100% 0%, rgba(251, 113, 133, 0.4), transparent 60%), #1a0a06",
  },
  {
    index: "05",
    category: "Agent Platform",
    title: "ARIA Engine",
    description:
      "Our own agentic engine — used to ship 60+ shipping AI products for partners across 9 markets.",
    client: "ICB Internal",
    year: "Always-on",
    accent: "linear-gradient(135deg, #38bdf8, #a855f7)",
    preview:
      "radial-gradient(120% 80% at 80% 20%, rgba(56, 189, 248, 0.5), transparent 60%), radial-gradient(120% 80% at 20% 80%, rgba(168, 85, 247, 0.45), transparent 60%), #0a0612",
  },
  {
    index: "06",
    category: "Immersive Film",
    title: "Neon Capital",
    description:
      "A scroll-driven sci-fi film for a hedge fund — 60 second narrative, 60 days to ship, 60 awards.",
    client: "Neon Capital",
    year: "2025",
    accent: "linear-gradient(135deg, #f87171, #c084fc)",
    preview:
      "radial-gradient(120% 80% at 50% 0%, rgba(248, 113, 113, 0.45), transparent 60%), radial-gradient(120% 80% at 50% 100%, rgba(192, 132, 252, 0.45), transparent 60%), #170614",
  },
];

/**
 * Showcase — surfaces the studio's recent work in a holographic gallery.
 * Cards rise into view, the section's heading scrubs in with GSAP, and a
 * lightweight WebGL backdrop adds floating particles + a moving grid.
 */
export default function ShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const mouseRef = useMousePosition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Gentle scrub-in for the heading block so it tracks scroll instead
      // of triggering once — feels more "cinematic" than a one-shot reveal.
      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { y: 90, opacity: 0, filter: "blur(10px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            ease: "power3.out",
            scrollTrigger: {
              trigger: headingRef.current,
              start: "top 85%",
              end: "top 40%",
              scrub: 0.6,
            },
          },
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="showcase" className="show-section">
      {/* WebGL backdrop — particles, grid, holographic glow */}
      <div className="show-backdrop" aria-hidden="true">
        <ShowcaseBackdrop mouseRef={mouseRef} />
      </div>
      <div className="show-vignette" aria-hidden="true" />

      <div className="show-inner">
        <div ref={headingRef} className="show-header">
          <motion.span
            className="show-eyebrow"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="show-eyebrow-dot" />
            CHAPTER 02 — SELECTED WORK
          </motion.span>

          <h2 className="show-title">
            <span>Cinematic interfaces</span>
            <span className="show-title-em">for sentient brands.</span>
          </h2>
          <p className="show-sub">
            Each project ships with bespoke 3D, real-time intelligence, and
            an unfair amount of taste. Scroll through a few we&rsquo;re proud
            of.
          </p>
        </div>

        <div className="show-grid">
          {CARDS.map((card, i) => (
            <FloatingCard key={card.index} card={card} index={i} />
          ))}
        </div>

        {/* Floating holographic UI panel — tilts with mouse, decorative */}
        <motion.div
          className="show-panel"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="show-panel-head">
            <span className="show-panel-dot" />
            <span>ARIA · STUDIO OVERVIEW</span>
            <span className="show-panel-version">v 26.04</span>
          </div>
          <div className="show-panel-body">
            <div className="show-panel-col">
              <div className="show-panel-label">Active projects</div>
              <div className="show-panel-value">14</div>
              <div className="show-panel-meta">+3 this week</div>
            </div>
            <div className="show-panel-col">
              <div className="show-panel-label">Models in production</div>
              <div className="show-panel-value">62</div>
              <div className="show-panel-meta">98.4% uptime</div>
            </div>
            <div className="show-panel-col">
              <div className="show-panel-label">Awards · 2025-2026</div>
              <div className="show-panel-value">38</div>
              <div className="show-panel-meta">
                FWA, Awwwards, CSSDA, OneShow
              </div>
            </div>
          </div>
          <div className="show-panel-wave" aria-hidden="true">
            {PANEL_WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                style={{
                  height: `${h}%`,
                  animationDelay: `${(i * 0.04).toFixed(2)}s`,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
