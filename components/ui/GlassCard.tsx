import { animations } from "@/styles/animations";

type Props = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
};

export default function GlassCard({
  children,
  className = "",
  hover = true,
}: Props) {
  const hoverClasses = hover ? animations.cardHover : "";

  return (
    <div
      className={`rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl ${hoverClasses} ${className}`}
    >
      {children}
    </div>
  );
}
