import Link from "next/link";
import { animations } from "@/styles/animations";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20 hover:scale-[1.03] hover:shadow-blue-500/40",
  secondary:
    "border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-white",
  ghost: "text-slate-300 hover:text-white",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]";

export default function Button({
  children,
  variant = "primary",
  href,
  onClick,
  className = "",
  type = "button",
  loading = false,
  disabled = false,
}: Props) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition-all duration-300 ${animations.buttonPress} ${focusRing} disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`;

  const content = loading ? (
    <>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {children}
    </>
  ) : (
    children
  );

  if (href && !loading) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
    >
      {content}
    </button>
  );
}
