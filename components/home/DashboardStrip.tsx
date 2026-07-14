import { Suspense } from "react";
import FlashOffersCard from "./dashboard/FlashOffersCard";
import MarketPulseCard from "./dashboard/MarketPulseCard";
import CambioCard from "./dashboard/CambioCard";
import LiveMarketplaceCard from "./dashboard/LiveMarketplaceCard";
import CategoriesCard from "./dashboard/CategoriesCard";
import StoreCarousel from "./StoreCarousel";
import BottomCta from "./BottomCta";

// Program UX — Mission UX-1B (Objetivo 7). LiveCameras is intentionally not
// rendered: every slot it shows today is a placeholder ("Em breve" — see
// LiveCameras.tsx), which is exactly the kind of future-promise the Home
// Experience Polish audit flagged as vaporware in the first fold. The
// component itself is untouched and ready — pass a real `feeds` prop here
// to bring it back once at least one camera feed exists.

function CardSkeleton() {
  return <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/5" />;
}

// Release 1.9 — Program F — Wave 2 (v0 realignment, ADR-050 v1.1). Restructured
// to match the v0 export: a 4-card info row (Economia do dia, Market Pulse,
// Câmbio, Live Marketplace) followed by a row (Lojas em destaque, Categorias
// — see Mission UX-1B comment above re: Câmeras ao vivo) and the trust-strip/
// lojista banner. Every card still streams independently behind its own
// <Suspense> boundary.
export default function DashboardStrip() {
  return (
    <div id="dashboard" className="mx-auto max-w-[1600px] px-6 lg:px-10">
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Suspense fallback={<CardSkeleton />}>
          <MarketPulseCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <FlashOffersCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <CambioCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <LiveMarketplaceCard />
        </Suspense>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Suspense fallback={<CardSkeleton />}>
            <StoreCarousel />
          </Suspense>
        </div>
        <div className="lg:col-span-5">
          <Suspense fallback={<CardSkeleton />}>
            <CategoriesCard />
          </Suspense>
        </div>
      </div>

      <BottomCta />
    </div>
  );
}
