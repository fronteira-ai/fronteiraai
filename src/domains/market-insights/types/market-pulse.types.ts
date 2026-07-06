import type { ChangeType } from "@/src/domains/realtime-commerce";

// Release 1.8 — Program C — Market Intelligence Engine, Wave 1. Objective 3
// (Market Pulse) — a canonical-product-aware rollup of realtime-commerce's
// `MarketPulseService.getTopMovers()`, which already answers this question
// at the raw-product level. Two stores can sell the *same* canonical
// product under two different raw `products` rows — this type is what lets
// "biggest drop today" be reported once per real-world product, not once
// per store's copy of it.
export interface CanonicalMarketMover {
  canonicalProductId: string;
  productId: string;
  productName: string;
  storeId: string | null;
  storeName: string | null;
  previousValue: string | null;
  currentValue: string | null;
  percentChange: number;
  changeType: ChangeType;
  detectedAt: string;
}
