"use client";

import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import HeroSection from "@/components/HeroSection";
import SmoothScroll from "@/components/SmoothScroll";
import OurClients from "@/components/OurClients";
import IndustriesWeServe from "@/components/IndustriesWeServe";
import TechWeUse from "@/components/TechWeUse";
import HowWeWork from "@/components/HowWeWork";
import OurServices from "@/components/OurServices";
import AiInYourWebsite from "@/components/AiInYourWebsite";

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) {
      document.body.style.overflow = "";
    } else {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [loaded]);

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
          <div id="clients">
            <OurClients />
          </div>
          <div id="industries">
            <IndustriesWeServe />
          </div>
          <div id="tech">
            <TechWeUse />
          </div>
          <div id="process">
            <HowWeWork />
          </div>
          <div id="services">
            <OurServices />
          </div>
          <div id="ai">
            <AiInYourWebsite />
          </div>
        </main>
      </SmoothScroll>
    </>
  );
}
