import { Suspense } from "react";
import Section from "@/components/ui/Section";
import FlashOffersCard from "./dashboard/FlashOffersCard";
import MarketPulseCard from "./dashboard/MarketPulseCard";
import CambioCard from "./dashboard/CambioCard";
import LiveMarketplaceCard from "./dashboard/LiveMarketplaceCard";
import CategoriesCard from "./dashboard/CategoriesCard";

function CardSkeleton() {
  return <div className="h-64 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/40" />;
}

// The dense 5-column dashboard strip from the CTO's reference mockup —
// purely a grid + per-card <Suspense> wrapper (no data fetching itself), so
// each card still streams in independently even though they're all inside
// one synchronous parent.
export default function DashboardStrip() {
  return (
    <Section id="dashboard" className="!py-10">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        <Suspense fallback={<CardSkeleton />}>
          <FlashOffersCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <MarketPulseCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <CambioCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <LiveMarketplaceCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <CategoriesCard />
        </Suspense>
      </div>
    </Section>
  );
}
