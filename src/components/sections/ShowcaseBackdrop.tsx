"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

type Vec2Ref = MutableRefObject<{ x: number; y: number }>;

/* ------------- Floating particles (lightweight) ------------- */

function Particles({ mouseRef }: { mouseRef: Vec2Ref }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 600;

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const m = new THREE.PointsMaterial({
      color: "#7dd3fc",
      size: 0.026,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geometry: g, material: m };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.03;
    ref.current.rotation.x = mouseRef.current.y * 0.08;
    ref.current.position.x = mouseRef.current.x * 0.6;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}

/* ------------- Holographic grid plane ------------- */

function HoloGrid() {
  const ref = useRef<THREE.Mesh>(null);

  // Inline GLSL — a simple, fast neon grid that breathes with time.
  // No texture loads, no extra files.
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#22d3ee") },
        uOpacity: { value: 0.42 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vPos;
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;

        float lineMask(float v, float w) {
          float d = abs(fract(v) - 0.5) - (0.5 - w);
          return smoothstep(0.0, w * 0.7, -d);
        }

        void main() {
          // Slowly march the grid toward camera for that "endless plane" vibe
          vec2 uv = vec2(vPos.x, vPos.z + uTime * 0.5);
          float scale = 1.0;
          float lx = lineMask(uv.x * scale, 0.02);
          float ly = lineMask(uv.y * scale, 0.02);
          float grid = max(lx, ly);

          // Bigger highlight every 5 lines
          float lx2 = lineMask(uv.x * scale * 0.2, 0.04);
          float ly2 = lineMask(uv.y * scale * 0.2, 0.04);
          float highlight = max(lx2, ly2);

          // Radial fade out so the plane dissolves in the distance
          float dist = length(vPos.xz);
          float fade = smoothstep(14.0, 4.0, dist);

          vec3 col = uColor * grid + uColor * 1.6 * highlight;
          float alpha = (grid + highlight * 0.6) * fade * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
  }, []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2.6, -3]}
      material={material}
    >
      <planeGeometry args={[30, 30, 1, 1]} />
    </mesh>
  );
}

/**
 * Decorative WebGL backdrop for the showcase section — particles, grid,
 * subtle bloom. Intentionally cheap so the heavy lifting stays in the
 * hero scene.
 */
export default function ShowcaseBackdrop({
  mouseRef,
}: {
  mouseRef: Vec2Ref;
}) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.4, 6], fov: 50 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 4, 4]} intensity={6} color="#22d3ee" />
      <Particles mouseRef={mouseRef} />
      <HoloGrid />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
