// Sistema de animações reutilizável (Sprint 3.2 — Motion & Premium UX).
// As classes "animate-[...]" referenciam @keyframes definidos em
// app/globals.css. Mantidas aqui como strings Tailwind, no mesmo padrão
// utility-first usado no restante do projeto (sem CSS Modules/styled-components).

export const animations = {
  transition: "transition-all duration-300",

  fadeUp: "animate-[fadeUp_0.7s_ease-out_both]",
  fadeDown: "animate-[fadeDown_0.7s_ease-out_both]",
  fadeLeft: "animate-[fadeLeft_0.7s_ease-out_both]",
  fadeRight: "animate-[fadeRight_0.7s_ease-out_both]",
  fadeIn: "animate-[fadeIn_0.7s_ease-out_both]",

  float: "animate-[float_6s_ease-in-out_infinite]",
  pulseSoft: "animate-[pulseSoft_2.4s_ease-in-out_infinite]",
  glow: "animate-[glow_4s_ease-in-out_infinite]",
  shimmer: "animate-[shimmer_2.5s_linear_infinite]",
  gradientShift: "animate-[gradientShift_6s_ease_infinite]",

  cardHover:
    "transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/10",
  buttonPress: "transition-transform duration-150 active:scale-95",
} as const;

export type AnimationDirection = "up" | "down" | "left" | "right" | "none";

export const directionToAnimation: Record<AnimationDirection, string> = {
  up: animations.fadeUp,
  down: animations.fadeDown,
  left: animations.fadeLeft,
  right: animations.fadeRight,
  none: animations.fadeIn,
};
