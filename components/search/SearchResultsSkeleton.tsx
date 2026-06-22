export default function SearchResultsSkeleton() {
  return (
    <div className="flex flex-col gap-10 animate-pulse">
      <div className="h-4 w-40 rounded bg-slate-800" />

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <div className="h-6 w-32 rounded bg-slate-800" />

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-3xl border border-slate-800">
              <div className="aspect-square w-full bg-slate-900" />
              <div className="space-y-3 p-6">
                <div className="h-4 w-3/4 rounded bg-slate-800" />
                <div className="h-4 w-1/2 rounded bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
