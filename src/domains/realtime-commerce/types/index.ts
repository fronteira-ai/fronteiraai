import type {
  ChangeType,
  MarketChangeEntityType,
  VolatilityClass,
  FreshnessClass,
  AlertType,
  AlertCandidateStatus,
} from "../enums";

// ── Epic 2 — Change Detection ────────────────────────────────────────────────

/** One row of market_changes — append-only, never updated in place. */
export interface MarketChange {
  id: string;
  changeType: ChangeType;
  entityType: MarketChangeEntityType;
  entityId: string;
  productId: string | null;
  storeId: string | null;
  field: string;
  previousValue: string | null;
  currentValue: string | null;
  confidence: number;
  source: string;
  detectedAt: string;
}

export interface CreateMarketChangeInput {
  changeType: ChangeType;
  entityType: MarketChangeEntityType;
  entityId: string;
  productId: string | null;
  storeId: string | null;
  field: string;
  previousValue: string | null;
  currentValue: string | null;
  confidence: number;
  source: string;
}

/** Before/after snapshot fed to the pure ChangeDetector — a subset of
 * NormalizedOffer/ExistingOfferLookup fields, kept independent of the
 * connectors domain (Epic 1: this domain is never imported by, and never
 * imports, connectors' internal types — the connectors pipeline maps its own
 * types into this shape at the integration boundary). */
export interface OfferSnapshot {
  priceUSD: number;
  inStock: boolean;
  stockQuantity: number | null;
  description: string | null;
  imageUrl: string | null;
  categorySlug: string | null;
  brandSlug: string | null;
}

export interface DetectChangesInput {
  entityId: string;
  productId: string | null;
  storeId: string | null;
  before: OfferSnapshot | null;
  after: OfferSnapshot;
  isNewOffer: boolean;
  isNewProduct: boolean;
  source: string;
}

// ── Epic 3 — Price Volatility ────────────────────────────────────────────────

export interface VolatilityFactors {
  /** number of price changes / number of days in the window */
  frequency: number;
  /** average absolute percent change per price change */
  amplitude: number;
  /** trend of change frequency: recent half vs. prior half of the window */
  velocity: number;
  /** net drift as a fraction of the first known price in the window */
  persistence: number;
}

export interface VolatilityScore {
  productId: string;
  score: number;
  classification: VolatilityClass;
  factors: VolatilityFactors;
  sampleSize: number;
  windowDays: number;
  computedAt: string;
}

// ── Epic 4 — Freshness ───────────────────────────────────────────────────────

export interface FreshnessScore {
  offerId: string;
  score: number;
  classification: FreshnessClass;
  ageSeconds: number;
  lastChangeAt: string | null;
}

// ── Epic 5 — Store Update Intelligence ───────────────────────────────────────

export interface StoreUpdateProfile {
  storeId: string;
  storeName: string;
  updateScore: number;
  avgUpdateIntervalMinutes: number | null;
  avgSyncTimeMs: number | null;
  priceReactionSpeedHours: number | null;
  catalogStability: number;
  avgFreshnessScore: number;
  marketResponsiveness: number;
  rank: number;
  sampleSize: number;
}

// ── Epic 6 — Market Pulse ────────────────────────────────────────────────────

export interface CategoryMovement {
  categoryId: string;
  categoryName: string;
  changeCount: number;
  avgPercentChange: number;
}

export interface StoreMovement {
  storeId: string;
  storeName: string;
  changeCount: number;
}

export interface TopMover {
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

export interface MarketPulseSnapshot {
  snapshotDate: string;
  pricesChangedCount: number;
  pricesDroppedCount: number;
  pricesRaisedCount: number;
  productsAddedCount: number;
  productsRemovedCount: number;
  topCategories: CategoryMovement[];
  topStores: StoreMovement[];
  cheapestCategory: CategoryMovement | null;
  mostExpensiveMoveCategory: CategoryMovement | null;
  generatedAt: string;
}

// ── Epic 7 — Live Activity Feed ──────────────────────────────────────────────

export interface LiveActivityEntry {
  storeId: string;
  storeName: string;
  changeType: ChangeType;
  summary: string;
  count: number;
  occurredAt: string;
  sampleProductName: string | null;
}

// ── Epic 8 — Buyer Alert Engine foundation ───────────────────────────────────

export interface BuyerAlertCandidate {
  id: string;
  alertType: AlertType;
  productId: string | null;
  offerId: string | null;
  storeId: string | null;
  marketChangeId: string | null;
  priority: number;
  payload: Record<string, unknown>;
  rateLimitKey: string;
  status: AlertCandidateStatus;
  createdAt: string;
}

export interface CreateBuyerAlertCandidateInput {
  alertType: AlertType;
  productId: string | null;
  offerId: string | null;
  storeId: string | null;
  marketChangeId: string | null;
  priority: number;
  payload: Record<string, unknown>;
  rateLimitKey: string;
}
