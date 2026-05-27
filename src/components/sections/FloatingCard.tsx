"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { MouseEvent } from "react";

export interface FloatingCardData {
  index: string;
  category: string;
  title: string;
  description: string;
  client: string;
  year: string;
  accent: string; // CSS gradient string
  preview: string; // background CSS for the mock preview surface
}

const SPRING = { stiffness: 160, damping: 20, mass: 0.45 };

/**
 * Single floating glassmorphic project card. Tilts in 3D on mouse-move,
 * sports a holographic gradient sheen on hover, and floats with a subtle
 * idle animation when at rest.
 */
export default function FloatingCard({
  card,
  index,
}: {
  card: FloatingCardData;
  index: number;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [10, -10]), SPRING);
  const ry = useSpring(useTransform(mx, [-1, 1], [-12, 12]), SPRING);
  const tz = useSpring(0, SPRING);

  const sheenX = useTransform(mx, [-1, 1], ["0%", "100%"]);
  const sheenY = useTransform(my, [-1, 1], ["0%", "100%"]);

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mx.set(x);
    my.set(y);
  }

  function onMouseLeave() {
    mx.set(0);
    my.set(0);
    tz.set(0);
  }

  function onMouseEnter() {
    tz.set(40);
  }

  return (
    <motion.article
      className="show-card"
      style={{
        rotateX: rx,
        rotateY: ry,
        translateZ: tz,
        transformPerspective: 1200,
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      initial={{ opacity: 0, y: 60, rotateX: 12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.9,
        delay: 0.08 * index,
        ease: [0.22, 1, 0.36, 1],
      }}
      animate={{ y: [0, -6, 0] }}
      // The idle float runs in parallel — Framer composes the transforms.
    >
      {/* Sheen overlay — follows the mouse to fake a glossy refraction */}
      <motion.span
        className="show-card-sheen"
        style={{
          background: `radial-gradient(420px circle at ${sheenX} ${sheenY}, rgba(125, 211, 252, 0.18), transparent 55%)`,
        }}
      />

      <span
        className="show-card-accent"
        style={{ background: card.accent }}
        aria-hidden="true"
      />

      <header className="show-card-header">
        <span className="show-card-index">{card.index}</span>
        <span className="show-card-category">{card.category}</span>
      </header>

      <div
        className="show-card-preview"
        style={{ background: card.preview }}
        aria-hidden="true"
      >
        <span className="show-card-preview-glow" />
        <div className="show-card-preview-ui">
          <span className="show-card-pill" />
          <span className="show-card-line" />
          <span className="show-card-line show-card-line-2" />
          <div className="show-card-graph">
            <span style={{ height: "32%" }} />
            <span style={{ height: "68%" }} />
            <span style={{ height: "44%" }} />
            <span style={{ height: "82%" }} />
            <span style={{ height: "56%" }} />
            <span style={{ height: "74%" }} />
            <span style={{ height: "90%" }} />
          </div>
        </div>
      </div>

      <div className="show-card-body">
        <h3 className="show-card-title">{card.title}</h3>
        <p className="show-card-desc">{card.description}</p>
      </div>

      <footer className="show-card-footer">
        <div className="show-card-meta">
          <span>{card.client}</span>
          <span className="show-card-meta-sep" />
          <span>{card.year}</span>
        </div>
        <a
          className="show-card-cta"
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-label={`Open case study for ${card.title}`}
        >
          <span>View case</span>
          <ArrowUpRight size={14} />
        </a>
      </footer>
    </motion.article>
  );
}
