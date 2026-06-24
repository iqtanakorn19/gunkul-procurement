import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { IconBolt } from "@tabler/icons-react";

/* ============================================================
   Shared presentational kit used by HomePage and KnowledgePage
   so both pages share the same visual baseline (tokens, reveal
   animation, hover-tilt cards, section headers).
   ============================================================ */

// Soft, theme-adaptive tint for an icon badge from a semantic color.
export const tint = (c: string) => `color-mix(in srgb, ${c} 14%, transparent)`;

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Reveal-on-scroll wrapper. Fades + slides its content up the first time it
// enters the viewport. Honors prefers-reduced-motion (renders instantly).
export function Reveal({
  children,
  delay = 0,
  y = 24,
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function IconBadge({
  icon: Icon,
  color = "var(--primary)",
  size = 44,
}: {
  icon: typeof IconBolt;
  color?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "var(--radius)",
        background: tint(color),
        color,
        flexShrink: 0,
      }}
    >
      <Icon size={size * 0.5} stroke={1.75} />
    </span>
  );
}

export function Section({
  eyebrow,
  title,
  intro,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: "var(--sp-8)" }}>
      <Reveal>
        <div
          style={{
            marginBottom: "var(--sp-5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "var(--sp-4)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--fs-xs)",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: "var(--sp-2)",
              }}
            >
              {eyebrow}
            </div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {intro && (
              <p
                style={{
                  margin: "var(--sp-3) 0 0",
                  maxWidth: "70ch",
                  color: "var(--text-muted)",
                  fontSize: "var(--fs-body)",
                  lineHeight: "var(--lh-base)",
                }}
              >
                {intro}
              </p>
            )}
          </div>
          {right}
        </div>
      </Reveal>
      <Reveal delay={120}>{children}</Reveal>
    </section>
  );
}

// Card with pointer-tracking 3D tilt + a glare highlight that follows the
// cursor. Falls back to a plain lift when interactive is false or motion is
// reduced.
export function HoverCard({
  children,
  style,
  interactive = true,
  onClick,
}: {
  children: ReactNode;
  style?: CSSProperties;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 0 });
  const reduce = prefersReducedMotion();
  const tiltOn = interactive && !reduce;

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!tiltOn) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({
      ry: (px - 0.5) * 7,
      rx: (0.5 - py) * 7,
      gx: px * 100,
      gy: py * 100,
    });
  };

  const reset = () => {
    setHover(false);
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={onClick}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderColor: hover ? "var(--border-strong)" : "var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--sp-5)",
        boxShadow: hover ? "var(--shadow-lg)" : "var(--shadow-sm)",
        cursor: onClick ? "pointer" : undefined,
        transform: tiltOn
          ? `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(${hover ? -4 : 0}px)`
          : hover
            ? "translateY(-2px)"
            : "translateY(0)",
        transformStyle: "preserve-3d",
        transition:
          "transform 0.18s ease-out, box-shadow var(--transition), border-color var(--transition)",
        overflow: "hidden",
        ...style,
      }}
    >
      {tiltOn && hover && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            background: `radial-gradient(220px circle at ${tilt.gx}% ${tilt.gy}%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%)`,
            transition: "opacity var(--transition)",
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

export const grid = (min: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: "var(--sp-4)",
});

// Vertical timeline whose connecting rail fills as you scroll through it, and
// whose step badges light up once the fill line passes them.
export function WorkflowTimeline({
  steps,
}: {
  steps: { icon: typeof IconBolt; title: string; detail: string }[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const anchor = window.innerHeight * 0.55;
      const p = (anchor - r.top) / r.height;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column" }}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const reached = progress >= (i + 0.5) / steps.length;
        return (
          <div key={step.title} style={{ display: "flex", gap: "var(--sp-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-full)",
                  background: reached ? "var(--primary)" : "var(--surface-2)",
                  color: reached ? "var(--primary-contrast)" : "var(--text-faint)",
                  border: reached
                    ? "2px solid var(--primary)"
                    : "2px solid var(--border-strong)",
                  fontWeight: 800,
                  fontFamily: "var(--font-sans)",
                  flexShrink: 0,
                  zIndex: 1,
                  boxShadow: reached
                    ? "0 0 0 6px color-mix(in srgb, var(--primary) 18%, transparent)"
                    : "none",
                  transform: reached ? "scale(1.06)" : "scale(1)",
                  transition: "all 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {i + 1}
              </span>
              {!last && (
                <span
                  style={{
                    flex: 1,
                    width: 3,
                    minHeight: 24,
                    background: "var(--border-strong)",
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      transformOrigin: "top",
                      transform: `scaleY(${reached ? 1 : 0})`,
                      background: "linear-gradient(var(--primary), var(--accent))",
                      transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />
                </span>
              )}
            </div>
            <div
              style={{
                paddingBottom: last ? 0 : "var(--sp-5)",
                flex: 1,
                opacity: reached ? 1 : 0.5,
                transform: reached ? "translateX(0)" : "translateX(6px)",
                transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <step.icon
                  size={20}
                  stroke={1.75}
                  style={{ color: reached ? "var(--accent)" : "var(--text-muted)" }}
                />
                <h3 style={{ margin: 0, fontSize: "var(--fs-h3)", color: "var(--text-strong)" }}>
                  {step.title}
                </h3>
              </div>
              <p style={{ margin: "var(--sp-2) 0 0", color: "var(--text-muted)", fontSize: "var(--fs-sm)", lineHeight: 1.65 }}>
                {step.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
