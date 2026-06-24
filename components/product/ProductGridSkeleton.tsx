type Props = {
  count?: number;
};

export default function ProductGridSkeleton({ count = 12 }: Props) {
  return (
    <div className="grid animate-pulse gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
          <div className="aspect-square w-full bg-slate-900" />
          <div className="space-y-3 p-6">
            <div className="h-4 w-3/4 rounded bg-slate-800" />
            <div className="h-4 w-1/2 rounded bg-slate-800" />
            <div className="h-6 w-2/3 rounded bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
