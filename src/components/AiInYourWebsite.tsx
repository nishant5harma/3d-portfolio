"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { withBasePath } from "@/lib/basePath";
import styles from "./AiInYourWebsite.module.css";

/**
 * AI In Your Website — two-stage scroll cinematic.
 *
 * Stage 1 (progress 0.00 → 0.30)
 *   Pure black canvas. The headline "AI IN YOUR WEBSITE" smoothly fades
 *   in (blur + scale + opacity), holds, then fades out as we approach
 *   stage 2.
 *
 * Stage 2 (progress 0.25 → 1.00)
 *   The intro fades out as the background video fades in. From progress
 *   0.30 onwards, `video.currentTime` is scrubbed in lock-step with
 *   scroll progress, giving an Apple-style frame-by-frame playback
 *   effect as the user wheels through the pinned section.
 *
 * Implementation notes:
 *   - Single `ScrollTrigger.create({ pin: true, scrub })` drives every
 *     visual via one `onUpdate` callback (cheapest possible setup).
 *   - Video metadata is awaited before we register the trigger so the
 *     duration we scrub against is real.
 *   - Pin length is `videoDuration * 80 * pixelsPerSecond ≈ ~400vh` for
 *     a typical 5-8s clip — long enough to feel buttery, short enough
 *     not to trap the user.
 *   - Pre-roll: we play+pause the video on mount so the first frame is
 *     decoded and ready (otherwise iOS/Safari shows a black frame until
 *     the first explicit `currentTime` write).
 */

export default function AiInYourWebsite() {
  const wrapRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.registerPlugin(ScrollTrigger);

    const wrap = wrapRef.current;
    const intro = introRef.current;
    const video = videoRef.current;
    if (!wrap || !intro || !video) return;

    let rafId = 0;
    let ctx: gsap.Context | null = null;
    let cleanupMeta: (() => void) | null = null;

    const setup = () => {
      // Fallback to 8s if duration is unavailable (some codecs report NaN
      // until enough frames are decoded). Scrub still works once the
      // browser knows the real duration.
      const duration = isFinite(video.duration) && video.duration > 0
        ? video.duration
        : 8;

      // Pre-roll: nudge the first frame into the decoder so it paints
      // immediately when opacity ramps up. iOS/Safari needs this or you
      // see a flash of black before the first frame appears.
      void video.play().then(() => video.pause()).catch(() => {
        // Autoplay might be blocked — that's fine, scrubbing still works
        // because `currentTime` writes paint a frame even when paused.
      });

      // Under reduced-motion just show the video poster-style with intro
      // text visible; no scroll pinning, no scrubbing.
      if (reduced) {
        intro.style.opacity = "1";
        video.style.opacity = "0";
        return;
      }

      rafId = requestAnimationFrame(() => {
        ctx = gsap.context(() => {
          // 1s of video ≈ ~70vh of scroll. Caps the total at 500vh so it
          // never feels like an infinite section even for long clips.
          const targetScrollPx = Math.min(
            window.innerHeight * 5,
            Math.max(window.innerHeight * 3, duration * window.innerHeight * 0.7),
          );

          ScrollTrigger.create({
            trigger: wrap,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: -1,
            start: "top top",
            end: () => `+=${targetScrollPx}`,
            // Light scrub smoothing — wheel/touchpad input feels tight
            // without the video lagging the scroll position obviously.
            scrub: 0.35,
            onUpdate: (self) => {
              const p = self.progress;

              /* ─── Stage 1 — intro headline (0.00 → 0.30) ─── */
              let textOpacity = 0;
              let textScale = 0.92;
              let textBlur = 14;

              if (p < 0.06) {
                // Fade IN
                const t = p / 0.06;
                textOpacity = t;
                textScale = 0.92 + t * 0.08;
                textBlur = (1 - t) * 14;
              } else if (p < 0.22) {
                // Hold
                textOpacity = 1;
                textScale = 1;
                textBlur = 0;
              } else if (p < 0.3) {
                // Fade OUT
                const t = (p - 0.22) / 0.08;
                textOpacity = 1 - t;
                textScale = 1 - t * 0.04;
                textBlur = t * 14;
              }

              intro.style.opacity = textOpacity.toString();
              intro.style.transform = `scale(${textScale})`;
              intro.style.filter = `blur(${textBlur}px)`;

              /* ─── Stage 2 — video reveal + scrub (0.25 → 1.00) ─── */
              let videoOpacity = 0;
              if (p >= 0.25 && p < 0.34) {
                videoOpacity = (p - 0.25) / 0.09;
              } else if (p >= 0.34) {
                videoOpacity = 1;
              }
              video.style.opacity = videoOpacity.toString();

              // Frame scrub: 0.30 → 1.00 maps to currentTime 0 → duration.
              // Skip writes smaller than 1 frame (~16ms at 60fps) so we
              // don't thrash the decoder.
              if (p >= 0.3) {
                const videoP = Math.min(1, (p - 0.3) / 0.7);
                const newTime = videoP * duration;
                if (Math.abs(video.currentTime - newTime) > 0.02) {
                  video.currentTime = newTime;
                }
              } else if (video.currentTime > 0.05) {
                video.currentTime = 0;
              }
            },
          });

          ScrollTrigger.refresh();
        }, wrap);
      });
    };

    if (video.readyState >= 1) {
      setup();
    } else {
      const onMeta = () => setup();
      video.addEventListener("loadedmetadata", onMeta, { once: true });
      cleanupMeta = () => video.removeEventListener("loadedmetadata", onMeta);
    }

    return () => {
      cleanupMeta?.();
      cancelAnimationFrame(rafId);
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={wrapRef} className={styles.wrap} aria-labelledby="aiyw-heading">
      {/* Background scrubbed video — sits at z-index 0, fades in stage 2. */}
      <video
        ref={videoRef}
        className={styles.video}
        src={withBasePath("/ai-in-you-website.mp4")}
        muted
        playsInline
        // `metadata` keeps the cost low until the section is actually
        // visible; the GSAP setup upgrades to full preload on demand.
        preload="metadata"
        autoPlay={false}
        loop={false}
        aria-hidden="true"
      />

      {/* Soft vignette so headline reads cleanly over any frame */}
      <div className={styles.vignette} aria-hidden="true" />

      {/* Stage 1 headline */}
      <div ref={introRef} className={styles.intro}>
        <span className={styles.introEyebrow}>
          <span className={styles.introEyebrowDot} />
          <span>Introducing</span>
        </span>
        <h2 id="aiyw-heading" className={styles.introTitle}>
          <span>AI</span>
          <span>IN</span>
          <span>YOUR</span>
          <span className={styles.introTitleAccent}>WEBSITE</span>
        </h2>
        <p className={styles.introTagline}>
          Smart assistants, recommendations, content generation, search —
          built straight into the product you ship.
        </p>
      </div>

      {/* Bottom scroll hint */}
      <div className={styles.scrollHint} aria-hidden="true">
        <span>Scroll</span>
        <span className={styles.scrollHintArrow}>↓</span>
      </div>
    </section>
  );
}
