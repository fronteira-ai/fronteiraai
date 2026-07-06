import { AlertType, ChangeType, MarketChangeEntityType } from "../enums";
import type { CreateBuyerAlertCandidateInput, MarketChange } from "../types";

/** Epic 8 — Buyer Alert Engine foundation. Pure classifier: decides whether
 * a market_change is alert-worthy and, if so, its type/priority/payload.
 * Deliberately narrow — only the four concrete triggers named in the Wave
 * brief ("queda de preço, produto voltou ao estoque, nova promoção, novo
 * produto"). AlertType.RelevantChange exists in the taxonomy but is never
 * produced this Wave: no buyer-follow/watchlist mechanism exists yet to
 * decide what counts as "relevant" to a specific buyer (see TECH_DEBT.md).
 * NEVER sends anything — this only decides what WOULD be worth alerting. */
export class BuyerAlertEngine {
  classify(change: MarketChange): CreateBuyerAlertCandidateInput | null {
    const day = change.detectedAt.slice(0, 10);

    switch (change.changeType) {
      case ChangeType.PriceDecreased: {
        const pct = percentChange(change);
        return {
          alertType: AlertType.PriceDrop,
          productId: change.productId,
          offerId: change.entityType === MarketChangeEntityType.Offer ? change.entityId : null,
          storeId: change.storeId,
          marketChangeId: change.id,
          priority: Math.round(Math.min(100, Math.abs(pct) * 100)),
          payload: { previousValue: change.previousValue, currentValue: change.currentValue, percentChange: pct },
          rateLimitKey: `${AlertType.PriceDrop}:${change.productId ?? change.entityId}:${day}`,
        };
      }

      case ChangeType.PromotionDetected: {
        const pct = percentChange(change);
        return {
          alertType: AlertType.NewPromotion,
          productId: change.productId,
          offerId: change.entityType === MarketChangeEntityType.Offer ? change.entityId : null,
          storeId: change.storeId,
          marketChangeId: change.id,
          priority: 80,
          payload: { previousValue: change.previousValue, currentValue: change.currentValue, percentChange: pct },
          rateLimitKey: `${AlertType.NewPromotion}:${change.productId ?? change.entityId}:${day}`,
        };
      }

      case ChangeType.StockReturned:
        return {
          alertType: AlertType.StockReturned,
          productId: change.productId,
          offerId: change.entityType === MarketChangeEntityType.Offer ? change.entityId : null,
          storeId: change.storeId,
          marketChangeId: change.id,
          priority: 50,
          payload: {},
          rateLimitKey: `${AlertType.StockReturned}:${change.productId ?? change.entityId}:${day}`,
        };

      case ChangeType.ProductCreated:
        return {
          alertType: AlertType.NewProduct,
          productId: change.productId,
          offerId: null,
          storeId: change.storeId,
          marketChangeId: change.id,
          priority: 30,
          payload: {},
          rateLimitKey: `${AlertType.NewProduct}:${change.productId ?? change.entityId}:${day}`,
        };

      default:
        return null;
    }
  }
}

function percentChange(change: MarketChange): number {
  const before = change.previousValue !== null ? Number(change.previousValue) : null;
  const after = change.currentValue !== null ? Number(change.currentValue) : null;
  if (before === null || after === null || before === 0 || Number.isNaN(before) || Number.isNaN(after)) return 0;
  return (after - before) / before;
}
