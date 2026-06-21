import { memo, ComponentType } from "react";
import { animations } from "@/styles/animations";

type Props = {
  icon: ComponentType<{ size?: number; className?: string }>;
  step: string;
  title: string;
  description: string;
};

function FeatureCard({ icon: Icon, step, title, description }: Props) {
  return (
    <div
      className={`group rounded-3xl border border-slate-800 bg-slate-900/60 p-8 ${animations.cardHover}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 transition-transform duration-300 group-hover:scale-110">
          <Icon size={26} />
        </div>

        <span className="text-sm font-semibold text-slate-600">{step}</span>
      </div>

      <h3 className="mt-6 text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-slate-400">{description}</p>
    </div>
  );
}

export default memo(FeatureCard);
