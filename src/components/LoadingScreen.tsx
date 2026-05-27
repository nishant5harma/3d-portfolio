"use client";

import { useEffect, useState } from "react";

type Phase = "hello" | "terminal" | "done";

interface LoadingScreenProps {
  onFinish?: () => void;
}

// Official Apple "hello" SVG paths — extracted from macOS Sonoma boot screen.
const APPLE_HELLO_PATH_1 =
  "M8.69214 166.553C36.2393 151.239 61.3409 131.548 89.8191 98.0295C109.203 75.1488 119.625 49.0228 120.122 31.0026C120.37 17.6036 113.836 7.43883 101.759 7.43883C88.3598 7.43883 79.9231 17.6036 74.7122 40.9363C69.005 66.5793 64.7866 96.0036 54.1166 190.356";
const APPLE_HELLO_PATH_2 =
  "M55.1624 181.135C60.6251 133.114 81.4118 98.0479 107.963 98.0479C123.844 98.0479 133.937 110.703 131.071 128.817C129.457 139.487 127.587 150.405 125.408 163.06C122.869 178.941 130.128 191.348 152.122 191.348C184.197 191.348 219.189 173.523 237.097 145.915C243.198 136.509 245.68 128.073 245.928 119.884C246.176 104.996 237.739 93.8296 222.851 93.8296C203.992 93.8296 189.6 115.17 189.6 142.465C189.6 171.745 205.481 192.341 239.208 192.341C285.066 192.341 335.86 137.292 359.199 75.8585C365.788 58.513 368.26 42.4065 368.26 31.1512C368.26 17.8057 364.042 7.55823 352.131 7.55823C340.469 7.55823 332.777 16.6141 325.829 30.9129C317.688 47.4967 311.667 71.4162 309.203 98.4549C303 166.301 316.896 191.348 349.936 191.348C390 191.348 434.542 135.534 457.286 75.6686C463.803 58.513 466.275 42.4065 466.275 31.1512C466.275 17.8057 462.057 7.55823 450.146 7.55823C438.484 7.55823 430.792 16.6141 423.844 30.9129C415.703 47.4967 409.682 71.4162 407.218 98.4549C401.015 166.301 414.911 191.348 444.416 191.348C473.874 191.348 489.877 165.67 499.471 138.402C508.955 111.447 520.618 94.8221 544.935 94.8221C565.035 94.8221 580.916 109.71 580.916 137.75C580.916 168.768 560.792 192.093 535.362 192.341C512.984 192.589 498.285 174.475 499.774 147.179C501.511 116.907 519.873 94.8221 543.943 94.8221C557.839 94.8221 569.51 100.999 578.682 107.725C603.549 125.866 622.709 114.656 630.047 96.7186";

type TerminalAccent = "prompt" | "info" | "success" | "warn";

interface TerminalLine {
  prompt?: string;
  text: string;
  promptColor?: TerminalAccent;
  textClass?: string;
  startAt: number;
  charSpeed?: number;
}

const TERMINAL_LINES: TerminalLine[] = [
  { prompt: "$", text: "ssh icb@portfolio", promptColor: "prompt", startAt: 0 },
  { prompt: ">", text: "Authenticating user...", promptColor: "info", startAt: 700 },
  { prompt: "✓", text: "Identity verified", promptColor: "success", startAt: 1400 },
  { prompt: ">", text: "Loading portfolio modules", promptColor: "info", startAt: 1900 },
  { prompt: ">", text: "Initializing UI components...", promptColor: "info", startAt: 2600 },
  { prompt: "✓", text: "Boot complete", promptColor: "success", startAt: 3300 },
  { prompt: "$", text: "launching workspace", promptColor: "prompt", startAt: 3900 },
  {
    prompt: ">",
    text: "Welcome to ICB",
    promptColor: "success",
    textClass: "text-emerald-400",
    startAt: 4700,
  },
];

const TERMINAL_TOTAL_MS = 6200;

const promptClass: Record<TerminalAccent, string> = {
  prompt: "text-cyan-300",
  info: "text-sky-300/80",
  success: "text-emerald-400",
  warn: "text-amber-300",
};

function useTypewriter(text: string, startAt: number, charSpeed: number) {
  const [started, setStarted] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startAt);
    return () => clearTimeout(t);
  }, [startAt]);

  useEffect(() => {
    if (!started) return;
    if (typed.length >= text.length) return;
    const t = setTimeout(() => {
      setTyped(text.slice(0, typed.length + 1));
    }, charSpeed);
    return () => clearTimeout(t);
  }, [started, typed, text, charSpeed]);

  return { started, typed, done: typed.length >= text.length };
}

function TerminalRow({ line }: { line: TerminalLine }) {
  const charSpeed = line.charSpeed ?? 28;
  const { started, typed, done } = useTypewriter(line.text, line.startAt, charSpeed);

  if (!started) return null;

  return (
    <div className="flex items-start gap-3 whitespace-pre-wrap break-words">
      <span
        className={`${
          promptClass[line.promptColor ?? "info"]
        } shrink-0 select-none`}
      >
        {line.prompt}
      </span>
      <span className={`flex-1 ${line.textClass ?? "text-white/90"}`}>
        {typed}
        {!done && <span className="terminal-caret" />}
      </span>
    </div>
  );
}

export default function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [phase, setPhase] = useState<Phase>("hello");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const HELLO_DURATION = 5000;

    const toTerminal = setTimeout(() => setPhase("terminal"), HELLO_DURATION);
    const startFade = setTimeout(
      () => setFading(true),
      HELLO_DURATION + TERMINAL_TOTAL_MS,
    );
    const finish = setTimeout(
      () => {
        setPhase("done");
        onFinish?.();
      },
      HELLO_DURATION + TERMINAL_TOTAL_MS + 900,
    );

    return () => {
      clearTimeout(toTerminal);
      clearTimeout(startFade);
      clearTimeout(finish);
    };
  }, [onFinish]);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#05060a] ${
        fading ? "loader-fade" : ""
      }`}
      aria-label="Loading"
      role="status"
    >
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />
      <div className="noise-overlay" />

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6">
        {phase === "hello" && (
          <div className="apple-hello-wrap flex w-full items-center justify-center">
            <svg
              viewBox="0 0 638 200"
              fill="none"
              strokeWidth="14.8883"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="apple-hello-svg w-[85vw] max-w-3xl sm:w-[75vw] md:w-[65vw]"
              aria-label="hello"
              role="img"
            >
              <defs>
                <linearGradient
                  id="apple-hello-gradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor="#dbeafe" />
                  <stop offset="100%" stopColor="#7dd3fc" />
                </linearGradient>
              </defs>
              <path
                d={APPLE_HELLO_PATH_1}
                pathLength={1}
                stroke="url(#apple-hello-gradient)"
                className="apple-hello-path apple-hello-path-1"
              />
              <path
                d={APPLE_HELLO_PATH_2}
                pathLength={1}
                stroke="url(#apple-hello-gradient)"
                className="apple-hello-path apple-hello-path-2"
              />
            </svg>
          </div>
        )}

        {phase === "terminal" && (
          <div className="terminal-window w-full max-w-[640px] overflow-hidden rounded-2xl">
            <div className="terminal-titlebar flex items-center gap-2 px-4 py-3">
              <span className="traffic-light bg-[#ff5f57]" />
              <span className="traffic-light bg-[#febc2e]" />
              <span className="traffic-light bg-[#28c840]" />
              <span className="flex-1 text-center font-mono text-xs text-white/50">
                icb@portfolio: ~/login
              </span>
              <span className="w-12" />
            </div>

            <div className="terminal-body min-h-[320px] px-5 py-5 sm:min-h-[360px] sm:px-7 sm:py-6">
              {TERMINAL_LINES.map((line, i) => (
                <TerminalRow key={i} line={line} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
