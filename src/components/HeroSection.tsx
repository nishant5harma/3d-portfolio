"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ChevronDown, PlayCircle, Sparkles } from "lucide-react";
import { useMousePosition } from "@/hooks/useMousePosition";
import { clamp, ramp, smoothstep } from "@/lib/easing";
import { Timeline, TimelineText } from "@/components/ui/timeline";
import PixelBackground from "@/components/ui/pixel-background";

// CSS 3D MacBook — client-only because it reads scroll/cursor refs in a
// requestAnimationFrame loop.
const CssMacBook = dynamic(() => import("@/components/CssMacBook"), {
  ssr: false,
  loading: () => null,
});

const STATS: { n: string; l: string }[] = [
  { n: "150M+", l: "Lines of code shipped" },
  { n: "42", l: "Markets activated" },
  { n: "9.6/10", l: "Client NPS" },
];

const TRUST = ["Cortex Labs", "Helix AI", "Neon Capital", "Aurora Studios"];

/**
 * Hero — pinned for ~300vh of scroll, drives a cinematic camera move that
 * opens a 3D MacBook lid, dives into its screen, and hands off to the
 * showcase section through that screen.
 *
 * Scroll progress (0 → 1) is written into `progressRef` from the GSAP
 * ScrollTrigger callback so the R3F scene can read it inside useFrame
 * without re-rendering React.
 */
export default function HeroSection() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);

  // Shared with the laptop — written every ScrollTrigger update.
  const progressRef = useRef(0);
  const mouseRef = useMousePosition();

  const reduced = useReducedMotion();
  const [progressBarPct, setProgressBarPct] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduced) {
      progressRef.current = 0;
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const wrap = wrapRef.current;
    const pin = pinRef.current;
    const content = contentRef.current;
    const veil = veilRef.current;
    const scrollCue = scrollCueRef.current;
    if (!wrap || !pin) return;

    const ctx = gsap.context(() => {
      // Master pinning timeline. Total scrub length = 300vh of scroll.
      const st = ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: "+=300%",
        pin: pin,
        pinSpacing: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          setProgressBarPct(self.progress * 100);

          const p = self.progress;

          // ---- Content fade & subtle parallax ----
          if (content) {
            const fade = smoothstep(ramp(p, 0.18, 0.5));
            // Mobile uses CSS `translateX(-50%)` to center the column; we have
            // to preserve that horizontal anchor or the content jumps left.
            const isMobile = window.innerWidth < 1024;
            const dx = -fade * (isMobile ? 50 : 90);
            const dy = -fade * 40;
            content.style.opacity = String(1 - fade);
            content.style.transform = isMobile
              ? `translate(calc(-50% + ${dx.toFixed(1)}px), ${dy.toFixed(1)}px)`
              : `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
            content.style.filter = `blur(${fade * 6}px)`;
            content.style.pointerEvents = fade > 0.95 ? "none" : "auto";
          }

          if (scrollCue) {
            scrollCue.style.opacity = String(clamp(1 - p * 3));
          }

          // ---- Final cinematic white-out hands off to next section ----
          if (veil) {
            const v = smoothstep(ramp(p, 0.9, 1));
            veil.style.opacity = String(v);
          }
        },
      });

      return () => {
        st.kill();
      };
    }, wrap);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={wrapRef}
      className="hero-wrap"
      aria-labelledby="hero-heading"
    >
      <div ref={pinRef} className="hero-pin">
        {/* Animated pixel pattern fading down from the very top of the hero */}
        <div className="hero-pixel-strip" aria-hidden="true">
          <PixelBackground
            gap={6}
            speed={60}
            colors="#1a1a1a,#2a2a2a,#333333,#111111,#d4d4d4,#e5e5e5,#c4c4c4,#bababa"
            opacity={1}
            direction="top"
            className="absolute inset-0 w-full h-full"
          />
        </div>

        {/* Top navigation hairline + minimal logo */}
        <header className="hero-nav" aria-hidden="true">
          <div className="hero-nav-logo">
            <span className="hero-logo-dot" />
            <span>NEXUS / ICB</span>
          </div>
          <nav className="hero-nav-links">
            <a href="#showcase">Work</a>
            <a href="#why">Studio</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="hero-nav-meta">
            <span className="hero-meta-dot" />
            <span>v2.6 — Live</span>
          </div>
        </header>

        {/* CSS 3D MacBook — sits upper-right, lid opens + dives in on scroll */}
        <CssMacBook progressRef={progressRef} mouseRef={mouseRef} />

        {/* LEFT: content panel */}
        <div ref={contentRef} className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="hero-timeline-banner"
            aria-hidden="true"
          >
            <Timeline
              rotation={-1.6}
              initialLeft={8}
              minWidth={56}
              containerClassName="bg-[#02040a] border-yellow-400"
              handleClassName="bg-[#02040a] border-yellow-400"
              handleIndicatorClassName="bg-yellow-400"
            >
              <TimelineText className="text-yellow-400 text-xl md:text-3xl font-black tracking-tight py-2">
                ICB · Studio &rsquo;26
              </TimelineText>
            </Timeline>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="hero-eyebrow"
          >
            <Sparkles size={13} />
            <span>AI · DIGITAL · BRAND</span>
            <span className="hero-eyebrow-divider" />
            <span className="hero-eyebrow-status">
              <span className="hero-eyebrow-pulse" /> ONLINE
            </span>
          </motion.div>

          <motion.h1
            id="hero-heading"
            className="hero-headline"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 1 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.06, delayChildren: 0.3 },
              },
            }}
          >
            <motion.span
              className="hero-line"
              variants={{
                hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
                show: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              The future of
            </motion.span>
            <motion.span
              className="hero-line hero-line-em"
              variants={{
                hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
                show: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              digital is alive.
            </motion.span>
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            We&rsquo;re <strong>ICB</strong> — an award-winning AI &amp; digital studio
            engineering interactive, intelligent products for the next decade
            of the web. Brands, interfaces, agents, and worlds — built in
            real-time.
          </motion.p>

          <motion.div
            className="hero-cta-row"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <a href="#showcase" className="cta cta-primary">
              <span className="cta-shimmer" />
              <span className="cta-label">Start a project</span>
              <ArrowRight size={16} />
            </a>
            <a href="#reel" className="cta cta-secondary">
              <PlayCircle size={18} />
              <span>Watch reel</span>
            </a>
          </motion.div>

          <motion.ul
            className="hero-stats"
            aria-label="Studio at a glance"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {STATS.map((s) => (
              <li key={s.l} className="stat">
                <div className="stat-n">{s.n}</div>
                <div className="stat-l">{s.l}</div>
              </li>
            ))}
          </motion.ul>

          <motion.div
            className="hero-trust"
            aria-label="Trusted by"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 0.9, delay: 1.5 }}
          >
            <span className="hero-trust-label">Trusted by</span>
            <ul>
              {TRUST.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom progress strip */}
        <div className="hero-progress" aria-hidden="true">
          <span
            className="hero-progress-fill"
            style={{ width: `${progressBarPct}%` }}
          />
          <span className="hero-progress-label">
            00:{String(Math.floor(progressBarPct * 0.6)).padStart(2, "0")}
          </span>
        </div>

        {/* Scroll cue */}
        <div ref={scrollCueRef} className="scroll-cue" aria-hidden="true">
          <span>Scroll to enter</span>
          <ChevronDown size={14} />
        </div>

        {/* White-out veil for the final handoff */}
        <div ref={veilRef} className="hero-veil" aria-hidden="true" />
      </div>
    </section>
  );
}
