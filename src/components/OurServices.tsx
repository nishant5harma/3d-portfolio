"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowUpRight,
  Bot,
  Cloud,
  Code2,
  Compass,
  Palette,
  ShoppingBag,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import styles from "./OurServices.module.css";

/**
 * Our Services — scroll-pinned focus carousel.
 *
 * Inspired by Chris Bolson's `animation-timeline: scroll()` Star Trek pen
 * (https://codepen.io/cbolson/pen/ByzezPg) re-implemented with GSAP
 * ScrollTrigger so it works in every modern browser, not just Chromium.
 *
 * Mechanics:
 *   1. `.wrap` is pinned for `services.length * 70%` of viewport scroll.
 *   2. A single ScrollTrigger drives an `activeIdx` (0-N-1) based on scroll
 *      progress, plus a sub-slot progress 0-1 for ultra-smooth between-
 *      slot interpolation of the big background name.
 *   3. Each service card sets `--offset = (i - activeIdx)` via inline style.
 *      CSS turns that offset into:
 *        - translateX(offset * spacing) to push siblings aside
 *        - scale + filter:sepia + opacity to defocus siblings
 *        - z-index lift for the focused card
 *      All transitions are CSS (no per-card GSAP tween) — buttery smooth
 *      and zero JS work per frame.
 *   4. Big background name + info card animate via the same `activeIdx`.
 */

/* ────────────────────────── services config ─────────────────────────── */

type Service = {
  id: string;
  step: string;
  title: string;
  short: string;
  blurb: string;
  bullets: string[];
  color: string;
  icon: LucideIcon;
};

const SERVICES: Service[] = [
  {
    id: "web",
    step: "01",
    title: "Web Development",
    short: "Sites + web apps",
    blurb:
      "Hand-crafted marketing sites and complex web applications built on modern React / Next.js stacks. Performance-obsessed, SEO-ready, accessible by default.",
    bullets: ["Next.js & React", "Edge & serverless", "CMS integrations", "Core Web Vitals"],
    color: "#3b82f6",
    icon: Code2,
  },
  {
    id: "mobile",
    step: "02",
    title: "Mobile Apps",
    short: "iOS + Android",
    blurb:
      "Native-feel cross-platform apps with React Native and Expo. Same codebase, App Store + Play Store distribution, OTA updates that ship in minutes.",
    bullets: ["React Native", "Expo & EAS", "Push & deeplinks", "Native modules"],
    color: "#8b5cf6",
    icon: Smartphone,
  },
  {
    id: "design",
    step: "03",
    title: "UI / UX Design",
    short: "Product design",
    blurb:
      "Interfaces that feel inevitable. We design end-to-end: research, IA, wireframes, hi-fi, motion, prototype — handed off as a living design system.",
    bullets: ["Research & flows", "Figma libraries", "Motion & micro-IX", "Design tokens"],
    color: "#ec4899",
    icon: Palette,
  },
  {
    id: "brand",
    step: "04",
    title: "Brand & Strategy",
    short: "Identity systems",
    blurb:
      "Naming, positioning, visual identity, voice. We build brands that scale from a single page to a global product line without losing their centre.",
    bullets: ["Naming & voice", "Logo & wordmark", "Brand guidelines", "Launch toolkit"],
    color: "#f59e0b",
    icon: Compass,
  },
  {
    id: "ecommerce",
    step: "05",
    title: "E-commerce",
    short: "Storefronts that convert",
    blurb:
      "Shopify, Stripe, custom headless commerce. Conversion-first product pages, frictionless checkout, analytics that actually tell you what to fix next.",
    bullets: ["Shopify Hydrogen", "Stripe & subscriptions", "Headless commerce", "Conversion audits"],
    color: "#10b981",
    icon: ShoppingBag,
  },
  {
    id: "devops",
    step: "06",
    title: "DevOps & Cloud",
    short: "Ship faster, sleep better",
    blurb:
      "CI/CD pipelines, observability, infra-as-code on Vercel, AWS, GCP. Push to main and your team's coffee is ready by the time it's in production.",
    bullets: ["AWS & Vercel", "Terraform / IaC", "Monitoring & logs", "Zero-downtime deploys"],
    color: "#06b6d4",
    icon: Cloud,
  },
  {
    id: "ai",
    step: "07",
    title: "AI & Automation",
    short: "LLMs in production",
    blurb:
      "RAG pipelines, agent workflows, fine-tuned models, voice & vision. We ship AI features that survive contact with real users — not just demos.",
    bullets: ["RAG & vector DBs", "Agent workflows", "Fine-tuning", "Voice + vision"],
    color: "#d946ef",
    icon: Bot,
  },
];

/* ────────────────────────────── component ────────────────────────────── */

export default function OurServices() {
  const wrapRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);

    const wrap = wrapRef.current;
    const stage = stageRef.current;
    const progressBar = progressBarRef.current;
    if (!wrap || !stage) return;

    // Defer setup one frame so any pinned section above (HowWeWork) has
    // already registered its pin-spacing in the document height before we
    // measure ours. Mirrors the pattern used in HowWeWork itself.
    let rafId = 0;
    let ctx: gsap.Context | null = null;
    let lastIdx = -1;

    rafId = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: wrap,
          pin: true,
          pinSpacing: true,
          start: "top top",
          // ~65vh per service — short enough that each focus shift feels
          // responsive to the wheel, long enough to read comfortably.
          // Explicit pixel value avoids the ambiguity of % end values.
          end: () => `+=${SERVICES.length * window.innerHeight * 0.65}`,
          scrub: 0.4,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: -1,
          onUpdate: (self) => {
            // Map scroll progress 0-1 → activeIdx 0..N-1, plus a sub-slot
            // progress 0-1 we expose as a CSS variable for the big bg name
            // crossfade between adjacent services.
            const raw = self.progress * SERVICES.length;
            const idx = Math.min(SERVICES.length - 1, Math.floor(raw));
            const slotProgress = raw - idx;

            if (progressBar) {
              progressBar.style.transform = `scaleX(${self.progress})`;
            }
            stage.style.setProperty("--slotProgress", slotProgress.toString());

            if (idx !== lastIdx) {
              lastIdx = idx;
              setActiveIdx(idx);
            }
          },
        });

        ScrollTrigger.refresh();
      }, wrap);
    });

    return () => {
      cancelAnimationFrame(rafId);
      ctx?.revert();
    };
  }, []);

  const activeService = SERVICES[activeIdx];

  return (
    <section
      ref={wrapRef}
      className={styles.wrap}
      aria-labelledby="services-heading"
    >
      <div ref={stageRef} className={styles.stage}>
        {/* ────────── Top HUD ────────── */}
        <header className={styles.topbar} aria-hidden="true">
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            <span>Our services</span>
          </span>
          <span className={styles.eyebrowMeta}>
            0{activeIdx + 1} / 0{SERVICES.length} — 2026
          </span>
        </header>

        {/* ────────── Editorial heading ────────── */}
        <div className={styles.heading}>
          <div className={styles.headingLeft} aria-hidden="true">
            <span className={styles.headingTop}>Our</span>
            <span className={styles.headingBig}>
              <span className={styles.headingFill} id="services-heading">
                Services
              </span>
              <span className={styles.headingStroke}>Services</span>
            </span>
          </div>
          <p className={styles.tagline}>
            A full-stack creative studio. Seven disciplines, one team —
            shipping product end-to-end from first sketch to production scale.
          </p>
        </div>

        {/* ────────── Giant background name (crossfades between services) ────────── */}
        <div className={styles.bgNameLayer} aria-hidden="true">
          {SERVICES.map((s, i) => (
            <span
              key={s.id}
              className={styles.bgName}
              data-active={i === activeIdx}
            >
              {s.title}
            </span>
          ))}
        </div>

        {/* ────────── Focusing service row ────────── */}
        <div className={styles.row} aria-hidden="true">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            const offset = i - activeIdx;
            return (
              <article
                key={s.id}
                className={styles.item}
                data-active={i === activeIdx}
                style={
                  {
                    "--offset": offset,
                    "--itemColor": s.color,
                  } as CSSProperties
                }
              >
                <div
                  className={styles.itemInner}
                  style={{
                    // Solid white-ish base with a subtle stage-colour tint
                    // at the top — always visible against the cream bg,
                    // and the colour clearly identifies each service.
                    background: `linear-gradient(160deg, ${s.color}26 0%, #ffffff 70%)`,
                    borderColor: `${s.color}66`,
                  }}
                >
                  <span className={styles.itemStep}>{s.step}</span>
                  <div
                    className={styles.itemIconWrap}
                    style={{
                      // Stage-coloured radial glow layered on the CSS
                      // white base via background-image (not `background`)
                      // so the white fallback stays visible underneath.
                      backgroundImage: `radial-gradient(circle at 30% 30%, ${s.color}40, ${s.color}12 65%, transparent 85%)`,
                    }}
                  >
                    <Icon
                      size={56}
                      strokeWidth={1.5}
                      className={styles.itemIcon}
                      style={{ color: s.color }}
                    />
                  </div>
                  <h3 className={styles.itemTitle}>{s.title}</h3>
                  <p className={styles.itemShort}>{s.short}</p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Floor line behind the row */}
        <div className={styles.floor} aria-hidden="true" />

        {/* ────────── Info card (description + bullets + CTA) ────────── */}
        <div className={styles.infoCard} key={activeService.id}>
          <div className={styles.infoHeader}>
            <span
              className={styles.infoStep}
              style={{ background: activeService.color }}
            >
              {activeService.step}
            </span>
            <h3 className={styles.infoTitle}>{activeService.title}</h3>
          </div>
          <p className={styles.infoBlurb}>{activeService.blurb}</p>
          <ul className={styles.infoBullets}>
            {activeService.bullets.map((b) => (
              <li key={b}>
                <span
                  className={styles.infoBulletDot}
                  style={{ background: activeService.color }}
                />
                {b}
              </li>
            ))}
          </ul>
          <button type="button" className={styles.infoCta}>
            Talk about this <ArrowUpRight size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* ────────── Bottom HUD ────────── */}
        <div className={styles.bottomBar} aria-hidden="true">
          <div className={styles.serviceList}>
            {SERVICES.map((s, i) => (
              <Indicator
                key={s.id}
                step={s.step}
                title={s.title}
                color={s.color}
                active={i === activeIdx}
              />
            ))}
          </div>
          <div className={styles.progressTrack}>
            <div ref={progressBarRef} className={styles.progressFill} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── sub-components ───────────────────────── */

function Indicator({
  step,
  title,
  color,
  active,
}: {
  step: string;
  title: string;
  color: string;
  active: boolean;
}): ReactNode {
  return (
    <span
      className={styles.indicator}
      data-active={active}
      style={{ "--itemColor": color } as CSSProperties}
    >
      <span className={styles.indicatorDot} />
      <span className={styles.indicatorStep}>{step}</span>
      <span className={styles.indicatorTitle}>{title}</span>
    </span>
  );
}
