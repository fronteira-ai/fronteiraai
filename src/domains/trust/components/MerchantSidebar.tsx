import type { MerchantPassport } from "../types/trust.types";
import { MerchantHighlights } from "./MerchantHighlights";
import { MerchantMetrics } from "./MerchantMetrics";
import { MerchantIdentityCard } from "./MerchantIdentityCard";
import { TrustPanel } from "./TrustPanel";

interface Props {
  passport: MerchantPassport;
  showTrustPanel?: boolean;
}

export function MerchantSidebar({ passport, showTrustPanel = true }: Props) {
  const { basic, channels, insights, reviewStats, activeSignals, trustSummary } = passport;

  const profileForPanel = {
    merchantId: passport.merchantId,
    companyName: basic.companyName,
    trustSummary,
    activeSignals,
    recentTimeline: passport.timeline,
    recentReviews: passport.reviews,
    activeBadges: passport.badges,
  };

  return (
    <div className="space-y-6">
      <MerchantHighlights
        insights={insights}
        activeSignals={activeSignals}
        activeBadge={trustSummary.activeBadge}
      />

      {showTrustPanel && <TrustPanel profile={profileForPanel} />}

      <MerchantMetrics insights={insights} reviewStats={reviewStats} />

      <MerchantIdentityCard basic={basic} channels={channels} />
    </div>
  );
}
