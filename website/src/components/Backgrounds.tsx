import { useEffect, useRef } from "react";

/**
 * Flickering square grid (in the spirit of Magic UI's FlickeringGrid): a canvas of small cells
 * that fade in and out, with a few cells lit in marker yellow. Pauses when off screen.
 */
export function FlickeringGrid({
  className = "",
  cell = 4,
  gap = 6,
  rate = 0.25,
  maxOpacity = 0.28,
}: {
  className?: string;
  cell?: number;
  gap?: number;
  rate?: number;
  maxOpacity?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cols = 0;
    let rows = 0;
    let alpha = new Float32Array(0);
    let warm = new Uint8Array(0);
    let frame = 0;
    let last = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / (cell + gap));
      rows = Math.ceil(height / (cell + gap));
      alpha = new Float32Array(cols * rows).map(() => Math.random() * maxOpacity);
      warm = new Uint8Array(cols * rows).map(() => (Math.random() < 0.012 ? 1 : 0));
      draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < alpha.length; i++) {
        const x = (i % cols) * (cell + gap);
        const y = Math.floor(i / cols) * (cell + gap);
        ctx.fillStyle = warm[i]
          ? `rgba(255, 229, 138, ${Math.min(1, alpha[i] * 2.6)})`
          : `rgba(255, 255, 255, ${alpha[i]})`;
        ctx.fillRect(x, y, cell, cell);
      }
    };
    const tick = (t: number) => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      for (let i = 0; i < alpha.length; i++) {
        if (Math.random() < rate * dt) alpha[i] = Math.random() * maxOpacity;
      }
      draw();
    };

    const observer = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    observer.observe(canvas);
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);
    resize();
    if (!reduced) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizer.disconnect();
    };
  }, [cell, gap, rate, maxOpacity]);
  return (
    <canvas
      ref={ref}
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
      aria-hidden
    />
  );
}

/** Soft conic spotlight from above, in the spirit of Aceternity's lamp / spotlight effects. */
export function Spotlight({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 h-[720px] ${className}`}
      aria-hidden
    >
      <div className="absolute left-1/2 top-[-120px] h-[620px] w-[1100px] -translate-x-1/2 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_150deg,rgb(255_229_138/0.16)_175deg,rgb(255_255_255/0.10)_180deg,rgb(255_229_138/0.16)_185deg,transparent_210deg)] blur-2xl" />
      <div className="absolute left-1/2 top-[-260px] h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-marker/10 blur-[140px]" />
    </div>
  );
}

/** Beams that travel along the dashed page rails, like Aceternity's tracing beams. */
export function RailBeam({ side, delay = 0 }: { side: "left" | "right"; delay?: number }) {
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 ${side === "left" ? "left-0" : "right-0"} w-px overflow-hidden`}
      aria-hidden
    >
      <div
        className="absolute h-40 w-px bg-gradient-to-b from-transparent via-marker to-transparent opacity-70"
        style={{ animation: `rail 9s linear ${delay}s infinite` }}
      />
    </div>
  );
}
