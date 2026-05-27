"use client";

import { useEffect, useRef } from "react";
import { clamp, easeOutCubic, lerp, ramp, smoothstep } from "@/lib/easing";
import type { ProgressRef, Vec2Ref } from "@/lib/refs";
import styles from "./CssMacBook.module.css";

/**
 * Pure-CSS 3D MacBook (ported from the codepen the user provided).
 *
 * The auto-rotate / lid-flip / glare-sweep keyframes have been stripped —
 * every frame we read `progressRef.current` (0..1 scroll progress) and
 * `mouseRef.current` and write inline transforms directly to the laptop
 * and lid nodes. That keeps everything driven by the scroll timeline GSAP
 * already controls in HeroSection.
 *
 * Phases (mirrors the previous 3D scene):
 *   0.00 → 0.30  establishing — laptop sits right + slightly tilted, lid closed
 *   0.20 → 0.70  centre + open — slides to centre and lid swings open
 *   0.55 → 0.95  screen blooms (brightness lifts on the display image)
 *   0.78 → 1.00  dive in — laptop scales up dramatically, tilt flattens out,
 *                hero-veil fades over the top for the section handoff
 */
export default function CssMacBook({
  progressRef,
  mouseRef,
}: {
  progressRef: ProgressRef;
  mouseRef: Vec2Ref;
}) {
  const laptopRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLSpanElement>(null);

  // Smoothed inputs — keep transforms jitter-free even when scroll/mouse
  // values change suddenly.
  const smoothed = useRef({ x: 0, y: 0, p: 0, t: 0 });

  // Layout mode flag — flipped on resize so the tick loop reads the latest
  // viewport bucket without re-rendering.
  const isMobileRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const updateLayoutMode = () => {
      isMobileRef.current = window.innerWidth < 1024;
    };
    updateLayoutMode();
    window.addEventListener("resize", updateLayoutMode);

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const targetP = clamp(progressRef.current);
      // Frame-rate independent smoothing.
      const k = 1 - Math.pow(0.001, dt);
      smoothed.current.p = lerp(smoothed.current.p, targetP, k);
      smoothed.current.x = lerp(smoothed.current.x, mouseRef.current.x, 0.06);
      smoothed.current.y = lerp(smoothed.current.y, mouseRef.current.y, 0.06);
      smoothed.current.t += dt;

      const p = smoothed.current.p;
      const mx = smoothed.current.x;
      const my = smoothed.current.y;
      const t = smoothed.current.t;

      const centerBlend = easeOutCubic(ramp(p, 0.2, 0.7));
      const openBlend = smoothstep(ramp(p, 0.05, 0.65));
      const screenBloom = smoothstep(ramp(p, 0.55, 0.95));
      const finalRush = smoothstep(ramp(p, 0.78, 1));
      const lockOn = 1 - finalRush * 0.95;

      // ---- Lid: -90° (closed) → +22° (open ~112°) ----
      const lidAngle = lerp(-90, 22, openBlend);
      if (lidRef.current) {
        lidRef.current.style.transform = `rotateX(${lidAngle.toFixed(2)}deg)`;
      }

      // ---- Laptop body: desktop starts hovering high on the right and
      //      drifts toward viewport centre as the lid opens; mobile stacks
      //      it top-centre above the content column so the two never overlap.
      const mobile = isMobileRef.current;
      const translateX = mobile ? 0 : lerp(300, 90, centerBlend);
      const translateY = mobile
        ? lerp(-40, -10, centerBlend)
        : lerp(-170, -90, centerBlend);
      const scale =
        lerp(0.82, 1.15, centerBlend) + finalRush * 2.6;
      const rotX = lerp(-22, -8, centerBlend) * lockOn;
      const rotY = (lerp(-16, -2, centerBlend) + mx * 8) * lockOn;
      const rotZ = my * 2.5 * lockOn;

      if (laptopRef.current) {
        laptopRef.current.style.transform =
          `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0) ` +
          `scale(${scale.toFixed(3)}) ` +
          `rotateX(${rotX.toFixed(2)}deg) ` +
          `rotateY(${rotY.toFixed(2)}deg) ` +
          `rotateZ(${rotZ.toFixed(2)}deg)`;
      }

      // ---- Screen brightness ramps as the laptop "wakes up" + the dive ----
      if (screenRef.current) {
        const brightness = 1 + screenBloom * 1.4 + finalRush * 3.5;
        const saturate = 1 + screenBloom * 0.6;
        screenRef.current.style.filter =
          `brightness(${brightness.toFixed(2)}) saturate(${saturate.toFixed(2)})`;
      }

      // ---- Glare sweeps across the lid over time, intensifying with bloom ----
      if (glareRef.current) {
        const phase = (Math.sin(t * 0.6) + 1) * 0.5;
        const offsetY = lerp(-220, 320, phase);
        const opacity = 0.12 + screenBloom * 0.25;
        glareRef.current.style.transform = `rotate(45deg) translateY(${offsetY.toFixed(
          1,
        )}px)`;
        glareRef.current.style.opacity = opacity.toFixed(3);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateLayoutMode);
    };
  }, [progressRef, mouseRef]);

  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.laptop} ref={laptopRef}>
        {/* ============================== LID ============================== */}
        <div className={styles.lid} ref={lidRef}>
          <div className={styles.top}>
            <svg
              className={styles.apple}
              viewBox="0 0 128 128"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M118.667 93.913c-2.985 6.653-4.421 9.626-8.267 15.519-5.364 8.226-12.928 18.469-22.309 18.545-8.327.09-10.474-5.457-21.778-5.389-11.304.06-13.661 5.494-22.002 5.411-9.374-.083-16.541-9.325-21.905-17.551C7.399 87.463 5.82 60.481 15.074 46.128c6.583-10.191 16.967-16.151 26.723-16.151 9.928 0 16.174 5.479 24.396 5.479 7.975 0 12.83-5.494 24.314-5.494 8.693 0 17.903 4.764 24.456 12.983-21.486 11.846-18.007 42.711 3.704 50.968zM81.799 20.78C85.974 15.391 89.138 7.775 87.994 0c-6.823.474-14.798 4.839-19.451 10.529-4.242 5.155-7.728 12.825-6.367 20.268 7.459.234 15.157-4.237 19.623-10.017z"
                fill="#cdd5e0"
              />
            </svg>
          </div>

          <div className={`${styles.facet} ${styles.front}`} />
          <div className={`${styles.facet} ${styles.back}`} />
          <div className={`${styles.facet} ${styles.left}`} />
          <div className={`${styles.facet} ${styles.right}`} />

          <span className={`${styles.corner} ${styles.fl}`} />
          <span className={`${styles.corner} ${styles.bl}`} />
          <span className={`${styles.corner} ${styles.ll}`} />
          <span className={`${styles.corner} ${styles.rl}`} />

          <div className={styles.inner}>
            <span className={styles.camera} />

            <div className={styles.screen} ref={screenRef}>
              {/*
                A dark cyan tech image keeps the screen visually on-brand
                while the laptop chassis stays silver. Swap the URL freely.
                Using a plain <img> here (rather than next/image) skips the
                remote-domain whitelist dance for this single hero asset.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1600&fit=max"
                alt=""
                draggable={false}
              />
            </div>

            <div className={styles.text}>NEXUS · ICB</div>

            <span className={styles.glare} ref={glareRef} />
          </div>
        </div>

        {/* ============================== BASE ============================= */}
        <div className={styles.base}>
          <span className={styles.hinges} />

          <span className={`${styles.speakers} ${styles.left}`} />
          <span className={`${styles.speakers} ${styles.right}`} />

          <div className={styles.keyboardContainer}>
            <div className={styles.keyboard}>
              {/* Function row */}
              <div className={`${styles.keyboardRow} ${styles.thin}`}>
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={`fn-${i}`} className={styles.key} />
                ))}
              </div>
              {/* Number row */}
              <div className={styles.keyboardRow}>
                {Array.from({ length: 13 }).map((_, i) => (
                  <div key={`num-${i}`} className={styles.key} />
                ))}
                <div className={`${styles.key} ${styles.extraSize}`} />
              </div>
              {/* QWERTY */}
              <div className={styles.keyboardRow}>
                <div className={`${styles.key} ${styles.extraSize}`} />
                {Array.from({ length: 13 }).map((_, i) => (
                  <div key={`qw-${i}`} className={styles.key} />
                ))}
              </div>
              {/* ASDF */}
              <div className={styles.keyboardRow}>
                <div className={`${styles.key} ${styles.extraSizeTwo}`} />
                {Array.from({ length: 11 }).map((_, i) => (
                  <div key={`as-${i}`} className={styles.key} />
                ))}
                <div className={`${styles.key} ${styles.extraSizeTwo}`} />
              </div>
              {/* ZXCV */}
              <div className={styles.keyboardRow}>
                <div className={`${styles.key} ${styles.doubleSize}`} />
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={`zx-${i}`} className={styles.key} />
                ))}
                <div className={`${styles.key} ${styles.doubleSize}`} />
              </div>
              {/* Bottom row with spacebar + arrows */}
              <div className={`${styles.keyboardRow} ${styles.bottomRow}`}>
                <div className={styles.key} />
                <div className={styles.key} />
                <div className={styles.key} />
                <div className={`${styles.key} ${styles.extraSizeTwo}`} />
                <div className={`${styles.key} ${styles.spaceBar}`} />
                <div className={`${styles.key} ${styles.extraSizeTwo}`} />
                <div className={styles.key} />
                <div className={styles.arrows}>
                  <div className={styles.key} />
                  <div className={styles.upDown}>
                    <div className={styles.key} />
                    <div className={styles.key} />
                  </div>
                  <div className={styles.key} />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.touchpad} />

          <span className={`${styles.slit} ${styles.invert}`} />

          <div className={`${styles.facet} ${styles.front}`}>
            <span className={styles.slit} />
          </div>
          <div className={`${styles.facet} ${styles.back}`}>
            <span className={styles.hinges} />
          </div>
          <div className={`${styles.facet} ${styles.left}`}>
            <span className={styles.power} />
            <span className={styles.usb} />
            <span className={styles.usb} />
          </div>
          <div className={`${styles.facet} ${styles.right}`}>
            <span className={styles.usb} />
            <span className={styles.slot} />
          </div>

          <span className={`${styles.corner} ${styles.fl}`} />
          <span className={`${styles.corner} ${styles.bl}`} />
          <span className={`${styles.corner} ${styles.ll}`} />
          <span className={`${styles.corner} ${styles.rl}`} />

          <div className={styles.bottom}>
            <span className={styles.hinges} />

            <span className={`${styles.rubberLeg} ${styles.fl}`} />
            <span className={`${styles.rubberLeg} ${styles.fr}`} />
            <span className={`${styles.rubberLeg} ${styles.bl}`} />
            <span className={`${styles.rubberLeg} ${styles.br}`} />

            <i className={`${styles.screw} ${styles.rl}`} />
            <i className={`${styles.screw} ${styles.ml}`} />
            <i className={`${styles.screw} ${styles.fl}`} />

            <i className={`${styles.screw} ${styles.fml}`} />
            <i className={`${styles.screw} ${styles.fmr}`} />

            <i className={`${styles.screw} ${styles.rml}`} />
            <i className={`${styles.screw} ${styles.rmr}`} />

            <i className={`${styles.screw} ${styles.rr}`} />
            <i className={`${styles.screw} ${styles.mr}`} />
            <i className={`${styles.screw} ${styles.fr}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
