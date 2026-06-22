import { memo, type ComponentType, type ReactNode } from "react";

type Props = {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
};

function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center">
      {Icon ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-400">
          <Icon size={28} />
        </div>
      ) : null}

      <h3 className="mt-6 text-xl font-bold text-white">{title}</h3>

      {description ? (
        <p className="mt-3 max-w-md text-slate-400">{description}</p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export default memo(EmptyState);
