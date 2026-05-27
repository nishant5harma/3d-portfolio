"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import styles from "./TechWeUse.module.css";

/**
 * Tech We Use — vanilla three.js displacement-shader card grid.
 *
 * Ported from the standalone "Tech-stack carousel" prompt onto our
 * multi-section portfolio. The prompt assumes a single-page app where
 * a custom wheel/touch engine hijacks the entire viewport — that would
 * fight Lenis and the other pinned sections above/below, so we drive
 * the same `pageFloat` model from a GSAP ScrollTrigger pin instead.
 * Everything else — the 24 techs, the 4×2 / 2×2 layouts, the 640×720
 * card canvases, and the luminance-based vertical displacement shader
 * — matches the prompt verbatim.
 *
 *   ┌───────────────── .wrap (height = numPages × 100vh) ──────────────┐
 *   │  .section (pinned 100dvh, flex column)                            │
 *   │   ┌─ .auroraBg ─────────────┐                                     │
 *   │   │ 4 colour blobs (26/32/  │   .topbar (eyebrow+title • counter) │
 *   │   │ 36/30s, drifting)       │   .stage (vanilla three.js canvas)  │
 *   │   └─────────────────────────┘   .bottombar (hint pill • dots)     │
 *   └───────────────────────────────────────────────────────────────────┘
 */

/* ────────────────────────────────────────────────────────────────────────── */
/*  Data                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

type Tech = {
  name: string;
  slug: string;
  color: string;
  bg: [string, string];
};

const TECHS: Tech[] = [
  { name: "React",      slug: "react",             color: "#61DAFB", bg: ["#0a1b29", "#142a44"] },
  { name: "Next.js",    slug: "nextdotjs",         color: "#FFFFFF", bg: ["#000000", "#1a1a1a"] },
  { name: "PHP",        slug: "php",               color: "#9089BA", bg: ["#161229", "#27214a"] },
  { name: "Node.js",    slug: "nodedotjs",         color: "#5FA04E", bg: ["#0b1f0d", "#173a1c"] },
  { name: "TypeScript", slug: "typescript",        color: "#3178C6", bg: ["#0c1a2e", "#1a2e52"] },
  { name: "Vue.js",     slug: "vuedotjs",          color: "#4FC08D", bg: ["#0a1f17", "#15352a"] },
  { name: "Python",     slug: "python",            color: "#FFD43B", bg: ["#1a1f29", "#2a2f44"] },
  { name: "Tailwind",   slug: "tailwindcss",       color: "#06B6D4", bg: ["#08202b", "#0d3a4a"] },
  { name: "Docker",     slug: "docker",            color: "#2496ED", bg: ["#0a1929", "#0d2b44"] },
  { name: "GraphQL",    slug: "graphql",           color: "#E10098", bg: ["#1f0a1c", "#3a0d32"] },
  { name: "MongoDB",    slug: "mongodb",           color: "#47A248", bg: ["#0d1f0d", "#1b3320"] },
  { name: "AWS",        slug: "amazonwebservices", color: "#FF9900", bg: ["#1f1a0a", "#3d2c10"] },
  { name: "Redis",      slug: "redis",             color: "#DC382D", bg: ["#1f0a08", "#3d130d"] },
  { name: "Postgres",   slug: "postgresql",        color: "#4169E1", bg: ["#0a1029", "#152044"] },
  { name: "GitHub",     slug: "github",            color: "#FFFFFF", bg: ["#0d1117", "#1a1f29"] },
  { name: "Git",        slug: "git",               color: "#F05032", bg: ["#1f1208", "#3d2614"] },
  { name: "Figma",      slug: "figma",             color: "#F24E1E", bg: ["#1a1018", "#2a1a28"] },
  { name: "Sass",       slug: "sass",              color: "#CC6699", bg: ["#1f0a17", "#3d152a"] },
  { name: "Webpack",    slug: "webpack",           color: "#8DD6F9", bg: ["#0a1620", "#152840"] },
  { name: "Vite",       slug: "vite",              color: "#646CFF", bg: ["#100d1f", "#1c1a3d"] },
  { name: "Bun",        slug: "bun",               color: "#FBF0DF", bg: ["#1a160d", "#332a1a"] },
  { name: "Rust",       slug: "rust",              color: "#CE422B", bg: ["#1a0d08", "#332014"] },
  { name: "Go",         slug: "go",                color: "#00ADD8", bg: ["#08161f", "#0d2a3d"] },
  { name: "Flutter",    slug: "flutter",           color: "#02569B", bg: ["#08101f", "#0d2040"] },
];

const ICON_BASE = "https://cdn.jsdelivr.net/npm/simple-icons@13/icons";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Card composition (canvas-2D → THREE.Texture)                              */
/* ────────────────────────────────────────────────────────────────────────── */

const CARD_W = 640;
const CARD_H = 720;

function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

async function fetchIconSvg(slug: string, color: string): Promise<string | null> {
  try {
    const resp = await fetch(`${ICON_BASE}/${slug}.svg`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    // simple-icons SVGs ship without width/height/fill — inject them so the
    // resulting <img> rasterises at the right size & brand colour.
    return (await resp.text()).replace(
      "<svg",
      `<svg width="256" height="256" fill="${color}"`,
    );
  } catch (e) {
    console.warn(`tech-we-use: icon ${slug} fetch failed`, e);
    return null;
  }
}

// Blob URL → <img> (not the CDN URL directly) so the canvas isn't tainted
// and the resulting texture is usable in WebGL.
function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function makeCardCanvas(tech: Tech, icon: HTMLImageElement | null) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 1. base vertical gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  grad.addColorStop(0, tech.bg[0]);
  grad.addColorStop(1, tech.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 2. Brand-coloured atmosphere — donut-shaped halo around the logo +
  //    a soft bottom-up wash. The reference spec uses a single radial
  //    glow at (W/2, H/2-70) with opacity 0.22 at r=0, but that's
  //    exactly where the 230×230 logo sits — its brightest part gets
  //    completely obscured, so the cards read as solid black. Shaping
  //    the glow as a halo (peak outside the logo) and adding a brand-
  //    tinted bottom wash gives every card a visible brand atmosphere
  //    without touching the per-tech bg[0]/bg[1] hex values.
  const halo = ctx.createRadialGradient(
    CARD_W / 2, CARD_H / 2 - 70, 0,
    CARD_W / 2, CARD_H / 2 - 70, 380,
  );
  halo.addColorStop(0.0, hexToRgba(tech.color, 0.12));
  halo.addColorStop(0.35, hexToRgba(tech.color, 0.42));
  halo.addColorStop(1.0, hexToRgba(tech.color, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Soft brand-coloured wash rising from the bottom — keeps the name +
  // accent bar area atmospheric without overpowering the gradient.
  const wash = ctx.createLinearGradient(0, CARD_H * 0.55, 0, CARD_H);
  wash.addColorStop(0, hexToRgba(tech.color, 0));
  wash.addColorStop(1, hexToRgba(tech.color, 0.16));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 3. inner border
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, CARD_W - 2, CARD_H - 2);

  // 4. top-left "STACK" eyebrow
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 22px Inter, 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("STACK", 36, 36);

  // 5. top-right brand dot
  ctx.fillStyle = hexToRgba(tech.color, 0.9);
  ctx.textAlign = "right";
  ctx.fillText("●", CARD_W - 36, 36);

  // 6. centred logo (230×230, lifted 70px above the geometric centre so the
  //    name+meta stack beneath stays optically balanced).
  if (icon) {
    const iconSize = 230;
    ctx.drawImage(
      icon,
      (CARD_W - iconSize) / 2,
      CARD_H / 2 - iconSize / 2 - 70,
      iconSize,
      iconSize,
    );
  } else {
    // Fallback letter — the spec pins Arial here (not Inter) so the icon-less
    // path renders identically regardless of whether the Inter webfont has
    // loaded yet when the texture is composited.
    ctx.fillStyle = tech.color;
    ctx.font = "bold 200px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tech.name[0], CARD_W / 2, CARD_H / 2 - 70);
  }

  // 7. name (always white so it stays legible over any brand colour)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 58px Inter, 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tech.name, CARD_W / 2, CARD_H - 200);

  // 8. subtitle
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "24px Inter, 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText("technology", CARD_W / 2, CARD_H - 140);

  // 9. accent bar
  ctx.fillStyle = tech.color;
  ctx.fillRect((CARD_W - 70) / 2, CARD_H - 90, 70, 4);

  return canvas;
}

async function loadAllTextures(): Promise<THREE.Texture[]> {
  return Promise.all(
    TECHS.map(async (tech) => {
      let icon: HTMLImageElement | null = null;
      try {
        const svg = await fetchIconSvg(tech.slug, tech.color);
        if (svg) icon = await svgToImage(svg);
      } catch (e) {
        console.warn(`tech-we-use: icon ${tech.slug} render failed`, e);
      }
      const tex = new THREE.Texture(makeCardCanvas(tech, icon));
      tex.needsUpdate = true;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }),
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pagination                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function paginate<T>(items: T[], perPage: number): T[][] {
  if (items.length === 0 || perPage <= 0) return [];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    const slice = items.slice(i, i + perPage);
    while (slice.length < perPage) slice.push(slice[slice.length - 1]);
    pages.push(slice);
  }
  return pages;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shaders                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const VERTEX_SHADER = /* glsl */ `
  precision mediump float;
  precision mediump int;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  precision mediump int;
  uniform float time;
  uniform float blend;
  uniform sampler2D tex1;
  uniform sampler2D tex2;
  varying vec2 vUv;

  const float displaceAmount = 0.35;

  void main() {
    float blend2 = 1.0 - blend;

    vec4 image1 = texture2D(tex1, vUv);
    vec4 image2 = texture2D(tex2, vUv);

    // Luminance-based vertical displacement: bright pixels push the swap
    // further, so each card crossfades with a satisfying "liquid" reveal.
    float lum1 = dot(image1.rgb, vec3(0.299, 0.587, 0.114));
    float lum2 = dot(image2.rgb, vec3(0.299, 0.587, 0.114));

    float t1 = (lum2 * displaceAmount) * blend  * 2.0;
    float t2 = (lum1 * displaceAmount) * blend2 * 2.0;

    vec4 imageA = texture2D(tex2, vec2(vUv.x, vUv.y - t1));
    vec4 imageB = texture2D(tex1, vec2(vUv.x, vUv.y + t2));

    gl_FragColor = imageA * blend2 + imageB * blend;
  }
`;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Layout                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const PHONE_BREAKPOINT = 720;
const ROWS_PER_PAGE = 2;

type Layout = {
  cardWidth: number;
  cardHeight: number;
  colGap: number;
  rowGap: number;
  sideMargin: number;
  vertMargin: number;
};

function getLayout(colsPerRow: number): Layout {
  // ──────────── TUNING NOTES ────────────
  // Each card's pixel size = cardWidth × (canvas_width / fitWidth). With
  // width-fit camera, larger gaps eat into the per-card share of the
  // canvas width — so SHRINKING colGap / rowGap is the cleanest knob to
  // make cards visually bigger without distorting the 640×720 artwork
  // (the cardHeight/cardWidth ratio must stay near 1.125).
  //
  //   • colGap ↓ → cards wider (and proportionally taller, locked aspect)
  //   • rowGap ↓ → less vertical gap between rows; grid total height ↓
  //   • cardWidth/cardHeight: scale both together to preserve aspect — but
  //     width-fit normalises against fitWidth, so this barely changes the
  //     final pixel size. Use the gap knobs instead.
  //   • sideMargin/vertMargin: kept for future "contain" fit experiments;
  //     unused while we run width-fit only.
  if (colsPerRow === 2) {
    return {
      cardWidth: 2.9,
      cardHeight: 3.26,
      colGap: 0.22,
      rowGap: 0.22,
      sideMargin: 0,
      vertMargin: 0.22,
    };
  }
  return {
    cardWidth: 2.7,
    cardHeight: 3.04,
    colGap: 0.22,
    rowGap: 0.26,
    sideMargin: 0,
    vertMargin: 0.26,
  };
}

function colsForViewport(width: number) {
  return width <= PHONE_BREAKPOINT ? 2 : 4;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Vanilla three.js scene                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

type SceneHandles = {
  /** Swap the textures every frame from the React-side scroll progress. */
  applyPageFloat: (pageFloat: number) => void;
  /** Rebuild the grid for a new colsPerRow without losing scroll progress. */
  rebuild: (colsPerRow: number) => void;
  /** Fit the camera + resize the renderer when the container resizes. */
  resize: () => void;
  /** Tear everything down. */
  dispose: () => void;
};

function createScene(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  textures: THREE.Texture[],
  initialCols: number,
): SceneHandles {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(0, 0, 12);

  // Mutable grid state — rebuilt on breakpoint flip.
  let colsPerRow = initialCols;
  let cardsPerPage = colsPerRow * ROWS_PER_PAGE;
  let layout = getLayout(colsPerRow);
  let pages: THREE.Texture[][] = paginate(textures, cardsPerPage);
  let materials: THREE.ShaderMaterial[] = [];
  let meshes: THREE.Mesh[] = [];

  function buildGrid() {
    // Tear down any existing meshes/materials first.
    for (const mesh of meshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const m of materials) m.dispose();
    meshes = [];
    materials = [];

    const totalWidth =
      colsPerRow * layout.cardWidth + (colsPerRow - 1) * layout.colGap;
    const totalHeight =
      ROWS_PER_PAGE * layout.cardHeight + (ROWS_PER_PAGE - 1) * layout.rowGap;
    const startX = -totalWidth / 2 + layout.cardWidth / 2;
    const startY = totalHeight / 2 - layout.cardHeight / 2;

    const nextPageIdx = Math.min(1, pages.length - 1);
    const geometry = new THREE.PlaneGeometry(
      layout.cardWidth,
      layout.cardHeight,
      1,
      1,
    );

    for (let i = 0; i < cardsPerPage; i++) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          blend: { value: 0 },
          tex1: { value: pages[nextPageIdx][i] },
          tex2: { value: pages[0][i] },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
      });

      // Each slot owns its own PlaneGeometry instance — same args, but separate
      // dispose() lifecycles keep the rebuild path simple.
      const slotGeometry = geometry.clone();
      const mesh = new THREE.Mesh(slotGeometry, material);
      const row = Math.floor(i / colsPerRow);
      const col = i % colsPerRow;
      mesh.position.set(
        startX + col * (layout.cardWidth + layout.colGap),
        startY - row * (layout.cardHeight + layout.rowGap),
        0,
      );
      scene.add(mesh);
      meshes.push(mesh);
      materials.push(material);
    }
    geometry.dispose();
  }

  buildGrid();

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    const aspect = w / h;
    camera.aspect = aspect;

    const totalWidth =
      colsPerRow * layout.cardWidth + (colsPerRow - 1) * layout.colGap;
    const fitWidth = totalWidth + layout.sideMargin * 2;
    const vFov = (camera.fov * Math.PI) / 180;
    // Width-fit ONLY. The previous Math.max(distH, distW) "contain"
    // strategy meant any canvas aspect narrower than the grid aspect
    // (≈1.65) would silently flip to height-fit and letterbox the cards
    // horizontally inside the canvas — so the dark tiles stopped filling
    // the 80% stage. Pinning to distW guarantees the cards always span
    // the full canvas width, which (with .stage at 80%) means cards
    // always occupy exactly 80% of the viewport. At extreme aspects
    // (>~1.83) this introduces tiny vertical clipping, which the card
    // art's 36px top + 90px bottom safe zones absorb without losing the
    // STACK label, icon, name, or accent bar.
    const distW = fitWidth / (2 * Math.tan(vFov / 2) * aspect);
    camera.position.set(0, 0, distW);
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
  }
  resize();

  function rebuild(nextCols: number) {
    if (nextCols === colsPerRow) return;
    colsPerRow = nextCols;
    cardsPerPage = colsPerRow * ROWS_PER_PAGE;
    layout = getLayout(colsPerRow);
    pages = paginate(textures, cardsPerPage);
    buildGrid();
    resize();
  }

  function applyPageFloat(pageFloat: number) {
    const numPages = pages.length;
    if (numPages === 0) return;
    const clamped = Math.max(0, Math.min(pageFloat, Math.max(0, numPages - 1)));
    const pageIndex = Math.max(
      0,
      Math.min(Math.floor(clamped), numPages - 1),
    );
    const nextIndex = Math.min(pageIndex + 1, numPages - 1);
    const raw = Math.max(0, Math.min(1, clamped - pageIndex));
    // smoothstep — keeps the swap snappy without the linear "edge" pop.
    const eased = raw * raw * (3 - 2 * raw);

    for (let i = 0; i < materials.length; i++) {
      const u = materials[i].uniforms;
      u.tex2.value = pages[pageIndex][i];
      u.tex1.value = pages[nextIndex][i];
      u.blend.value = eased;
      u.time.value += 0.03;
    }
  }

  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    renderer.render(scene, camera);
  }
  loop();

  function dispose() {
    cancelAnimationFrame(raf);
    for (const mesh of meshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    for (const m of materials) m.dispose();
    meshes = [];
    materials = [];
    renderer.dispose();
  }

  return { applyPageFloat, rebuild, resize, dispose };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Public component                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export default function TechWeUse() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const pageFloatRef = useRef(0);

  // colsPerRow drives numPages, which drives the scroll-trigger length. We
  // keep it in React state so the indicator dots and page counter re-render
  // when the breakpoint flips.
  const [colsPerRow, setColsPerRow] = useState(4);
  const [texturesReady, setTexturesReady] = useState(false);
  const [activePage, setActivePage] = useState(0);

  const cardsPerPage = colsPerRow * ROWS_PER_PAGE;
  const numPages = texturesReady ? Math.ceil(TECHS.length / cardsPerPage) : 0;

  // Build textures + scene once on mount. The texture canvases are pinned to
  // memory for the life of the component so the grid can rebuild across
  // breakpoints without re-fetching every simple-icons SVG.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let cancelled = false;
    let texturesHandle: THREE.Texture[] | null = null;

    const initialCols = colsForViewport(window.innerWidth);
    setColsPerRow(initialCols);

    loadAllTextures().then((texs) => {
      if (cancelled) {
        for (const t of texs) t.dispose();
        return;
      }
      texturesHandle = texs;
      sceneRef.current = createScene(canvas, stage, texs, initialCols);
      setTexturesReady(true);
    });

    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      if (texturesHandle) {
        for (const t of texturesHandle) t.dispose();
      }
    };
  }, []);

  // Keep colsPerRow in sync with the viewport. The scene knows how to rebuild
  // itself; we also preserve which tech is on-screen by scaling pageFloat
  // through the old/new cardsPerPage ratio.
  useEffect(() => {
    const onResize = () => {
      const next = colsForViewport(window.innerWidth);
      setColsPerRow((prev) => {
        if (prev === next) return prev;
        const oldPerPage = prev * ROWS_PER_PAGE;
        const newPerPage = next * ROWS_PER_PAGE;
        // techOffset = same tech index, in units of "techs from the start".
        const techOffset = pageFloatRef.current * oldPerPage;
        pageFloatRef.current = techOffset / newPerPage;
        return next;
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Rebuild the three.js grid + refit the camera when colsPerRow flips. The
  // scene render loop keeps running so we don't see a flash.
  useEffect(() => {
    sceneRef.current?.rebuild(colsPerRow);
  }, [colsPerRow]);

  // Drive scroll progress → pageFloat via GSAP ScrollTrigger pin. This is the
  // adaptation of the prompt's custom wheel/touch engine for a multi-section
  // site — Lenis + ScrollTrigger already provide the smooth, snapping scroll
  // physics the prompt describes (dampen 0.965 ≈ ScrollTrigger snap easing).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (numPages === 0) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapRef.current,
        start: "top top",
        // Math.max(1, numPages) so a single-page layout still has SOMETHING
        // for ScrollTrigger to pin against; the pageFloat math clamps to 0.
        end: `+=${Math.max(1, numPages) * 100}%`,
        pin: sectionRef.current,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // Snap to the nearest page once the wheel/touch input stops — the
        // prompt's "snap" function expressed through ScrollTrigger.
        snap: {
          snapTo: numPages > 1 ? 1 / (numPages - 1) : 0,
          duration: { min: 0.2, max: 0.5 },
          ease: "power2.out",
          delay: 0.05,
        },
        onUpdate: (self) => {
          const f = self.progress * Math.max(0, numPages - 1);
          pageFloatRef.current = f;
          sceneRef.current?.applyPageFloat(f);
          const idx = Math.round(f);
          setActivePage((prev) => (prev !== idx ? idx : prev));
        },
      });
    }, wrapRef);

    // Let layout settle before ScrollTrigger measures the section — without
    // this the first refresh can miss the canvas height on slow GPUs.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(id);
      ctx.revert();
    };
  }, [numPages]);

  // ResizeObserver on the stage so the canvas resizes when the topbar/header
  // heights shift (e.g. when the eyebrow line wraps on tablet).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      sceneRef.current?.resize();
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const jumpToPage = (i: number) => {
    if (typeof window === "undefined") return;
    const st = ScrollTrigger.getAll().find(
      (t) => t.trigger === wrapRef.current,
    );
    if (!st) return;
    const ratio = numPages > 1 ? i / (numPages - 1) : 0;
    const target = st.start + (st.end - st.start) * ratio;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div ref={sectionRef} className={styles.section}>
        {/* Khaki aurora — soft drifting blobs in the #B5A882 family,
            multiply-blended over the cream gradient. */}
        <div className={styles.auroraBg} aria-hidden="true">
          <span className={`${styles.blob} ${styles.blob1}`} />
          <span className={`${styles.blob} ${styles.blob2}`} />
          <span className={`${styles.blob} ${styles.blob3}`} />
          <span className={`${styles.blob} ${styles.blob4}`} />
        </div>

        {/* Subtle film grain so the flat khaki gradient never looks plastic
            (matches the .grain treatment in OurClients). */}
        <div className={styles.grain} aria-hidden="true" />

        <h2 className={styles.srOnly}>Tech we use</h2>

        <header className={styles.topbar}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            <span>Our toolkit</span>
          </span>
          <span className={styles.counter}>
            <span className={styles.counterCurrent}>
              {String(activePage + 1).padStart(2, "0")}
            </span>
            <span className={styles.counterSep}>/</span>
            <span>{String(Math.max(1, numPages)).padStart(2, "0")}</span>
          </span>
        </header>

        {/* Editorial heading — same Syne fill + offset-stroke layout as
            OurClients ("Our / Clients" → "Tech we / Use"). */}
        <div className={styles.heading} aria-hidden="true">
          <span className={styles.headingTop}>Tech we</span>
          <span className={styles.headingBig}>
            <span className={styles.headingFill}>Use</span>
            <span className={styles.headingStroke}>Use</span>
          </span>
        </div>

        <div ref={stageRef} className={styles.stage}>
          <canvas ref={canvasRef} className={styles.canvas} />
          {!texturesReady && <div className={styles.loading} aria-hidden />}
        </div>

        <footer className={styles.bottombar}>
          <div className={styles.hint}>
            <span className={styles.hintArrow}>↑</span>
            <span className={styles.hintText}>scroll to swap cards</span>
            <span className={styles.hintArrow}>↓</span>
          </div>
          <div className={styles.indicators}>
            {Array.from({ length: Math.max(1, numPages) }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to page ${i + 1}`}
                className={`${styles.indicator} ${
                  i === activePage ? styles.indicatorActive : ""
                }`}
                onClick={() => jumpToPage(i)}
              />
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
