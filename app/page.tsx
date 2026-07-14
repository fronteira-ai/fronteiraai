import { Suspense } from "react";
import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import { SITE_URL } from "@/constants/routes";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SectionSkeleton from "@/components/ui/SectionSkeleton";
import Hero from "@/components/home/Hero";
import SearchBar from "@/components/home/SearchBar";
import HeroCTAs from "@/components/home/HeroCTAs";
import DashboardStrip from "@/components/home/DashboardStrip";
import Offers from "@/components/home/Offers";
import AchadoDoDia from "@/components/home/AchadoDoDia";
import AIShowcase from "@/components/home/AIShowcase";
import Benefits from "@/components/home/Benefits";
import HowItWorks from "@/components/home/HowItWorks";
import ForLojistasSection from "@/components/home/ForLojistasSection";
import CTASection from "@/components/home/CTASection";

// Release 1.9 — Program F — Wave 2 (v0 realignment, ADR-050 v1.1). Loaded
// here (not in the root layout) and applied only to this page's <main> below
// — the CSS variables these generate are scoped to that subtree via
// --font-home-display/--font-home-sans (app/globals.css), so the rest of the
// site keeps Geist untouched.
const sora = Sora({ subsets: ["latin"], variable: "--font-home-display", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-home-sans", display: "swap" });

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
  title: "ParaguAI — O jeito mais inteligente de comprar no Paraguai",
  description:
    "O ParaguAI analisa preço, confiança da loja e o momento certo de compra — e recomenda a melhor compra para você na fronteira Brasil-Paraguai. Lojistas: cadastre sua loja e sincronize produtos automaticamente.",
  keywords: ["Paraguai", "Ciudad del Este", "consultor de compras", "recomendação inteligente", "eletrônicos", "importados", "lojista Paraguai", "marketplace Paraguai"],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "ParaguAI — O jeito mais inteligente de comprar no Paraguai",
    description:
      "O consultor inteligente de compras da fronteira Brasil-Paraguai. Recomendações com evidência, para compradores e lojistas de Ciudad del Este.",
    url: SITE_URL,
    siteName: "ParaguAI",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ParaguAI — O jeito mais inteligente de comprar no Paraguai",
    description:
      "O consultor inteligente de compras da fronteira Brasil-Paraguai. Recomendações com evidência, para compradores e lojistas de Ciudad del Este.",
  },
};

export default async function Home() {
  return (
    <main className={`min-h-screen bg-[oklch(0.14_0.03_265)] text-white ${sora.variable} ${inter.variable}`}>
      <Navbar />

      {/* Hero — photographic backdrop + real stats (Release 1.9 — Program F —
          Wave 2, v0 realignment, ADR-050 v1.1). Search and the "Encontrar a
          melhor compra"/"Sou Lojista" CTAs are now separate sections below
          it, matching the approved v0 layout. */}
      <Suspense fallback={<SectionSkeleton minHeight={640} />}>
        <Hero />
      </Suspense>

      <div className="relative z-10 mx-auto max-w-[1600px] px-6 pt-10 lg:px-10">
        <SearchBar />
        <div className="mt-6">
          <HeroCTAs />
        </div>
      </div>

      {/* Program UX — Mission UX-1B (Objetivo 3/7). Moved up from below the
          dashboard/offers blocks — the proof of "toda busca já vem com a
          decisão pronta" belongs right after the promise the Hero makes, not
          several data-dense sections later.
          Program UX — Mission UX-1C (Objetivo 2). -mt-* below pulls each
          section closer to the one above it, cutting roughly a quarter of
          the empty space Section's own py-16/py-20 padding leaves on both
          sides of the seam — Section itself (components/ui/, shared Design
          System) is never touched. */}
      <div className="-mt-4 sm:-mt-6">
        <AIShowcase />
      </div>

      {/* Dense dashboard: 4-card info row (Economia do dia | Market Pulse |
          Câmbio ao Vivo | Live Marketplace) and a row (Lojas em destaque |
          Categorias) plus the trust-strip/lojista banner — each card streams
          independently (see DashboardStrip.tsx). */}
      <div className="-mt-8 sm:-mt-10">
        <DashboardStrip />
      </div>

      {/* Produtos Mais Buscados */}
      <div className="-mt-6 sm:-mt-8">
        <Suspense fallback={<SectionSkeleton />}>
          <Offers />
        </Suspense>
      </div>

      {/* Achado do Dia — a single spotlighted deal, distinct from the
          dashboard strip's "Economia do dia" card (Mission UX-1B, Objetivo
          8; renamed in Mission UX-1C, Objetivo 3). */}
      <div className="-mt-8 sm:-mt-10">
        <Suspense fallback={<SectionSkeleton minHeight={280} />}>
          <AchadoDoDia />
        </Suspense>
      </div>

      <Benefits />

      <div className="-mt-6 sm:-mt-8">
        <HowItWorks />
      </div>

      {/* Program UX — Mission UX-1C (Objetivo 1). Brands is intentionally
          not rendered here — it added scroll without buyer-relevant value.
          The component itself, and the brand fetch it needs, are untouched
          in components/home/Brands.tsx / services/brand.service.ts, ready
          for reuse elsewhere. */}
      <div className="-mt-8 sm:-mt-10">
        <ForLojistasSection />
      </div>

      <div className="-mt-8 sm:-mt-10">
        <CTASection />
      </div>

      <Footer />
    </main>
  );
}
