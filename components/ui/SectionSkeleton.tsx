// Generic Suspense fallback for Home blocks — reserves roughly the same
// height as the real section to minimize layout shift when the streamed
// content swaps in (Next.js 16 streaming guidance: "design skeleton
// fallbacks that match the dimensions of the content they represent").
type Props = {
  minHeight?: number;
};

export default function SectionSkeleton({ minHeight = 320 }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16" style={{ minHeight }}>
      <div className="mx-auto mb-10 h-6 w-48 animate-pulse rounded-full bg-slate-800" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/40" />
        ))}
      </div>
    </div>
  );
}
