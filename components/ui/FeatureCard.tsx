import { memo, ComponentType } from "react";
import { animations } from "@/styles/animations";

type Props = {
  icon: ComponentType<{ size?: number; className?: string }>;
  step: string;
  title: string;
  description: string;
};

function FeatureCard({
  icon: Icon,
  title,
  description,
}: Props) {
  return (
    <div
      className={`group flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-center ${animations.cardHover}`}
    >
      {/* Ícone */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-transform duration-300 group-hover:scale-110">
        <Icon size={30} />
      </div>

      {/* Título */}
      <h3 className="mt-5 text-2xl font-bold text-white">
        {title}
      </h3>

      {/* Descrição */}
      <p className="mt-3 max-w-xs leading-7 text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default memo(FeatureCard);