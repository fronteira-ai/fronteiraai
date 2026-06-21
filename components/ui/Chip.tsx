import { animations } from "@/styles/animations";

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

const baseClasses =
  "rounded-full border border-slate-700 bg-slate-900/50 px-5 py-2 text-sm text-slate-300 transition-all duration-300 hover:border-blue-500 hover:bg-slate-800 hover:text-white";

export default function Chip({ children, onClick, className = "" }: Props) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${animations.buttonPress} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${className}`}
      >
        {children}
      </button>
    );
  }

  return <span className={`${baseClasses} ${className}`}>{children}</span>;
}
