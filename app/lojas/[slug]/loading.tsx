export default function LoadingLoja() {
  return (
    <div className="min-h-screen bg-[#050816] pt-32 pb-24">
      <div className="mx-auto max-w-6xl px-6 animate-pulse">
        <div className="h-4 w-48 bg-slate-800 rounded-full mb-8" />
        <div className="aspect-[4/1] w-full bg-slate-900 rounded-3xl mb-6" />
        <div className="h-10 w-64 bg-slate-800 rounded-xl mb-2" />
        <div className="h-4 w-32 bg-slate-800 rounded-full mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-900 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="h-48 bg-slate-900 rounded-2xl" />
            <div className="h-24 bg-slate-900 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 h-80 bg-slate-900 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
