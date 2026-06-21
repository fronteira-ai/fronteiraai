type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function GradientCard({ children, className = "" }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/60 via-slate-900/80 to-slate-950 p-10 sm:p-16 ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-[100px]" />
      <div className="relative">{children}</div>
    </div>
  );
}
