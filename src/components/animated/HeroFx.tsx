const faces = ["front", "back", "right", "left", "top", "bottom"] as const;

function Cube({ className = "", size = 96 }: { className?: string; size?: number }) {
  return (
    <div className={`fx-scene ${className}`} style={{ ["--s" as string]: `${size}px` }} aria-hidden>
      <div className="fx-cube">
        {faces.map((f) => (
          <div key={f} className={`fx-face fx-${f}`}>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} style={{ animationDelay: `${(i * 0.37) % 3}s` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroFx() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="fx-orb" />
      <div className="fx-ring fx-ring-1" />
      <div className="fx-ring fx-ring-2" />
      <Cube className="absolute left-[6%] top-[18%] hidden md:block" size={90} />
      <Cube className="absolute right-[7%] bottom-[16%] hidden md:block fx-slow" size={64} />
    </div>
  );
}
