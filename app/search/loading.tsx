import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SearchResultsSkeleton from "@/components/search/SearchResultsSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl animate-pulse px-6 pt-32">
        <div className="h-12 w-80 rounded bg-slate-800" />
        <div className="mt-4 h-4 w-96 rounded bg-slate-800" />
        <div className="mt-12 h-20 w-full rounded-full bg-slate-900" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        <SearchResultsSkeleton />
      </div>

      <Footer />
    </main>
  );
}
