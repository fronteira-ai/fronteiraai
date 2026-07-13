import type { ComparisonIntelligenceBundle } from "@/src/domains/buyer-intelligence";
import { formatUSD } from "@/utils/currency";

type Props = {
  comparison: ComparisonIntelligenceBundle | null;
};

// Release 2.0 — Wave 1 (Quick Wins). Reads SavingsOpportunity, already
// computed by PriceIntelligenceService (market-insights) — no new
// calculation. Renders nothing when there's no canonical link yet (Shadow
// Mode) or fewer than 2 offers to compare (SavingsOpportunity is null).
export default function SavingsCallout({ comparison }: Props) {
  const savings = comparison?.savingsOpportunity;
  if (!savings || savings.maxSavingsUSD <= 0) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4">
      <p className="text-sm font-semibold text-emerald-300">
        Economize até {formatUSD(savings.maxSavingsUSD)} ({savings.maxSavingsPercent.toFixed(0)}%) escolhendo a loja certa
      </p>
    </div>
  );
}
