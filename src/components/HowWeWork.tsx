"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ClipboardList,
  Hammer,
  MessageSquare,
  Package,
  Plus,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import styles from "./HowWeWork.module.css";

/**
 * How We Work — horizontal-scroll node flowchart (claymorphism).
 *
 * Direct port of the GSAP Interactive Node Flowchart pen
 * (https://codepen.io/dermalhealth/pen/GgNrpJx) re-themed to our
 * 5-stage process: Project → We Plan → We Discuss → We Work → We Deliver.
 *
 * Technique (same as the pen):
 *   1. `.wrap` is pinned by ScrollTrigger and the `.canvas` (3000px wide)
 *      tweens horizontally; vertical scroll distance is mapped 1:1 to the
 *      horizontal translation via `end: "+="+scrollMax`.
 *   2. SVG paths use `getTotalLength()` + dasharray/dashoffset trickery so
 *      they "draw" in as their bounding box scrolls into view. The
 *      `containerAnimation` opt makes ScrollTrigger watch each path's
 *      position inside the horizontally-tweening canvas instead of the
 *      vertical scroll.
 *   3. Cards / connector dots / plus buttons all pop in with
 *      `back.out(1.4)` ease via the same containerAnimation hook.
 *
 * On top of the pen we add: a fixed HUD with the section title, a live
 * "0X / 05 — Stage" indicator, and a scrub-driven progress bar.
 */

/* ────────────────────────── stages config ─────────────────────────── */

type Stage = {
  id: string;
  step: string;
  title: string;
  blurb: string;
  duration: string;
  bullets: string[];
  color: string;
  icon: LucideIcon;
  cardX: number;
};

const STAGES: Stage[] = [
  {
    id: "project",
    step: "01",
    title: "Project",
    blurb:
      "It starts with your idea. We listen, ask the right questions, and capture the brief in detail.",
    duration: "Day 0",
    bullets: ["Brief intake", "Goals + KPIs", "First call"],
    color: "#facc15",
    icon: Rocket,
    cardX: 280,
  },
  {
    id: "plan",
    step: "02",
    title: "We Plan",
    blurb:
      "Roadmap, scope, timeline, and tech stack — all locked in writing before a single pixel ships.",
    duration: "Week 1",
    bullets: ["Scope doc", "Timeline", "Tech stack"],
    color: "#3b82f6",
    icon: ClipboardList,
    cardX: 880,
  },
  {
    id: "discuss",
    step: "03",
    title: "We Discuss",
    blurb:
      "Sync calls, design reviews, async loops. You stay in the loop at every step — no surprises.",
    duration: "Ongoing",
    bullets: ["Weekly sync", "Async review", "Slack channel"],
    color: "#a855f7",
    icon: MessageSquare,
    cardX: 1480,
  },
  {
    id: "work",
    step: "04",
    title: "We Work",
    blurb:
      "Design + engineering in tight one-week sprints — a shippable build lands every Friday.",
    duration: "Sprint",
    bullets: ["Design system", "Build sprints", "Weekly demos"],
    color: "#f97316",
    icon: Hammer,
    cardX: 2080,
  },
  {
    id: "deliver",
    step: "05",
    title: "We Deliver",
    blurb:
      "Launch, polish, handover — plus 30 days of post-launch care so you can grow without us.",
    duration: "Launch",
    bullets: ["QA + audit", "Go live", "30-day care"],
    color: "#22c55e",
    icon: Package,
    cardX: 2680,
  },
];

const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 1000;
const Y = 500;
const SIDE_OFFSET = 150; // distance from card center → connector dot

/* ────────────────────────────── component ────────────────────────────── */

export default function HowWeWork() {
  const wrapRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const progress = progressRef.current;
    if (!wrap || !canvas) return;

    // Defer GSAP setup by a frame. This matters because the section ABOVE
    // (`TechWeUse`) registers its pin asynchronously (after icons load +
    // its own rAF → ScrollTrigger.refresh). If we register our triggers
    // first, our document positions are computed with stale heights and
    // the cards pop in randomly while the user is still scrolling
    // through TechWeUse. One rAF + `refreshPriority: -1` + an explicit
    // `ScrollTrigger.refresh()` after setup keeps us in sync.
    let rafId = 0;
    let ctx: gsap.Context | null = null;

    rafId = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        // Distance the canvas needs to travel horizontally. Includes a small
        // tail so the last card finishes inside the viewport with breathing room.
        const computeScrollMax = () =>
          canvas.scrollWidth - window.innerWidth + 200;

        let lastIdx = -1;

        const horizontalTween = gsap.to(canvas, {
          x: () => -computeScrollMax(),
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            pin: true,
            pinSpacing: true,
            // Slightly snappier scrub so the canvas hugs the wheel/touchpad
            // input more tightly. Lenis is already smoothing scroll input
            // upstream, so we don't need the full 1s lag here.
            scrub: 0.6,
            start: "top top",
            end: () => "+=" + computeScrollMax(),
            invalidateOnRefresh: true,
            anticipatePin: 1,
            // Refresh AFTER any pinned section above this one — guarantees
            // our start/end use the post-pin-spacing document height.
            refreshPriority: -1,
            onUpdate: (self) => {
              if (progress) {
                progress.style.transform = `scaleX(${self.progress})`;
              }
              const idx = Math.min(
                STAGES.length - 1,
                Math.floor(self.progress * STAGES.length * 0.999),
              );
              if (idx !== lastIdx) {
                lastIdx = idx;
                setActiveIdx(idx);
              }
            },
          },
        });

        // 1) Stroke-draw the SVG connector lines as their bounding box
        //    crosses the viewport (containerAnimation hooks into the horizontal
        //    tween instead of vertical scroll).
        const paths = wrap.querySelectorAll<SVGPathElement>(`.${styles.linePath}`);
        paths.forEach((path) => {
          const length = path.getTotalLength();
          // immediateRender so the path is hidden from frame zero — no flash
          // before the trigger evaluates.
          gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
            opacity: 1,
          });
          gsap.to(path, {
            strokeDashoffset: 0,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: path,
              containerAnimation: horizontalTween,
              start: "left right-=200",
              end: "right center",
              scrub: true,
            },
          });
        });

        // 2) Reveal cards / dots / plus buttons smoothly on scroll.
        //
        //    Two buckets, each with its own animation strategy tuned for
        //    silky-smooth playback:
        //
        //    A) Initially visible (Project / Plan / Discuss on most
        //       desktops): one-shot staggered fade-in with `power3.out`
        //       (no bouncy overshoot) when the section enters the viewport.
        //
        //    B) Off-screen-right (Work / Deliver): SCRUB-tied to the
        //       horizontal tween via containerAnimation. As the card
        //       scrolls in from the right, its scale/opacity/y animate
        //       in lock-step with scroll progress — buttery smooth,
        //       fully bidirectional, no "pop" snapping.
        const W = window.innerWidth;
        const TRIGGER_LINE = W - 150;
        const halfWidthFor = (kind: string | undefined) =>
          kind === "card" ? 140 : kind === "plus" ? 22 : 10;

        const initiallyVisible: HTMLElement[] = [];
        const enterFromRight: HTMLElement[] = [];

        const revealEls = wrap.querySelectorAll<HTMLElement>(`.${styles.reveal}`);
        revealEls.forEach((el) => {
          const isPlus = el.dataset.kind === "plus";
          // Start from a gentle 0.85 scale + 24px down + rotated plus —
          // less extreme than scale:0 so the animation reads as a smooth
          // settle instead of an abrupt pop.
          gsap.set(el, {
            scale: 0.85,
            opacity: 0,
            y: 24,
            rotation: isPlus ? -90 : 0,
            transformOrigin: "center center",
          });

          const leftPx = parseFloat(el.style.left || "0");
          const elLeftInCanvas = leftPx - halfWidthFor(el.dataset.kind);
          if (elLeftInCanvas < TRIGGER_LINE) {
            initiallyVisible.push(el);
          } else {
            enterFromRight.push(el);
          }
        });

        // Bucket A — already in view. Stagger in with a smooth power3.out
        // ease (no bounce). Longer duration + gentler stagger reads as a
        // premium fade-in rather than a quick pop.
        if (initiallyVisible.length) {
          ScrollTrigger.create({
            trigger: wrap,
            start: "top bottom-=10%",
            once: true,
            onEnter: () => {
              gsap.to(initiallyVisible, {
                scale: 1,
                opacity: 1,
                y: 0,
                rotation: 0,
                duration: 1.1,
                ease: "power3.out",
                stagger: { each: 0.09, from: "start" },
                overwrite: "auto",
              });
            },
          });
        }

        // Bucket B — scrub-tied to horizontal scroll. The animation
        // progress = the card's horizontal position inside the viewport,
        // so the card smoothly fades + rises into place as it enters
        // and reverses gracefully if the user scrolls back. 0.8s scrub
        // smoothing keeps it buttery without lag.
        enterFromRight.forEach((el) => {
          gsap.to(el, {
            scale: 1,
            opacity: 1,
            y: 0,
            rotation: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              containerAnimation: horizontalTween,
              // Card starts revealing when its left edge hits the
              // viewport's right edge, finishes 420px later.
              start: "left right-=40",
              end: "left right-=460",
              scrub: 0.8,
            },
          });
        });

        // After every trigger is wired up, force a refresh so positions
        // reflect the current (post-TechWeUse-pin) document layout.
        ScrollTrigger.refresh();
      }, wrap);
    });

    return () => {
      cancelAnimationFrame(rafId);
      ctx?.revert();
    };
  }, []);

  const activeStage = STAGES[activeIdx];

  return (
    <section
      ref={wrapRef}
      className={styles.wrap}
      aria-labelledby="hww-heading"
    >
      {/* ────────── Apple "hello"-style moving gradient (3 drifting blobs) ────────── */}
      <div className={`${styles.bgBlob} ${styles.bgBlobA}`} aria-hidden="true" />
      <div className={`${styles.bgBlob} ${styles.bgBlobB}`} aria-hidden="true" />
      <div className={`${styles.bgBlob} ${styles.bgBlobC}`} aria-hidden="true" />

      {/* ────────── Top HUD: eyebrow + editorial heading ────────── */}
      <header className={styles.topbar} aria-hidden="true">
        <span className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          <span>Our process</span>
        </span>
        <span className={styles.eyebrowMeta}>05 / 05 — 2026</span>
      </header>

      <div className={styles.heading}>
        <div className={styles.headingLeft} aria-hidden="true">
          <span className={styles.headingTop}>How</span>
          <span className={styles.headingBig}>
            <span className={styles.headingFill} id="hww-heading">
              We Work
            </span>
            <span className={styles.headingStroke}>We Work</span>
          </span>
        </div>
        <p className={styles.tagline}>
          A 5-stage system designed to ship quality on time, every time — from
          first call to launch day, and 30 days beyond.
        </p>
      </div>

      {/* ────────── Canvas: pinned wrapper translates horizontally ────────── */}
      <div className={styles.canvasViewport}>
        <div
          ref={canvasRef}
          className={styles.canvas}
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          {/* SVG line layer — one curved path per transition */}
          <svg
            className={styles.linesLayer}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {STAGES.slice(0, -1).map((stage, i) => {
              const next = STAGES[i + 1];
              const x1 = stage.cardX + SIDE_OFFSET;
              const x2 = next.cardX - SIDE_OFFSET;
              // Gentle alternating arc — odd transitions bow up, even bow down
              const curve = i % 2 === 0 ? -55 : 55;
              const d = `M ${x1} ${Y} C ${x1 + 70} ${Y + curve}, ${x2 - 70} ${Y + curve}, ${x2} ${Y}`;
              return (
                <path
                  key={`path-${stage.id}`}
                  className={styles.linePath}
                  d={d}
                />
              );
            })}
          </svg>

          {/* Cards + per-transition connectors */}
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const isLast = i === STAGES.length - 1;
            const next = !isLast ? STAGES[i + 1] : null;
            const rightX = stage.cardX + SIDE_OFFSET;
            const leftXNext = next ? next.cardX - SIDE_OFFSET : 0;
            const plusX = next ? (rightX + leftXNext) / 2 : 0;

            return (
              <Fragment key={stage.id}>
                <article
                  className={`${styles.card} ${styles.reveal}`}
                  style={
                    {
                      left: stage.cardX,
                      top: Y,
                      "--stageColor": stage.color,
                    } as CSSProperties
                  }
                  data-kind="card"
                >
                  <header className={styles.cardHeader}>
                    <span
                      className={styles.cardStep}
                      style={{ background: stage.color }}
                    >
                      {stage.step}
                    </span>
                    <span className={styles.cardDuration}>{stage.duration}</span>
                  </header>

                  <div
                    className={styles.cardIconWrap}
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${stage.color}55, ${stage.color}10 70%)`,
                    }}
                  >
                    <Icon
                      size={56}
                      strokeWidth={1.4}
                      className={styles.cardIcon}
                    />
                    <span
                      className={styles.cardIconDot}
                      style={{ background: stage.color }}
                    />
                  </div>

                  <h3 className={styles.cardTitle}>{stage.title}</h3>
                  <p className={styles.cardBlurb}>{stage.blurb}</p>

                  <ul className={styles.cardBullets}>
                    {stage.bullets.map((b) => (
                      <li key={b}>
                        <span className={styles.cardBulletDot} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </article>

                {!isLast && (
                  <>
                    <span
                      className={`${styles.connectorDot} ${styles.reveal}`}
                      style={{ left: rightX, top: Y }}
                      data-kind="dot"
                      aria-hidden="true"
                    />
                    <span
                      className={`${styles.plusBtn} ${styles.reveal}`}
                      style={{ left: plusX, top: Y }}
                      data-kind="plus"
                      aria-hidden="true"
                    >
                      <Plus size={20} strokeWidth={2.5} />
                    </span>
                    <span
                      className={`${styles.connectorDot} ${styles.reveal}`}
                      style={{ left: leftXNext, top: Y }}
                      data-kind="dot"
                      aria-hidden="true"
                    />
                  </>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* ────────── Bottom HUD: live stage indicator + progress + scroll hint ────────── */}
      <div className={styles.bottomBar}>
        <div className={styles.stageIndicator}>
          <span className={styles.stageIndicatorLabel}>
            <span className={styles.stageIndicatorNum}>{activeStage.step}</span>
            <span className={styles.stageIndicatorSep}>/</span>
            <span className={styles.stageIndicatorTotal}>0{STAGES.length}</span>
          </span>
          <span
            className={styles.stageIndicatorSwatch}
            style={{ background: activeStage.color }}
          />
          <span className={styles.stageIndicatorTitle}>
            {activeStage.title}
            <ArrowRight size={12} className={styles.stageIndicatorArrow} />
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div ref={progressRef} className={styles.progressFill} />
        </div>

        <div className={styles.scrollHint}>
          <span className={styles.scrollHintArrow}>↓</span>
          <span>Scroll to trace the flow</span>
          <span className={styles.scrollHintArrow}>↓</span>
        </div>
      </div>
    </section>
  );
}
