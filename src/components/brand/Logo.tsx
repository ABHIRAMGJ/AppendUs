import { Link } from "@tanstack/react-router";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`logo-anim ${className}`} aria-hidden>
      <defs>
        <linearGradient id="lg-cos" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-glow)" />
        </linearGradient>
      </defs>
      <path className="logo-hex" d="M16 2 28 9v14l-12 7-12-7V9z" fill="url(#lg-cos)" stroke="var(--primary)" strokeWidth="1" pathLength={100} />
      <path className="logo-c" pathLength={100} d="M20.5 12.2a6 6 0 1 0 0 7.6" stroke="var(--primary-foreground)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle className="logo-dot" cx="21" cy="16" r="1.8" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <LogoMark />
      <span>
        Career<span className="text-gradient">OS</span>
      </span>
    </Link>
  );
}
