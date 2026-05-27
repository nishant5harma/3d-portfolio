"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./OurClients.module.css";

/**
 * "Our Clients" — scroll-pinned showcase.
 *
 * Layout
 * ------
 *   ┌──────────────────────────── section (pinned 100vh) ────────────────────┐
 *   │  OUR                                                                  │
 *   │  CLIENTS               ┌─────────── laptop chrome ──────────┐         │
 *   │  ───── 04 brands       │   stack of 3D image cards          │         │
 *   │  current: Fjord        │  (gsap-animated on scroll progress)│         │
 *   │                        └──────────── base / hinge ──────────┘         │
 *   └────────────────────────────────────────────────────────────────────────┘
 *
 * The pin keeps the section on screen for `TOTAL * 100vh` of scroll; every
 * 100vh band advances one client card. After the last band the pin releases
 * and the next page section scrolls in.
 */

type Slide = {
  name: string;
  color: string;
  image: string;
};

const SLIDES: Slide[] = [
  {
    name: "Fjord",
    color: "#6B5B50",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80",
  },
  {
    name: "Aether",
    color: "#B8B5A4",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
  },
  {
    name: "Onyx",
    color: "#8BA8A8",
    image:
      "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=1200&q=80",
  },
  {
    name: "Birch",
    color: "#B5A882",
    image:
      "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=1200&q=80",
  },
];

const TOTAL = SLIDES.length;
/** Viewport-heights of scroll budget — one full screen per client card. */
const SCROLL_VH_PER_SLIDE = 100;

const POSITIONS = [
  { x: -0.35, y: -0.95, rot: -30, s: 1.35, b: 16, o: 0 },
  { x: -0.18, y: -0.5, rot: -15, s: 1.15, b: 8, o: 0.55 },
  { x: 0, y: 0, rot: 0, s: 1, b: 0, o: 1 },
  { x: -0.06, y: 0.5, rot: 15, s: 0.75, b: 6, o: 0.55 },
  { x: -0.12, y: 0.95, rot: 30, s: 0.55, b: 14, o: 0 },
];

const mod = (n: number) => ((n % TOTAL) + TOTAL) % TOTAL;

function targetIndexFromProgress(progress: number) {
  return Math.min(TOTAL - 1, Math.floor(progress * TOTAL));
}

export default function OurClients() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const imagesRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const dotsRef = useRef<HTMLUListElement>(null);

  const currentRef = useRef(0);
  const animatingRef = useRef(false);
  const slideElsRef = useRef<Array<{ el: HTMLDivElement; step: number }>>([]);
  const currentLineRef = useRef<HTMLDivElement | null>(null);
  const scrollStRef = useRef<ScrollTrigger | null>(null);
  const syncToScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const section = sectionRef.current;
    const titleEl = titleRef.current;
    const imagesEl = imagesRef.current;
    if (!wrap || !section || !titleEl || !imagesEl) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    SLIDES.forEach((s) => {
      const img = new Image();
      img.src = s.image;
    });

    const updateCounter = (idx: number) => {
      if (counterRef.current) {
        counterRef.current.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(TOTAL).padStart(2, "0")}`;
      }
      const dots = dotsRef.current?.children;
      if (dots) {
        for (let i = 0; i < dots.length; i++) {
          (dots[i] as HTMLElement).dataset.active = i === idx ? "true" : "false";
        }
      }
    };

    const setTitle = (text: string) => {
      titleEl.innerHTML = "";
      const line = document.createElement("div");
      for (const ch of text) {
        const span = document.createElement("span");
        span.textContent = ch === " " ? "\u00A0" : ch;
        line.appendChild(span);
      }
      titleEl.appendChild(line);
      currentLineRef.current = line;
    };

    setTitle(SLIDES[0].name);
    updateCounter(0);
    gsap.set(section, { backgroundColor: SLIDES[0].color });

    const getProps = (step: number) => {
      const h = imagesEl.offsetHeight;
      const absStep = Math.abs(step);
      const idx = Math.max(0, Math.min(4, step + 2));
      const p = POSITIONS[idx];
      return {
        x: p.x * h,
        y: p.y * h,
        rotation: p.rot,
        scale: p.s,
        blur: p.b,
        opacity: p.o,
        zIndex: absStep === 0 ? 3 : absStep === 1 ? 2 : 1,
      };
    };

    const makeSlide = (idx: number) => {
      const div = document.createElement("div");
      div.className = styles.slide;
      const img = document.createElement("img");
      img.src = SLIDES[idx].image;
      img.alt = SLIDES[idx].name;
      img.width = 1200;
      img.height = 750;
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
      div.appendChild(img);
      return div;
    };

    const positionSlide = (el: HTMLDivElement, step: number) => {
      const p = getProps(step);
      gsap.set(el, {
        xPercent: -50,
        yPercent: -50,
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        scale: p.scale,
        opacity: p.opacity,
        filter: `blur(${p.blur}px)`,
        zIndex: p.zIndex,
      });
    };

    const buildCarousel = () => {
      if (imagesEl.offsetHeight === 0) return;
      imagesEl.innerHTML = "";
      slideElsRef.current = [];
      for (let step = -1; step <= 1; step++) {
        const idx = mod(currentRef.current + step);
        const el = makeSlide(idx);
        imagesEl.appendChild(el);
        positionSlide(el, step);
        slideElsRef.current.push({ el, step });
      }
    };

    buildCarousel();
    if (slideElsRef.current.length === 0) {
      requestAnimationFrame(buildCarousel);
    }

    const animateTitle = (newText: string, direction: "next" | "prev") => {
      const h = titleEl.offsetHeight;
      const dir = direction === "next" ? 1 : -1;
      const oldLine = currentLineRef.current;
      if (!oldLine) return gsap.timeline();

      const oldChars = Array.from(oldLine.querySelectorAll("span"));
      titleEl.style.height = `${h}px`;
      oldLine.style.cssText =
        "position:absolute;top:0;left:0;width:100%;white-space:nowrap";

      const newLine = document.createElement("div");
      newLine.style.cssText =
        "position:absolute;top:0;left:0;width:100%;white-space:nowrap";
      for (const ch of newText) {
        const span = document.createElement("span");
        span.textContent = ch === " " ? "\u00A0" : ch;
        newLine.appendChild(span);
      }
      titleEl.appendChild(newLine);

      const newChars = Array.from(newLine.querySelectorAll("span"));
      gsap.set(newChars, { y: h * dir });

      const duration = reduced ? 0.01 : 0.9;
      const stagger = reduced ? 0 : 0.035;

      const tl = gsap.timeline({
        onComplete: () => {
          oldLine.remove();
          newLine.style.cssText = "";
          gsap.set(newChars, { clearProps: "all" });
          titleEl.style.height = "";
          currentLineRef.current = newLine;
        },
      });

      tl.to(
        oldChars,
        { y: -h * dir, stagger, duration, ease: "expo.inOut" },
        0,
      );
      tl.to(newChars, { y: 0, stagger, duration, ease: "expo.inOut" }, 0);
      return tl;
    };

    const animateCarousel = (direction: "next" | "prev") => {
      if (imagesEl.offsetHeight === 0) return gsap.timeline();

      const shift = direction === "next" ? -1 : 1;
      const enterStep = direction === "next" ? 2 : -2;
      const newIdx =
        direction === "next"
          ? mod(currentRef.current + 2)
          : mod(currentRef.current - 2);

      const newSlide = makeSlide(newIdx);
      imagesEl.appendChild(newSlide);
      positionSlide(newSlide, enterStep);
      slideElsRef.current.push({ el: newSlide, step: enterStep });

      slideElsRef.current.forEach((s) => {
        s.step += shift;
      });

      const duration = reduced ? 0.01 : 1.1;

      const tl = gsap.timeline({
        onComplete: () => {
          slideElsRef.current = slideElsRef.current.filter((s) => {
            if (Math.abs(s.step) >= 2) {
              s.el.remove();
              return false;
            }
            return true;
          });
        },
      });

      slideElsRef.current.forEach((s) => {
        const p = getProps(s.step);
        s.el.style.zIndex = String(p.zIndex);
        tl.to(
          s.el,
          {
            x: p.x,
            y: p.y,
            rotation: p.rotation,
            scale: p.scale,
            opacity: p.opacity,
            filter: `blur(${p.blur}px)`,
            duration,
            ease: "power3.inOut",
          },
          0,
        );
      });

      return tl;
    };

    const go = (direction: "next" | "prev") => {
      if (animatingRef.current) return;
      animatingRef.current = true;

      const nextIdx =
        direction === "next"
          ? mod(currentRef.current + 1)
          : mod(currentRef.current - 1);

      const master = gsap.timeline({
        onComplete: () => {
          currentRef.current = nextIdx;
          updateCounter(nextIdx);
          animatingRef.current = false;
          syncToScrollRef.current?.();
        },
      });

      master.to(
        section,
        {
          backgroundColor: SLIDES[nextIdx].color,
          duration: reduced ? 0.01 : 1.1,
          ease: "power2.inOut",
        },
        0,
      );
      master.add(animateTitle(SLIDES[nextIdx].name, direction), 0);
      master.add(animateCarousel(direction), 0);
    };

    /** Match the visible card to scroll position; chain steps if user scrolls fast. */
    const syncToScroll = () => {
      const st = scrollStRef.current;
      if (!st || animatingRef.current) return;

      const target = targetIndexFromProgress(st.progress);
      if (target === currentRef.current) return;

      go(target > currentRef.current ? "next" : "prev");
    };

    syncToScrollRef.current = syncToScroll;

    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        if (!animatingRef.current && imagesEl.offsetHeight > 0) {
          if (slideElsRef.current.length === 0) {
            buildCarousel();
          } else {
            slideElsRef.current.forEach((s) => positionSlide(s.el, s.step));
          }
        }
      });
    };

    window.addEventListener("resize", onResize, { passive: true });

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: `+=${TOTAL * SCROLL_VH_PER_SLIDE}%`,
        pin: section,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: () => {
          syncToScroll();
        },
      });
      scrollStRef.current = st;
    }, wrap);

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(refreshId);
      syncToScrollRef.current = null;
      scrollStRef.current = null;
      window.removeEventListener("resize", onResize);
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      ctx.revert();
      gsap.killTweensOf([section, titleEl]);
      slideElsRef.current.forEach((s) => gsap.killTweensOf(s.el));
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <section
        ref={sectionRef}
        className={styles.slider}
        aria-label="Our clients"
      >
        <div className={styles.grain} aria-hidden="true" />

        <header className={styles.topbar} aria-hidden="true">
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            <span>Selected work</span>
          </span>
          <span className={styles.eyebrowMeta}>2026 — vol.2</span>
        </header>

        <div className={styles.heading} aria-hidden="true">
          <span className={styles.headingTop}>Our</span>
          <span className={styles.headingBig}>
            <span className={styles.headingFill}>Clients</span>
            <span className={styles.headingStroke}>Clients</span>
          </span>
        </div>

        <div className={styles.body}>
          <div className={styles.left}>
            <div className={styles.currentBlock}>
              <span className={styles.currentLabel}>Currently viewing</span>
              <h3 ref={titleRef} className={styles.title} aria-live="polite" />
            </div>

            <div className={styles.meta}>
              <ul ref={dotsRef} className={styles.dots} aria-hidden="true">
                {SLIDES.map((s) => (
                  <li
                    key={s.name}
                    className={styles.dot}
                    data-active="false"
                  />
                ))}
              </ul>
              <span ref={counterRef} className={styles.counter}>
                01 / 04
              </span>
            </div>
          </div>

          <div className={styles.right} aria-hidden="true">
            <div className={styles.laptop}>
              <div className={styles.laptopScreen}>
                <div className={styles.laptopBezel}>
                  <span className={styles.notch} />
                </div>
                <div className={styles.laptopViewport}>
                  <div ref={imagesRef} className={styles.images} />
                </div>
              </div>
              <div className={styles.laptopBase}>
                <span className={styles.laptopHinge} />
              </div>
              <div className={styles.laptopShadow} aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
