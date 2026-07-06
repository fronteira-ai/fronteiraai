import { Suspense } from "react";
import type { Metadata } from "next";
import { SITE_URL } from "@/constants/routes";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionSkeleton from "@/components/ui/SectionSkeleton";
import Hero from "@/components/home/Hero";
import DashboardStrip from "@/components/home/DashboardStrip";
import Offers from "@/components/home/Offers";
import EconomiaDoDia from "@/components/home/EconomiaDoDia";
import AIShowcase from "@/components/home/AIShowcase";
import LiveCameras from "@/components/home/LiveCameras";
import Benefits from "@/components/home/Benefits";
import HowItWorks from "@/components/home/HowItWorks";
import Brands from "@/components/home/Brands";
import ForLojistasSection from "@/components/home/ForLojistasSection";
import CTASection from "@/components/home/CTASection";
import { getBrands } from "@/services/brand.service";

// Release 1.9 — Program F — Wave 1 (Premium Home Experience), revised after
// the CTO's denser dashboard-style reference. ISR instead of the previous
// `force-dynamic` — nothing on this page needs per-request personalization
// (no cookies/session read here), and a 60s window is fresh enough for
// "tempo real" claims without hitting every strategic service on every
// single request. Every data-backed block is its own async Server Component
// wrapped in its own <Suspense> boundary (Next.js 16 "parallel streaming
// with sibling boundaries") — the static shell (Navbar, Hero's headline/
// search, Footer) paints immediately, and each section streams in
// independently as it resolves.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "ParaguAI — Compare preços e venda no Paraguai",
  description:
    "Pesquise produtos, compare preços entre lojas e descubra as melhores ofertas no Paraguai. Lojistas: cadastre sua loja e sincronize produtos automaticamente.",
  keywords: ["Paraguai", "Ciudad del Este", "comparador de preços", "eletrônicos", "importados", "lojista Paraguai", "marketplace Paraguai"],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "ParaguAI — Compare preços e venda no Paraguai",
    description:
      "A maior plataforma de comparação de preços do Paraguai. Para compradores e lojistas de Ciudad del Este.",
    url: SITE_URL,
    siteName: "ParaguAI",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ParaguAI — Compare preços e venda no Paraguai",
    description:
      "A maior plataforma de comparação de preços do Paraguai. Para compradores e lojistas de Ciudad del Este.",
  },
};

export default async function Home() {
  const brands = await getBrands();

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      {/* Hero — headline, search, "Perguntar à IA", globe, store carousel,
          real stats row (all self-fetched inside Hero.tsx). */}
      <Suspense fallback={<SectionSkeleton minHeight={760} />}>
        <Hero />
      </Suspense>

      {/* Dense dashboard strip: Ofertas Relâmpago | Market Pulse | Câmbio ao
          Vivo | Live Marketplace | Categorias Principais — each card
          streams independently (see DashboardStrip.tsx). */}
      <DashboardStrip />

      {/* Produtos Mais Buscados */}
      <Suspense fallback={<SectionSkeleton />}>
        <Offers />
      </Suspense>

      {/* Economia do Dia — a single spotlighted deal, distinct from the
          dashboard strip's rotating "Ofertas Relâmpago" card. */}
      <Suspense fallback={<SectionSkeleton minHeight={280} />}>
        <EconomiaDoDia />
      </Suspense>

      {/* Inteligência da IA — chat not implemented this Wave, per mandate */}
      <AIShowcase />

      {/* Câmeras ao vivo — architecture only, no integration yet */}
      <LiveCameras />

      <Benefits />
      <HowItWorks />
      <Brands brands={brands} />
      <ForLojistasSection />
      <CTASection />
      <Footer />
    </main>
  );
}
