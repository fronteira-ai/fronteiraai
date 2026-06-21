"use client";

import { memo, useEffect, useRef, useState } from "react";
import { animations } from "@/styles/animations";

type Props = {
  value: number;
  suffix?: string;
  label: string;
  animate?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function StatCard({ value, suffix = "", label, animate = true }: Props) {
  const [reducedMotion] = useState(prefersReducedMotion);
  const [display, setDisplay] = useState(
    animate && !reducedMotion ? 0 : value
  );
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(reducedMotion);

  useEffect(() => {
    if (!animate || started.current) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || started.current) return;

        started.current = true;
        observer.disconnect();

        const duration = 1200;
        const startTime = performance.now();

        function step(now: number) {
          const progress = Math.min((now - startTime) / duration, 1);
          setDisplay(Math.round(progress * value));

          if (progress < 1) {
            requestAnimationFrame(step);
          }
        }

        requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [animate, value]);

  return (
    <div
      ref={ref}
      className={`rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur ${animations.cardHover}`}
    >
      <h3 className="text-5xl font-black text-blue-400">
        {display.toLocaleString("pt-BR")}
        {suffix}
      </h3>

      <p className="mt-3 text-lg text-slate-400">{label}</p>
    </div>
  );
}

export default memo(StatCard);
