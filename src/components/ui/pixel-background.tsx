"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

class Pixel {
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  speed: number;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSizeInteger: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    speed: number,
    delay: number,
  ) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = context;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  draw() {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(
      this.x + centerOffset,
      this.y + centerOffset,
      this.size,
      this.size,
    );
  }

  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }
    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }
    this.draw();
  }

  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

function getEffectiveSpeed(value: number, reducedMotion: boolean) {
  const min = 0;
  const max = 100;
  const throttle = 0.001;
  if (value <= min || reducedMotion) {
    return min;
  } else if (value >= max) {
    return max * throttle;
  } else {
    return value * throttle;
  }
}

type PixelDirection =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface PixelBackgroundProps {
  gap?: number;
  speed?: number;
  colors?: string;
  opacity?: number;
  direction?: PixelDirection;
  className?: string;
  canvasClassName?: string;
  children?: React.ReactNode;
}

/**
 * Animated pixel canvas — pixels expand and shimmer outward from the chosen
 * origin direction, then idle into a subtle ambient flicker. Honors
 * prefers-reduced-motion by collapsing speed to 0.
 */
export default function PixelBackground({
  gap = 6,
  speed = 80,
  colors = "#fecdd3,#fda4af,#e11d48",
  opacity = 1,
  direction = "center",
  className = "",
  canvasClassName = "",
  children,
}: PixelBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const animationRef = useRef<number | null>(null);
  const timePreviousRef = useRef<number>(0);

  useEffect(() => {
    const reducedMotionValue =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const getOriginPoint = (width: number, height: number) => {
      switch (direction) {
        case "top":
          return { x: width / 2, y: 0 };
        case "bottom":
          return { x: width / 2, y: height };
        case "left":
          return { x: 0, y: height / 2 };
        case "right":
          return { x: width, y: height / 2 };
        case "top-left":
          return { x: 0, y: 0 };
        case "top-right":
          return { x: width, y: 0 };
        case "bottom-left":
          return { x: 0, y: height };
        case "bottom-right":
          return { x: width, y: height };
        case "center":
        default:
          return { x: width / 2, y: height / 2 };
      }
    };

    const initPixels = () => {
      if (!containerRef.current || !canvasRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width === 0 || height === 0) return;

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;

      const origin = getOriginPoint(width, height);
      const colorsArray = colors.split(",").map((c) => c.trim()).filter(Boolean);
      const step = Math.max(1, parseInt(gap.toString(), 10));
      const pxs: Pixel[] = [];

      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y += step) {
          const color =
            colorsArray[Math.floor(Math.random() * colorsArray.length)] ||
            "#ffffff";
          const dx = x - origin.x;
          const dy = y - origin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const delay = reducedMotionValue ? 0 : distance;

          pxs.push(
            new Pixel(
              canvasRef.current,
              ctx,
              x,
              y,
              color,
              getEffectiveSpeed(speed, reducedMotionValue),
              delay,
            ),
          );
        }
      }

      pixelsRef.current = pxs;
    };

    const doAnimate = (fnName: "appear") => {
      animationRef.current = requestAnimationFrame(() => doAnimate(fnName));

      const timeNow = performance.now();
      if (timePreviousRef.current === 0) timePreviousRef.current = timeNow;
      const timePassed = timeNow - timePreviousRef.current;
      const timeInterval = 1000 / 60;

      if (timePassed < timeInterval) return;
      timePreviousRef.current = timeNow - (timePassed % timeInterval);

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !canvasRef.current) return;

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      let allIdle = true;
      for (let i = 0; i < pixelsRef.current.length; i++) {
        const pixel = pixelsRef.current[i];
        pixel[fnName]();
        if (!pixel.isIdle) {
          allIdle = false;
        }
      }

      if (allIdle && animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    const handleAnimation = (name: "appear") => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      timePreviousRef.current = 0;
      animationRef.current = requestAnimationFrame(() => doAnimate(name));
    };

    const start = () => {
      initPixels();
      handleAnimation("appear");
    };

    start();

    // Re-init on resize so the grid keeps filling the parent.
    let resizeTimer: number | null = null;
    const onResize = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(start, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [gap, speed, colors, direction]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden", className)}
      style={{ opacity }}
    >
      <canvas
        ref={canvasRef}
        className={cn("absolute inset-0 block", canvasClassName)}
      />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
