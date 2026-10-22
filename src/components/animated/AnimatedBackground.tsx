import { useEffect, useRef } from "react";

const DOTS_PER_AREA = 1 / 16000;
const MIN_DOTS = 26;
const MAX_DOTS = 120;
const LINK_DIST = 132;
const POINTER_DIST = 240;

type Dot = { x: number; y: number; vx: number; vy: number; r: number; phase: number };

/**
 * Fixed, full-viewport futuristic backdrop: drifting aurora blobs, rotating
 * light ribbons, a panning grid with sweeping beams and a constellation canvas
 * that reacts to the pointer. Purely decorative — never captures clicks.
 */
export function AnimatedBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const readToken = (name: string, fallback: string) =>
      getComputedStyle(root).getPropertyValue(name).trim() || fallback;

    let dotColor = readToken("--anim-dot", "rgba(99,102,241,0.6)");
    let lineColor = readToken("--anim-line", "rgba(124,58,237,0.28)");
    let glowColor = readToken("--anim-glow", "rgba(99,102,241,0.8)");

    let width = 0;
    let height = 0;
    let frame = 0;
    let dots: Dot[] = [];
    const pointer = { x: -1, y: -1, active: false };

    const seed = () => {
      const count = Math.max(MIN_DOTS, Math.min(MAX_DOTS, Math.round(width * height * DOTS_PER_AREA)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.26,
        vy: (Math.random() - 0.5) * 0.26,
        r: 0.6 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = root.clientWidth;
      height = root.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const paint = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -30) d.x = width + 30;
        else if (d.x > width + 30) d.x = -30;
        if (d.y < -30) d.y = height + 30;
        else if (d.y > height + 30) d.y = -30;
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = lineColor;
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        if (!a) continue;
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          if (!b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > LINK_DIST * LINK_DIST) continue;
          ctx.globalAlpha = (1 - Math.sqrt(distSq) / LINK_DIST) * 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      if (pointer.active) {
        ctx.strokeStyle = glowColor;
        for (const d of dots) {
          const dist = Math.hypot(d.x - pointer.x, d.y - pointer.y);
          if (dist > POINTER_DIST) continue;
          ctx.globalAlpha = Math.min(1, (1 - dist / POINTER_DIST) * 1.3);
          ctx.lineWidth = 1.6;
          ctx.shadowBlur = 10;
          ctx.shadowColor = glowColor;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = dotColor;
      for (const d of dots) {
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time / 900 + d.phase);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
    };

    const tick = (time: number) => {
      paint(time);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame) return;
      if (reduceMotion.matches) {
        paint(0);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      root.style.setProperty("--anim-mx", (event.clientX / Math.max(1, window.innerWidth) - 0.5).toFixed(3));
      root.style.setProperty("--anim-my", (event.clientY / Math.max(1, window.innerHeight) - 0.5).toFixed(3));
    };

    const onPointerLeave = () => {
      pointer.active = false;
      root.style.setProperty("--anim-mx", "0");
      root.style.setProperty("--anim-my", "0");
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onMotionChange = () => {
      stop();
      start();
    };

    const onThemeChange = () => {
      dotColor = readToken("--anim-dot", "rgba(99,102,241,0.6)");
      lineColor = readToken("--anim-line", "rgba(124,58,237,0.28)");
      glowColor = readToken("--anim-glow", "rgba(99,102,241,0.8)");
    };

    const themeObserver = new MutationObserver(onThemeChange);
    const resizeObserver = new ResizeObserver(resize);

    resize();
    start();
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    resizeObserver.observe(root);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", onMotionChange);

    return () => {
      stop();
      themeObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden className="anim-root">
      <div className="anim-aurora">
        <span className="anim-blob anim-blob-1" />
        <span className="anim-blob anim-blob-2" />
        <span className="anim-blob anim-blob-3" />
        <span className="anim-blob anim-blob-4" />
      </div>
      <div className="anim-ribbons">
        <span className="anim-ribbon anim-ribbon-1" />
        <span className="anim-ribbon anim-ribbon-2" />
      </div>
      <div className="anim-grid" />
      <div className="anim-horizon" />
      <canvas ref={canvasRef} className="anim-dots" />
      <div className="anim-beam anim-beam-h" />
      <div className="anim-beam anim-beam-v" />
      <div className="anim-noise" />
      <div className="anim-veil" />
      <div className="anim-vignette" />
    </div>
  );
}
