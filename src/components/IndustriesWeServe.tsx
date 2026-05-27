"use client";

import {
  Canvas,
  useFrame,
  useLoader,
  useThree,
} from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { TextureLoader } from "three";
import styles from "./IndustriesWeServe.module.css";

/**
 * Industries We Serve — ported from the Codrops "Atmospheric Depth Gallery"
 * by Houmahani Kane (https://github.com/houmahani/codrops-depth-gallery).
 *
 * Original is a vanilla Three.js scroll experiment that drives a perspective
 * camera through a row of image planes stacked along the z-axis; a separate
 * orthographic background scene renders a GLSL blob field whose mood (bg,
 * blob1, blob2) lerps as the camera passes each plane.
 *
 * This React port keeps the exact look and feel but:
 *   • Uses @react-three/fiber instead of a hand-rolled three Engine
 *   • Hijacks GSAP ScrollTrigger to pin the section and translate page scroll
 *     into camera-z progress (so it co-exists with Lenis + the rest of the
 *     page — no global wheel/touch capture like the source).
 *   • Surfaces the currently-focused industry name via React state for the
 *     HTML overlay (heading, code, sector tag, counter, scroll hint).
 */

type Industry = {
  name: string;
  sector: string;
  code: string;
  image: string;
  /** PMS-style descriptor mirrored from the source palette (golden, violet, …). */
  tone: string;
  background: string;
  blob1: string;
  blob2: string;
  /** Whether text reads better in dark or light — driven by the bg luminance. */
  textTone: "light" | "dark";
};

/**
 * Five mood palettes ported VERBATIM from the original
 * `src/data/galleryData.js` (golden / violet / afterglow / cobalt / meadow).
 * We keep ICB-flavoured industry names on top of those palettes so the gradient
 * matches the source pixel-for-pixel while the section still reads as
 * "Industries we serve". The `textTone` field flips the overlay copy between
 * white and near-black so it stays legible on both the cream and the saturated
 * backgrounds.
 */
const INDUSTRIES: Industry[] = [
  {
    name: "Finance",
    sector: "Banking · Fintech · Wealth",
    code: "ICB · 001",
    tone: "PMS 135 C — Golden",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1400&q=80&auto=format&fit=crop",
    background: "#fffaf0",
    blob1: "#ffdf94",
    blob2: "#fce7c4",
    textTone: "dark",
  },
  {
    name: "Healthcare",
    sector: "MedTech · Diagnostics · Care",
    code: "ICB · 002",
    tone: "PMS 4985 C — Violet",
    image:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1400&q=80&auto=format&fit=crop",
    background: "#fffaf0",
    blob1: "#d29a41",
    blob2: "#bb96af",
    textTone: "dark",
  },
  {
    name: "Commerce",
    sector: "Retail · D2C · Marketplaces",
    code: "ICB · 003",
    tone: "PMS 170 C — Afterglow",
    image:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80&auto=format&fit=crop",
    background: "#5f81ab",
    blob1: "#f88b8d",
    blob2: "#cfbbdd",
    textTone: "light",
  },
  {
    name: "Real Estate",
    sector: "PropTech · Architecture · Realty",
    code: "ICB · 004",
    tone: "PMS 660 C — Cobalt",
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1400&q=80&auto=format&fit=crop",
    background: "#5b9bc2",
    blob1: "#ffaa00",
    blob2: "#00e1ff",
    textTone: "light",
  },
  {
    name: "Education",
    sector: "EdTech · Learning · Research",
    code: "ICB · 005",
    tone: "PMS 7507 C — Meadow",
    image:
      "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1400&q=80&auto=format&fit=crop",
    background: "#7d936e",
    blob1: "#fdd895",
    blob2: "#a5b599",
    textTone: "light",
  },
];

const TOTAL = INDUSTRIES.length;

/** Distance (in world units) between successive image planes. (repo: 5) */
const PLANE_GAP = 5;
/** Plane geometry base size — exactly matches the source's PlaneGeometry(3,3). */
const PLANE_BASE = 3;
/** Repo's firstPlaneViewOffset — camera starts this far in front of plane 0. */
const FRONT_OFFSET = 5;
/** Repo's lastPlaneViewOffset — camera stops this far BEFORE the last plane. */
const BACK_OFFSET = 5;
/** Repo's PerspectiveCamera fov. */
const CAMERA_FOV = 45;
/** Initial world-space camera position before scroll clamps it. */
const CAMERA_INITIAL_Z = 6;

/** Mobile-first plane spread + scale — same numbers as the original. */
const MOBILE_BREAKPOINT = 768;
const DESKTOP_SCALE = 1;
const MOBILE_SCALE = 0.65;
const MOBILE_X_SPREAD = 0.25;

/** Each plane gets an alternating x offset so the scroll path zig-zags. */
const PLANE_X_OFFSETS = [-0.9, 0.8, -0.7, 1.0, -0.7, 0.85];

/* ────────────────────────────────────────────────────────────────────────── */
/*  GLSL                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const BG_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BG_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uBackgroundColor;
  uniform vec3 uBlob1Color;
  uniform vec3 uBlob2Color;
  uniform float uNoiseStrength;
  uniform float uBlobRadius;
  uniform float uBlobRadiusSecondary;
  uniform float uBlobStrength;
  uniform float uTime;
  uniform float uVelocityIntensity;

  float random(vec2 coord) {
    return fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec3 color = uBackgroundColor;

    float animTime = uTime * 0.00028;
    vec2 blob1Center = vec2(
      0.50 + sin(animTime * 1.000) * 0.13 + sin(animTime * 1.618) * 0.05,
      0.48 + cos(animTime * 0.794) * 0.09 + cos(animTime * 1.272) * 0.03
    );
    vec2 blob2Center = vec2(
      0.35 + cos(animTime * 0.927) * 0.11 + cos(animTime * 1.414) * 0.04,
      0.55 + sin(animTime * 1.175) * 0.07 + sin(animTime * 0.618) * 0.03
    );

    float blob1 = smoothstep(uBlobRadius, 0.0, distance(vUv, blob1Center));
    float blob2 = smoothstep(uBlobRadiusSecondary, 0.0, distance(vUv, blob2Center));

    vec3 blob1Soft = mix(uBlob1Color, uBackgroundColor, 0.35);
    vec3 blob2Soft = mix(uBlob2Color, uBackgroundColor, 0.35);
    color = mix(color, blob1Soft, blob1 * uBlobStrength);
    color = mix(color, blob2Soft, blob2 * uBlobStrength);

    color += uVelocityIntensity * 0.10;

    float grain = random(vUv * vec2(1387.13, 947.91)) - 0.5;
    color += grain * uNoiseStrength;
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Refs shared from React -> R3F                                              */
/* ────────────────────────────────────────────────────────────────────────── */

type ProgressRef = React.MutableRefObject<number>;
type VelocityRef = React.MutableRefObject<number>;
type PointerRef = React.MutableRefObject<{ x: number; y: number }>;

/* ────────────────────────────────────────────────────────────────────────── */
/*  Background — ortho scene with the GLSL blob shader                         */
/* ────────────────────────────────────────────────────────────────────────── */

function Background({
  progressRef,
  velocityRef,
}: {
  progressRef: ProgressRef;
  velocityRef: VelocityRef;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    const initial = INDUSTRIES[0];
    return new THREE.ShaderMaterial({
      vertexShader: BG_VERTEX,
      fragmentShader: BG_FRAGMENT,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uBackgroundColor: { value: new THREE.Color(initial.background) },
        uBlob1Color: { value: new THREE.Color(initial.blob1) },
        uBlob2Color: { value: new THREE.Color(initial.blob2) },
        uNoiseStrength: { value: 0.04 },
        uBlobRadius: { value: 0.65 },
        uBlobRadiusSecondary: { value: 0.65 * 0.78 },
        uBlobStrength: { value: 0.9 },
        uTime: { value: 0 },
        uVelocityIntensity: { value: 0 },
      },
    });
  }, []);

  // Smoothed mood values + velocity, kept in a ref so we never re-render.
  const mood = useRef({
    bgCur: new THREE.Color(),
    bgNxt: new THREE.Color(),
    b1Cur: new THREE.Color(),
    b1Nxt: new THREE.Color(),
    b2Cur: new THREE.Color(),
    b2Nxt: new THREE.Color(),
    smoothedDepth: 0,
    smoothedVelocity: 0,
  });

  useFrame((state) => {
    const progress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    const lastIdx = TOTAL - 1;
    const normalized = progress * lastIdx;
    const curIdx = Math.min(Math.floor(normalized), lastIdx);
    const nxtIdx = Math.min(curIdx + 1, lastIdx);
    const blend = THREE.MathUtils.clamp(normalized - curIdx, 0, 1);

    const cur = INDUSTRIES[curIdx];
    const nxt = INDUSTRIES[nxtIdx];

    const m = mood.current;
    m.bgCur.set(cur.background).lerp(m.bgNxt.set(nxt.background), blend);
    m.b1Cur.set(cur.blob1).lerp(m.b1Nxt.set(nxt.blob1), blend);
    m.b2Cur.set(cur.blob2).lerp(m.b2Nxt.set(nxt.blob2), blend);

    material.uniforms.uBackgroundColor.value.copy(m.bgCur);
    material.uniforms.uBlob1Color.value.copy(m.b1Cur);
    material.uniforms.uBlob2Color.value.copy(m.b2Cur);

    material.uniforms.uTime.value = state.clock.elapsedTime * 1000;

    // Velocity intensity, smoothed
    const targetVel = THREE.MathUtils.clamp(
      Math.abs(velocityRef.current),
      0,
      1,
    );
    m.smoothedVelocity = THREE.MathUtils.lerp(
      m.smoothedVelocity,
      targetVel,
      0.1,
    );
    material.uniforms.uVelocityIntensity.value = m.smoothedVelocity;

    // Depth progress → blob radius
    m.smoothedDepth = THREE.MathUtils.lerp(m.smoothedDepth, progress, 0.1);
    const radius = 0.65 + m.smoothedDepth * 0.08;
    material.uniforms.uBlobRadius.value = radius;
    material.uniforms.uBlobRadiusSecondary.value = radius * 0.78;
  });

  // The vertex shader writes directly to clip space, ignoring camera + model
  // matrices — so this single quad always fills the screen regardless of
  // perspective camera position. depthTest/Write are off + renderOrder=-1
  // forces it to draw first so subsequent (depth-tested) image planes layer
  // over it cleanly. frustumCulled=false stops three from culling the quad
  // when the camera moves it out of its (wrong) bounding sphere.
  return (
    <mesh
      ref={meshRef}
      material={material}
      renderOrder={-1}
      frustumCulled={false}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Plane — one industry image, animated by scroll + pointer                   */
/* ────────────────────────────────────────────────────────────────────────── */

function Plane({
  industry,
  index,
  texture,
  pointerRef,
  velocityRef,
}: {
  industry: Industry;
  index: number;
  texture: THREE.Texture;
  pointerRef: PointerRef;
  velocityRef: VelocityRef;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Aspect ratio for non-square images
  const aspect = useMemo(() => {
    const img = texture.image as
      | HTMLImageElement
      | ImageBitmap
      | { width: number; height: number }
      | undefined;
    if (img && "width" in img && "height" in img && img.width && img.height) {
      return img.width / img.height;
    }
    return 1.4;
  }, [texture]);

  const baseX = PLANE_X_OFFSETS[index % PLANE_X_OFFSETS.length];

  // Internal smoothing state, kept in a ref so no React re-renders.
  const ref = useRef({
    breath: 0,
    drift: 0,
    pointerX: 0,
    pointerY: 0,
  });

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    const mat = materialRef.current;
    if (!mesh || !mat) return;

    const isMobile =
      typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;
    const xSpread = isMobile ? MOBILE_X_SPREAD : 1;
    const baseScale = isMobile ? MOBILE_SCALE : DESKTOP_SCALE;

    const cameraZ = camera.position.z;
    const firstPlaneZ = 0;
    const sampledZ = cameraZ - PLANE_GAP; // sampleOffset = 1
    const lastIdx = TOTAL - 1;
    const normalized = THREE.MathUtils.clamp(
      (firstPlaneZ - sampledZ) / PLANE_GAP,
      0,
      lastIdx,
    );
    const curIdx = Math.floor(normalized);
    const nxtIdx = Math.min(curIdx + 1, lastIdx);
    const blend = normalized - curIdx;

    let targetOpacity = 0;
    if (index === curIdx) targetOpacity = 1 - blend;
    if (index === nxtIdx) targetOpacity = Math.max(targetOpacity, blend);

    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.14);

    // Smoothed pointer → parallax + tilt
    const s = ref.current;
    s.pointerX = THREE.MathUtils.lerp(
      s.pointerX,
      pointerRef.current.x,
      0.08,
    );
    s.pointerY = THREE.MathUtils.lerp(
      s.pointerY,
      pointerRef.current.y,
      0.08,
    );

    const depthInfluence = 1 + index * 0.05;
    const parallaxInfluence = mat.opacity * depthInfluence;
    const parallaxX = s.pointerX * 0.16 * parallaxInfluence;
    const parallaxY = s.pointerY * 0.08 * parallaxInfluence;

    // Velocity → "breath" pulse (subtle tilt + scale)
    const targetBreath = THREE.MathUtils.clamp(
      Math.abs(velocityRef.current) * 1.1,
      0,
      1,
    );
    s.breath = THREE.MathUtils.lerp(s.breath, targetBreath, 0.14);
    const breathInfluence = s.breath * mat.opacity;

    // Velocity sign → gentle vertical drift (gesture parallax)
    const targetDrift = THREE.MathUtils.clamp(velocityRef.current, -1, 1);
    s.drift = THREE.MathUtils.lerp(s.drift, targetDrift, 0.05);
    const gestureY = s.drift * 0.05;

    mesh.position.x = baseX * xSpread + parallaxX;
    mesh.position.y = parallaxY + gestureY;
    mesh.position.z = -index * PLANE_GAP;

    mesh.rotation.x = -s.pointerY * 0.045 * breathInfluence;
    mesh.rotation.y = s.pointerX * 0.045 * breathInfluence;
    mesh.rotation.z = 0;

    const pulse = 1 + 0.03 * breathInfluence;
    mesh.scale.x = baseScale * aspect * pulse;
    mesh.scale.y = baseScale * pulse;
    mesh.scale.z = 1;
  });

  // Ensure correct color space for the texture
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[PLANE_BASE, PLANE_BASE]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        side={THREE.DoubleSide}
        transparent
        depthWrite={false}
        opacity={index === 0 ? 1 : 0}
        color={industry.background}
      />
    </mesh>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Gallery — loads all textures up-front + spawns one Plane per industry      */
/* ────────────────────────────────────────────────────────────────────────── */

function Gallery({
  pointerRef,
  velocityRef,
}: {
  pointerRef: PointerRef;
  velocityRef: VelocityRef;
}) {
  const textures = useLoader(
    TextureLoader,
    INDUSTRIES.map((i) => i.image),
  );

  return (
    <>
      {INDUSTRIES.map((industry, i) => (
        <Plane
          key={industry.name}
          industry={industry}
          index={i}
          texture={textures[i]}
          pointerRef={pointerRef}
          velocityRef={velocityRef}
        />
      ))}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Camera controller — maps scroll progress (0..1) onto camera z              */
/* ────────────────────────────────────────────────────────────────────────── */

function CameraRail({
  progressRef,
}: {
  progressRef: ProgressRef;
}) {
  const { camera } = useThree();
  const smoothed = useRef(0);

  useFrame(() => {
    const target = THREE.MathUtils.clamp(progressRef.current, 0, 1);
    smoothed.current = THREE.MathUtils.lerp(smoothed.current, target, 0.08);

    // Camera Z range mirrors the source's Scroll.js bounds:
    //   maxCameraZ = firstPlaneZ + firstPlaneViewOffset    →   0 + 5
    //   minCameraZ = lastPlaneZ  + lastPlaneViewOffset     →  -(N-1)*gap + 5
    // i.e. the camera stops 5 units IN FRONT of the last plane (never passes
    // through it).
    const startZ = FRONT_OFFSET;
    const endZ = -(TOTAL - 1) * PLANE_GAP + BACK_OFFSET;
    camera.position.z = startZ + (endZ - startZ) * smoothed.current;
  });

  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Public component                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export default function IndustriesWeServe() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef(0);
  const velocityRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });

  const [activeIndex, setActiveIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Pointer parallax — scoped to the section so the rest of the page isn't
  // forced to re-render on mouse moves.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const onMove = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerRef.current.x = THREE.MathUtils.clamp(x, -1, 1);
      pointerRef.current.y = THREE.MathUtils.clamp(-y, -1, 1);
    };
    const onLeave = () => {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
    };
    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // ScrollTrigger pin — drives camera + active-index state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) {
      progressRef.current = 0;
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapRef.current,
        start: "top top",
        end: `+=${TOTAL * 100}%`,
        pin: sectionRef.current,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          // ScrollTrigger.getVelocity() is pixels/sec; normalise to a small
          // float for the breath/blob velocity uniforms.
          velocityRef.current = self.getVelocity() / 2500;

          const normalized = self.progress * (TOTAL - 1);
          const newActive = Math.min(
            TOTAL - 1,
            Math.round(normalized),
          );
          setActiveIndex((prev) => (prev !== newActive ? newActive : prev));
        },
      });
    }, wrapRef);

    return () => ctx.revert();
  }, []);

  const current = INDUSTRIES[activeIndex];

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div
        ref={sectionRef}
        className={styles.section}
        data-tone={current.textTone}
        style={{ backgroundColor: current.background }}
      >
        <div className={styles.canvas}>
          <Canvas
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
            camera={{
              position: [0, 0, CAMERA_INITIAL_Z],
              fov: CAMERA_FOV,
              near: 0.1,
              far: 100,
            }}
          >
            <Suspense fallback={null}>
              <Background
                progressRef={progressRef}
                velocityRef={velocityRef}
              />
              <CameraRail progressRef={progressRef} />
              <Gallery
                pointerRef={pointerRef}
                velocityRef={velocityRef}
              />
            </Suspense>
          </Canvas>
        </div>

        <div className={styles.overlay}>
          <header className={styles.topbar} aria-hidden="true">
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Industries we serve
            </span>
            <span className={styles.counter}>
              {String(activeIndex + 1).padStart(2, "0")}
              <span className={styles.counterDivider}>/</span>
              {String(TOTAL).padStart(2, "0")}
            </span>
          </header>

          <div className={styles.heading} aria-hidden="true">
            <span className={styles.headingTop}>What we</span>
            <span className={styles.headingBig}>
              <span className={styles.headingFill}>Power</span>
              <span className={styles.headingStroke}>Power</span>
            </span>
          </div>

          <div className={styles.label}>
            <span className={styles.labelCode}>{current.tone}</span>
            <h3 className={styles.labelName} key={current.name}>
              {current.name}
            </h3>
            <span className={styles.labelSector}>{current.sector}</span>
          </div>

          <ul className={styles.dots} aria-hidden="true">
            {INDUSTRIES.map((it, i) => (
              <li
                key={it.name}
                className={styles.dot}
                data-active={i === activeIndex ? "true" : "false"}
              />
            ))}
          </ul>

          {!reduced && (
            <p className={styles.scrollHint} aria-hidden="true">
              <span>Scroll</span>
              <span className={styles.scrollLine} />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
