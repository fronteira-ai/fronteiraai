"use client";

import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";

type Props = {
  offerId: string;
  productId: string;
  storeId: string;
  productUrl: string;
  /** 1-based position in the offer list as rendered on screen. */
  position: number;
  source: "product_page" | "store_page";
  className?: string;
  children: React.ReactNode;
};

// Sprint 2 — Instrumentação de conversão. The outbound "Ver oferta" click is
// the moment a buyer leaves ParaguAI for a merchant, and it was the only
// high-value buyer action still completely untracked — `StoreContactLinks`
// already covered phone/WhatsApp/website, but the primary offer click fired
// nothing.
//
// Same shape as StoreContactLinks: a small "use client" island wrapping the
// anchor, so ProductOffers/StoreOffers stay Server Components. Uses the
// AnalyticsEventType that already existed in the taxonomy (`OfferClicked`) —
// no new event name, no new analytics platform, no new dependency.
//
// Deliberately NOT sent: price, currency, product name, store name, or
// anything else identifying the buyer. `offer_id`/`position`/`source` travel
// in `metadata` because AnalyticsEventPayload has no dedicated fields for
// them, matching how every other caller passes non-canonical attributes.
export default function OfferLink({
  offerId,
  productId,
  storeId,
  productUrl,
  position,
  source,
  className,
  children,
}: Props) {
  const { track } = useAnalytics();

  return (
    <a
      href={productUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        track(AnalyticsEventType.OfferClicked, {
          product_id: productId,
          store_id: storeId,
          metadata: { offer_id: offerId, position, source },
        })
      }
      className={className}
    >
      {children}
    </a>
  );
}
