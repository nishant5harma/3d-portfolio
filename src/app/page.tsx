"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoadingScreen from "@/components/LoadingScreen";
import HeroSection from "@/components/HeroSection";
import SmoothScroll from "@/components/SmoothScroll";
import LazySection from "@/components/LazySection";

/**
 * All non-hero sections are code-split + lazy-loaded.
 *
 * Why: each section ships Three.js / GSAP timelines / canvas work that
 * the user doesn't need until they scroll. By default Next bundled
 * them all into the initial chunk → ~1.5MB JS at first paint. Dynamic
 * imports + a `LazySection` IO wrapper drops the initial chunk to just
 * the hero, then warms each section just before it enters view.
 *
 * `ssr: false` is intentional — they all rely on window/scroll APIs,
 * and skipping SSR for them removes hydration mismatches and shrinks
 * the server HTML.
 */

const OurClients = dynamic(() => import("@/components/OurClients"), {
  ssr: false,
  loading: () => null,
});
const IndustriesWeServe = dynamic(
  () => import("@/components/IndustriesWeServe"),
  { ssr: false, loading: () => null },
);
const TechWeUse = dynamic(() => import("@/components/TechWeUse"), {
  ssr: false,
  loading: () => null,
});
const HowWeWork = dynamic(() => import("@/components/HowWeWork"), {
  ssr: false,
  loading: () => null,
});
const OurServices = dynamic(() => import("@/components/OurServices"), {
  ssr: false,
  loading: () => null,
});
const AiInYourWebsite = dynamic(
  () => import("@/components/AiInYourWebsite"),
  { ssr: false, loading: () => null },
);

export default function Home() {
  // Skip the loader on return visits within the same session — most users
  // expect a snappy second pageview, not a 6-second boot.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("icb_loaded") === "1") {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      document.body.style.overflow = "";
      try {
        sessionStorage.setItem("icb_loaded", "1");
      } catch {
        /* private mode etc — ignore */
      }
    } else {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [loaded]);

  // Register service worker for cached repeat-visits (production only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const swUrl = `${basePath}/sw.js`;
    const scope = `${basePath}/`;

    navigator.serviceWorker
      .register(swUrl, { scope })
      .catch((err) => console.warn("SW registration failed", err));
  }, []);

  return (
    <>
      {!loaded && <LoadingScreen onFinish={() => setLoaded(true)} />}

      <SmoothScroll>
        <main
          className={`relative flex w-full flex-1 flex-col bg-black text-white transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <HeroSection />

          <LazySection id="clients">
            <OurClients />
          </LazySection>

          <LazySection id="industries">
            <IndustriesWeServe />
          </LazySection>

          <LazySection id="tech">
            <TechWeUse />
          </LazySection>

          <LazySection id="process">
            <HowWeWork />
          </LazySection>

          <LazySection id="services">
            <OurServices />
          </LazySection>

          <LazySection id="ai">
            <AiInYourWebsite />
          </LazySection>
        </main>
      </SmoothScroll>
    </>
  );
}
