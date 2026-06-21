"use client";

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { directionToAnimation, type AnimationDirection } from "@/styles/animations";

type Props = {
  children: ReactNode;
  direction?: AnimationDirection;
  delay?: number;
  className?: string;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Wrapper reutilizável de "revealOnScroll": aparece com uma das animações de
// fade quando entra na viewport. Cada instância observa apenas o próprio nó
// e se desconecta após o primeiro disparo, então não causa re-render de
// outros componentes nem fica observando indefinidamente. Quando o usuário
// prefere menos movimento, já nasce visível (sem esperar o IntersectionObserver).
function Reveal({ children, direction = "up", delay = 0, className = "" }: Props) {
  const [visible, setVisible] = useState(prefersReducedMotion);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      style={visible && delay ? { animationDelay: `${delay}ms` } : undefined}
      className={`${visible ? directionToAnimation[direction] : "opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

export default memo(Reveal);
