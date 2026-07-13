import type { ComparisonIntelligenceBundle } from "@/src/domains/buyer-intelligence";
import { FreshnessClass } from "@/src/domains/realtime-commerce";

type Props = {
  comparison: ComparisonIntelligenceBundle | null;
};

const FRESHNESS_LABEL: Partial<Record<FreshnessClass, string>> = {
  [FreshnessClass.Live]: "Atualizado agora",
  [FreshnessClass.Fresh]: "Atualizado recentemente",
};

// Release 2.0 — Wave 1 (Quick Wins). Every badge here reads a value already
// computed elsewhere — PriceStatistics (market-insights), the recommended
// offer's isVerifiedStore (trust, via ComparisonIntelligenceComposer's
// batched verification lookup), and FreshnessScore (realtime-commerce). No
// new score/threshold is introduced — "Preço Justo" only fires when the
// price is meaningfully (>=10%) below the cross-store median, mirroring the
// same 0.9x condition SearchIntelligenceComposer uses for consistency.
export default function IntelligenceBadges({ comparison }: Props) {
  if (!comparison) return null;

  const recommended = comparison.offers.find((o) => o.rank === 1) ?? null;
  const stats = comparison.priceStatistics;
  const isGoodPrice = !!stats && recommended && recommended.offer.priceUSD < stats.medianPriceUSD * 0.9;
  const freshnessLabel = recommended?.freshness ? FRESHNESS_LABEL[recommended.freshness.classification] : null;

  const badges: string[] = [];
  if (isGoodPrice) badges.push("Preço abaixo da média");
  if (recommended?.isVerifiedStore) badges.push("Loja verificada");
  if (freshnessLabel) badges.push(freshnessLabel);

  if (badges.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {badges.map((label) => (
        <span
          key={label}
          className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
