import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { LogoMark } from "@/components/brand/Logo";

/** Glowing AI orb loader: shows on first load and while switching pages. */
export function PageLoader() {
  const pending = useRouterState({ select: (s) => s.status === "pending" });
  const [boot, setBoot] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBoot(false), 1100);
    return () => clearTimeout(t);
  }, []);
  const show = boot || pending;
  return (
    <div className={`fx-loader ${show ? "is-on" : ""}`} aria-hidden={!show} role="status">
      <div className="fx-ai-orb">
        <span /><span /><span />
        <div className="absolute inset-0 flex items-center justify-center"><LogoMark /></div>
      </div>
      <p className="mt-8 font-display text-sm tracking-[0.3em] text-muted-foreground">LOADING</p>
    </div>
  );
}

/** Scroll effects: progress bar + sections rise, fade and un-blur into view. */
export function ScrollFx() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("section, [data-reveal]"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.fx = "in";
            io.unobserve(e.target);
          }
        }),
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el, i) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
      // Data attributes (not class/style) so React hydration never sees changed props.
      el.dataset.fx = "reveal";
      io.observe(el);
      void i;
    });
    const bar = document.getElementById("fx-progress");
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${h > 0 ? window.scrollY / h : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [path]);
  return <div id="fx-progress" className="fx-progress" aria-hidden />;
}
