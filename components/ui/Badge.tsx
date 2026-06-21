type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Badge({ children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-blue-300 ${className}`}
    >
      {children}
    </span>
  );
}
