import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl animate-pulse px-6 pt-32 pb-24">

        <div className="h-4 w-48 rounded bg-slate-800" />

        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div className="aspect-square w-full rounded-3xl bg-slate-900" />

          <div className="space-y-4">
            <div className="h-6 w-24 rounded-full bg-slate-800" />
            <div className="h-10 w-3/4 rounded bg-slate-800" />
            <div className="h-4 w-full rounded bg-slate-800" />
            <div className="h-4 w-2/3 rounded bg-slate-800" />
          </div>
        </div>

        <div className="mt-12 h-48 rounded-3xl bg-slate-900" />

      </div>

      <Footer />
    </main>
  );
}
