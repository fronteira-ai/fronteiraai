import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl animate-pulse px-6 pt-32">
        <div className="h-4 w-32 rounded bg-slate-800" />
        <div className="mt-6 h-12 w-96 rounded bg-slate-800" />
        <div className="mt-4 h-4 w-full max-w-2xl rounded bg-slate-800" />
        <div className="mt-10 h-48 w-full rounded-3xl bg-slate-900" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10">
        <ProductGridSkeleton />
      </div>

      <Footer />
    </main>
  );
}
